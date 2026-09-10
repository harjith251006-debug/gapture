import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { EmbeddingService } from "../embeddings/embedding-service";
import type { PineconeClient } from "../pinecone/pinecone-client";
import { LlmError } from "./types";

/**
 * Contextual Q&A (PRD FR-23, HLSA §12). Answers a question about ONE
 * regulatory document, grounded in:
 *   - that document's own indexed chunks (Pinecone `regulatory` namespace,
 *     filtered to this document_id), and
 *   - the caller's organization's policy chunks (Pinecone `policy` namespace,
 *     filtered to this organization_id).
 *
 * Core guardrail (skills/ai-architecture.md, applied verbatim): if retrieval
 * returns nothing usable, respond with an explicit "cannot answer" — never
 * the model's unsourced general knowledge of Indian financial regulation.
 *
 * Phase 10 ships this as a working minimal service so `/api/qa` is real;
 * Phase 13 refines retrieval blending, prompt, and the frontend.
 */

const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

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
          "The answer to the user's question, using ONLY facts present in the CONTEXT. If the context does not contain enough to answer, say so plainly here.",
      },
      answered: {
        type: "boolean",
        description: "true only if the CONTEXT genuinely contained enough information to answer the question.",
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
}

export interface ContextualQaOptions {
  apiKey: string;
  model?: string;
  regulatoryNamespace: string;
  policyNamespace: string;
  topK?: number;
  timeoutMs?: number;
  maxCompletionTokens?: number;
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

    const regChunks = await this.resolve("document_chunks", regMatches.map((m) => m.id));
    const polChunks = await this.resolvePolicy(polMatches.map((m) => m.id));

    if (regChunks.length === 0 && polChunks.length === 0) {
      return {
        answer:
          "I don't have any indexed context for this document or your organization's policies yet, so I can't answer that reliably. Please try again once processing has completed.",
        answered: false,
        model: this.model,
        regulatoryChunksUsed: 0,
        policyChunksUsed: 0,
      };
    }

    const result = await this.callModel(input.documentTitle, input.question, regChunks, polChunks);
    return {
      ...result,
      model: this.model,
      regulatoryChunksUsed: regChunks.length,
      policyChunksUsed: polChunks.length,
    };
  }

  private async resolve(table: "document_chunks", vectorIds: string[]): Promise<string[]> {
    if (vectorIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from(table)
      .select("pinecone_vector_id, content")
      .in("pinecone_vector_id", vectorIds);
    if (error) throw new Error(`resolve ${table} failed: ${error.message}`);
    const byId = new Map((data ?? []).map((r) => [r.pinecone_vector_id as string, r.content as string]));
    return vectorIds.map((id) => byId.get(id)).filter((c): c is string => Boolean(c));
  }

  private async resolvePolicy(vectorIds: string[]): Promise<{ title: string; content: string }[]> {
    if (vectorIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("policy_chunks")
      .select("pinecone_vector_id, content, compliance_policies(title)")
      .in("pinecone_vector_id", vectorIds);
    if (error) throw new Error(`resolve policy_chunks failed: ${error.message}`);
    const byId = new Map<string, { title: string; content: string }>();
    for (const r of data ?? []) {
      const cp = (r as { compliance_policies: { title: string } | { title: string }[] | null }).compliance_policies;
      const title = (Array.isArray(cp) ? cp[0]?.title : cp?.title) ?? "Policy";
      byId.set(r.pinecone_vector_id as string, { title, content: r.content as string });
    }
    return vectorIds.map((id) => byId.get(id)).filter((c): c is { title: string; content: string } => Boolean(c));
  }

  private async callModel(
    documentTitle: string,
    question: string,
    regChunks: string[],
    polChunks: { title: string; content: string }[],
  ): Promise<{ answer: string; answered: boolean }> {
    const context = [
      `REGULATORY DOCUMENT: ${documentTitle}`,
      "",
      "REGULATION EXCERPTS",
      regChunks.length ? regChunks.map((c, i) => `[R${i + 1}] ${c}`).join("\n\n") : "(none retrieved)",
      "",
      "ORGANIZATION POLICY EXCERPTS",
      polChunks.length
        ? polChunks.map((c, i) => `[P${i + 1}] (from "${c.title}") ${c.content}`).join("\n\n")
        : "(none retrieved)",
    ].join("\n");

    const messages = [
      {
        role: "system",
        content:
          "You answer a compliance officer's question about ONE regulatory document. Use ONLY the facts in the CONTEXT block. Never use general knowledge of Indian financial regulation to fill gaps. If the context is insufficient, set answered=false and say so. Keep the answer scoped to this document. Output only JSON per the schema.",
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
