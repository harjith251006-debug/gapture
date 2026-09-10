import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EmbeddingService } from "../embeddings/embedding-service";
import type { PineconeClient } from "../pinecone/pinecone-client";
import type { PineconeMatch } from "../pinecone/types";
import { LlmError } from "./types";

/**
 * Contextual Q&A (PRD FR-23, HLSA §12). Answers a question about ONE
 * regulatory document, grounded in:
 *   - that document's own indexed chunks (Pinecone `regulatory` namespace,
 *     filtered to this document_id — a question about document A can never
 *     surface document B's text), and
 *   - the caller's organization's policy chunks (Pinecone `policy` namespace,
 *     filtered to this organization_id).
 *
 * Guardrails (skills/ai-architecture.md, applied verbatim):
 *   - retrieval is per-question and score-floored; chunks below `minScore`
 *     are dropped as noise
 *   - if nothing survives the floor, respond "cannot answer" WITHOUT calling
 *     the model — never its unsourced general knowledge of Indian regulation
 *   - the model is told, in the schema, to set answered=false when the
 *     context is thin, and to ignore off-topic policy excerpts
 */

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/** Cosine-similarity floor for a retrieved chunk to count as "context". */
const DEFAULT_MIN_SCORE = 0.15;
/** Per-section character budget so the prompt stays bounded (HLSA §12 perf). */
const REG_CONTEXT_BUDGET = 8_000;
const POLICY_CONTEXT_BUDGET = 4_000;

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
          "The answer, using ONLY facts present in the CONTEXT. Cite the regulation excerpts you used ([R1], [R2], ...). If the context is insufficient, say so plainly here.",
      },
      answered: {
        type: "boolean",
        description:
          "true only if the CONTEXT genuinely contained enough on-topic information to answer. false if the excerpts are thin or unrelated to the question.",
      },
    },
    required: ["answer", "answered"],
  },
} as const;

const qaSchema = z.object({
  answer: z.string().trim().min(1).max(8000),
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
  /** Matches fetched per namespace before the score floor. */
  topK?: number;
  /** Cosine-similarity floor; below this a chunk is treated as noise. */
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
    const topK = this.options.topK ?? 6;
    const minScore = this.options.minScore ?? DEFAULT_MIN_SCORE;

    const [questionVector] = await this.embeddings.embedTexts([input.question]);
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

    const regChunks = capByBudget(
      await this.resolveDocumentChunks(regMatches.filter((m) => m.score >= minScore)),
      REG_CONTEXT_BUDGET,
    );
    const polChunks = capByBudget(
      await this.resolvePolicyChunks(polMatches.filter((m) => m.score >= minScore)),
      POLICY_CONTEXT_BUDGET,
    );

    const topRegulatoryScore = regMatches[0]?.score ?? null;

    // Nothing usable retrieved — do not call the model at all.
    if (regChunks.length === 0 && polChunks.length === 0) {
      const anyMatchesAtAll = regMatches.length > 0 || polMatches.length > 0;
      return {
        answer: anyMatchesAtAll
          ? "I couldn't find anything in this document or your organization's policies that's relevant enough to that question to answer it reliably. Try rephrasing, or asking something more specific to this document."
          : "This document (or your organization's policies) hasn't finished processing yet, so I don't have context to answer from. Please try again shortly.",
        answered: false,
        model: this.model,
        regulatoryChunksUsed: 0,
        policyChunksUsed: 0,
        topRegulatoryScore,
      };
    }

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
        : "(none relevant to this question)",
      "",
      "ORGANIZATION POLICY EXCERPTS (may be unrelated — ignore if so)",
      polChunks.length
        ? polChunks.map((c, i) => `[P${i + 1}] (from "${c.title}") ${c.content}`).join("\n\n")
        : "(none relevant to this question)",
    ].join("\n");

    const messages = [
      {
        role: "system",
        content:
          "You answer a compliance officer's question about ONE regulatory document. Rules: " +
          "(1) Use ONLY the facts in the CONTEXT block — never general knowledge of Indian financial regulation to fill gaps. " +
          "(2) The REGULATION EXCERPTS are the authoritative source for what the document says; POLICY EXCERPTS describe the organization's own policies and may be off-topic — use them only if genuinely relevant, otherwise ignore them. " +
          "(3) If the excerpts don't contain enough to answer, set answered=false and say so plainly — do not guess. " +
          "(4) Keep the answer scoped to this document. Cite excerpts as [R1], [P2], etc. " +
          "(5) Output only JSON per the schema.",
      },
      { role: "user", content: `${context}\n\nQUESTION: ${question}` },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 45_000);
    let response: Response;
    try {
      response = await fetch(OPENAI_CHAT_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_completion_tokens: this.options.maxCompletionTokens ?? 3000,
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
