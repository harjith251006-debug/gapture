import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EmbeddingService } from "../embeddings/embedding-service";
import type { PineconeClient } from "../pinecone/pinecone-client";
import type { PineconeMatch } from "../pinecone/types";
import { LlmError } from "./types";

/**
 * Contextual Q&A (PRD FR-23, HLSA §12) — Gapture's regulatory change & gap
 * analysis reasoning applied to a conversational question about ONE
 * regulatory document, grounded in:
 *   - that document's own indexed chunks (Pinecone `regulatory` namespace,
 *     filtered to this document_id — a question about document A can never
 *     surface document B's text), and
 *   - the caller's organization's policy chunks (Pinecone `policy` namespace,
 *     filtered to this organization_id).
 *
 * Guardrails (skills/ai-architecture.md, applied verbatim):
 *   - the model must reason across BOTH streams (regulation + company
 *     policy) before answering, and must not default to "not enough
 *     context" — it checks for semantically equivalent terminology and a
 *     partial/directional answer before giving up
 *   - the ONLY hard, code-enforced short-circuit is a genuinely empty
 *     retrieval (zero vectors in either namespace) — that is a real
 *     "nothing indexed yet" signal, not a scoring judgement call, so it
 *     skips the model entirely rather than risk it fabricating from general
 *     knowledge of Indian financial regulation
 *   - short/ambiguous questions ("what to update next", "what changed") are
 *     interpreted against the retrieved comparison context, and the
 *     retrieval query itself is broadened for such questions so a vague
 *     prompt still surfaces the document's substantive obligations
 */

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * Cosine-similarity floor for a retrieved chunk to count as "context".
 * Deliberately near-zero: the anti-laziness rule ("do not default to
 * insufficient context") means retrieval should hand the model everything
 * even loosely related and let IT judge relevance semantically, rather than
 * a fixed embedding-similarity cutoff pre-filtering borderline (but
 * genuinely useful) matches before the model ever sees them.
 */
const DEFAULT_MIN_SCORE = 0;
/** Per-section character budget so the prompt stays bounded (HLSA §12 perf). */
const REG_CONTEXT_BUDGET = 8_000;
const POLICY_CONTEXT_BUDGET = 4_000;
/**
 * Appended to the embedding input (never shown to the user or stored) for
 * short/generic questions, so retrieval doesn't rely on a vague question's
 * own wording alone — it broadens toward the document's substantive
 * obligations, matching the retrieval-failure-handling rule.
 */
const GENERIC_QUERY_EXPANSION =
  "regulatory change new requirement amended requirement compliance impact policy update process update control update documentation update gap remediation required action implementation priority effective date";

const QA_JSON_SCHEMA = {
  name: "contextual_answer",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: {
        type: "string",
        description:
          "The answer, reasoning across both the REGULATION and POLICY excerpts using ONLY facts present in them, formatted as Markdown. For a short factual question, a direct plain-prose answer is enough. For a compliance-change question, lead with a one-sentence direct answer, then use '## ' headings for whichever of these apply: Regulatory Requirement, Existing Company Compliance, Gap, Required Update, Priority — with '-' bullets for multi-item lists and '**bold**' for policy/regulation titles — citing [R#]/[P#] for each claim. If the excerpts genuinely don't address the question after checking for semantically equivalent terminology, say so plainly in prose and state what is missing.",
      },
      answered: {
        type: "boolean",
        description:
          "true whenever a partial or directional answer is possible from the excerpts, even if incomplete. false only if, after checking for semantically equivalent terminology (not just exact keyword matches), the excerpts genuinely do not address the question.",
      },
    },
    required: ["answer", "answered"],
  },
} as const;

const qaSchema = z.object({
  answer: z.string().trim().min(1).max(12000),
  answered: z.boolean(),
});

export interface ContextualQaResult {
  answer: string;
  answered: boolean;
  model: string;
  regulatoryChunksUsed: number;
  policyChunksUsed: number;
  topRegulatoryScore: number | null;
}

export interface ContextualQaOptions {
  apiKey: string;
  model?: string;
  regulatoryNamespace: string;
  policyNamespace: string;
  /** Matches fetched per namespace. */
  topK?: number;
  /** Cosine-similarity floor; below this a chunk is treated as noise. Default 0 (no floor) — see DEFAULT_MIN_SCORE. */
  minScore?: number;
  timeoutMs?: number;
  maxCompletionTokens?: number;
}

interface ScoredChunk {
  content: string;
  score: number;
}
interface ScoredPolicyChunk extends ScoredChunk {
  title: string;
}

interface ChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string };
}

export class ContextualQaService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly embeddings: EmbeddingService,
    private readonly pinecone: PineconeClient,
    private readonly options: ContextualQaOptions,
  ) {}

  get model(): string {
    return this.options.model ?? "gpt-5-mini";
  }

  async answer(input: {
    documentId: string;
    organizationId: string;
    documentTitle: string;
    question: string;
  }): Promise<ContextualQaResult> {
    const topK = this.options.topK ?? 8;
    const minScore = this.options.minScore ?? DEFAULT_MIN_SCORE;

    const retrievalQuery = buildRetrievalQuery(input.question);
    const [questionVector] = await this.embeddings.embedTexts([retrievalQuery]);
    if (!questionVector) throw new LlmError("could not embed the question", undefined, true);

    const [regMatches, polMatches] = await Promise.all([
      this.pinecone.query({
        vector: questionVector,
        topK,
        namespace: this.options.regulatoryNamespace,
        includeMetadata: true,
        filter: { document_id: input.documentId },
      }),
      this.pinecone.query({
        vector: questionVector,
        topK,
        namespace: this.options.policyNamespace,
        includeMetadata: true,
        filter: { organization_id: input.organizationId },
      }),
    ]);

    const topRegulatoryScore = regMatches[0]?.score ?? null;

    // The ONLY hard short-circuit: nothing indexed at all for this document
    // or org. A low score is not grounds to give up — that judgement is the
    // model's to make, per the anti-laziness rule.
    if (regMatches.length === 0 && polMatches.length === 0) {
      return {
        answer:
          "This document (or your organization's policies) hasn't finished processing yet, so I don't have any indexed context to answer from. Please try again shortly.",
        answered: false,
        model: this.model,
        regulatoryChunksUsed: 0,
        policyChunksUsed: 0,
        topRegulatoryScore,
      };
    }

    const regChunks = capByBudget(
      await this.resolveDocumentChunks(regMatches.filter((m) => m.score >= minScore)),
      REG_CONTEXT_BUDGET,
    );
    const polChunks = capByBudget(
      await this.resolvePolicyChunks(polMatches.filter((m) => m.score >= minScore)),
      POLICY_CONTEXT_BUDGET,
    );

    const result = await this.callModel(input.documentTitle, input.question, regChunks, polChunks);
    return {
      ...result,
      model: this.model,
      regulatoryChunksUsed: regChunks.length,
      policyChunksUsed: polChunks.length,
      topRegulatoryScore,
    };
  }

  private async resolveDocumentChunks(matches: PineconeMatch[]): Promise<ScoredChunk[]> {
    if (matches.length === 0) return [];
    const { data, error } = await this.supabase
      .from("document_chunks")
      .select("pinecone_vector_id, content")
      .in(
        "pinecone_vector_id",
        matches.map((m) => m.id),
      );
    if (error) throw new Error(`resolve document_chunks failed: ${error.message}`);
    const byId = new Map((data ?? []).map((r) => [r.pinecone_vector_id as string, r.content as string]));
    return matches
      .map((m) => {
        const content = byId.get(m.id);
        return content ? { content, score: m.score } : null;
      })
      .filter((c): c is ScoredChunk => c !== null)
      .sort((a, b) => b.score - a.score);
  }

  private async resolvePolicyChunks(matches: PineconeMatch[]): Promise<ScoredPolicyChunk[]> {
    if (matches.length === 0) return [];
    const { data, error } = await this.supabase
      .from("policy_chunks")
      .select("pinecone_vector_id, content, compliance_policies(title)")
      .in(
        "pinecone_vector_id",
        matches.map((m) => m.id),
      );
    if (error) throw new Error(`resolve policy_chunks failed: ${error.message}`);
    const byId = new Map<string, { title: string; content: string }>();
    for (const r of data ?? []) {
      const cp = (r as { compliance_policies: { title: string } | { title: string }[] | null }).compliance_policies;
      const title = (Array.isArray(cp) ? cp[0]?.title : cp?.title) ?? "Policy";
      byId.set(r.pinecone_vector_id as string, { title, content: r.content as string });
    }
    return matches
      .map((m) => {
        const row = byId.get(m.id);
        return row ? { ...row, score: m.score } : null;
      })
      .filter((c): c is ScoredPolicyChunk => c !== null)
      .sort((a, b) => b.score - a.score);
  }

  private async callModel(
    documentTitle: string,
    question: string,
    regChunks: ScoredChunk[],
    polChunks: ScoredPolicyChunk[],
  ): Promise<{ answer: string; answered: boolean }> {
    const context = [
      `REGULATORY DOCUMENT: ${documentTitle}`,
      "",
      "REGULATION EXCERPTS (from this document, most relevant first)",
      regChunks.length
        ? regChunks.map((c, i) => `[R${i + 1}] ${c.content}`).join("\n\n")
        : "(none retrieved for this question)",
      "",
      "ORGANIZATION POLICY EXCERPTS (this org's own compliance policies)",
      polChunks.length
        ? polChunks.map((c, i) => `[P${i + 1}] (from "${c.title}") ${c.content}`).join("\n\n")
        : "(none retrieved for this question)",
    ].join("\n");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${context}\n\nQUESTION: ${question}` },
    ];

    const controller = new AbortController();
    // The richer multi-section reasoning + gpt-5's reasoning tokens (both
    // counted against maxCompletionTokens) can genuinely take longer than a
    // plain single-paragraph answer — empirically, the equivalent analysis
    // prompt needed more than 60s at times. Match that budget here.
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 120_000);
    let response: Response;
    try {
      response = await fetch(OPENAI_CHAT_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_completion_tokens: this.options.maxCompletionTokens ?? 5000,
          response_format: { type: "json_schema", json_schema: QA_JSON_SCHEMA },
        }),
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new LlmError(aborted ? "Q&A request timed out" : "Q&A request failed", err, true);
    } finally {
      clearTimeout(timer);
    }

    const bodyText = await response.text();
    let parsed: ChatResponse;
    try {
      parsed = JSON.parse(bodyText) as ChatResponse;
    } catch {
      throw new LlmError(`Q&A returned non-JSON (HTTP ${response.status})`, undefined, response.status >= 500);
    }
    if (!response.ok || parsed.error) {
      throw new LlmError(
        `Q&A error (HTTP ${response.status}): ${parsed.error?.message ?? bodyText.slice(0, 200)}`,
        undefined,
        response.status === 429 || response.status >= 500,
      );
    }

    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) throw new LlmError("Q&A returned no content", undefined, true);

    const validated = qaSchema.safeParse(JSON.parse(content));
    if (!validated.success) {
      throw new LlmError(`Q&A JSON failed validation: ${validated.error.message}`, undefined, true);
    }
    return { answer: validated.data.answer.trim(), answered: validated.data.answered };
  }
}

const SYSTEM_PROMPT = `You are Gapture's contextual compliance assistant: a regulatory change & gap analysis engine, not a document summarizer. You answer a compliance officer's question about ONE regulatory document with respect to their organization's own retrieved policy excerpts.

INTERPRET SHORT OR AMBIGUOUS QUESTIONS SEMANTICALLY against the retrieved excerpts. For example:
- "what to update next" / "what should we change" -> given the regulation excerpts and the organization's policy excerpts, which specific policy/process/control should be updated next, and why
- "what changed" / "what changed from company side" -> the delta between what the organization's policy currently says (POLICY EXCERPTS) and what this regulation now requires (REGULATION EXCERPTS)
- "are we compliant" / "what is the gap" -> compare the two streams and state the compliance delta plainly
- "what should compliance team do" / "what is the impact" -> the concrete next action and its urgency

REASONING MODEL — for a compliance-change question, work through: Regulatory Requirement (from REGULATION EXCERPTS) -> Existing Company Policy (from POLICY EXCERPTS) -> Gap -> Required Update -> Priority. Cite which excerpt ([R#]/[P#]) supports each claim. Not every question needs every section — a narrow factual question can get a direct, short answer.

DO NOT DEFAULT TO "NOT ENOUGH CONTEXT". Before saying the excerpts are insufficient: check both REGULATION and POLICY excerpts for semantically equivalent terminology, not just exact keyword matches (e.g. customer identification ~ customer verification, sanctions screening ~ sanctions checking, record keeping ~ record retention, enhanced due diligence ~ EDD). See whether a partial or directional answer is possible before giving up. Only set answered=false if, after that check, the excerpts genuinely don't address the question.

GROUNDING (never violate):
- Use ONLY facts in the excerpts. Never use general knowledge of Indian financial regulation to fill a gap. Never invent a clause, date, threshold, or policy provision not present in the excerpts.
- "Exists" is not "implemented" — POLICY EXCERPTS describe what a policy document says, never assume operational reality.
- If REGULATION excerpts are present but no relevant POLICY excerpts are (or vice versa), say so explicitly and name what needs checking — never just "insufficient context."

Keep the answer scoped to this document — no general-purpose chat. Cite excerpts as [R1], [P2], etc.

FORMATTING: write "answer" as Markdown. A short factual question can just be plain prose. A compliance-change question should lead with a one-sentence direct answer, then "## " headings for whichever reasoning sections apply, "-" bullets for multi-item lists, and "**bold**" around policy/regulation titles. Do not wrap the response in a code block. Output only JSON per the schema.`;

/** Broaden the retrieval query for short/generic questions so a vague prompt still surfaces the document's substantive obligations. */
function buildRetrievalQuery(question: string): string {
  const wordCount = question.trim().split(/\s+/).filter(Boolean).length;
  return wordCount <= 8 ? `${question}\n\n${GENERIC_QUERY_EXPANSION}` : question;
}

/** Keep chunks (already score-sorted) until the character budget is spent. */
function capByBudget<T extends { content: string }>(chunks: T[], budget: number): T[] {
  const out: T[] = [];
  let used = 0;
  for (const chunk of chunks) {
    if (used + chunk.content.length > budget && out.length > 0) break;
    out.push(chunk);
    used += chunk.content.length;
  }
  return out;
}
