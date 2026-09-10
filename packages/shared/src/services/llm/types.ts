import { z } from "zod";

/**
 * NLP / AI analysis types (PRD FR-11–FR-16). Provider-agnostic: nothing here
 * names OpenAI, mirroring the OCR / embedding abstractions.
 */

/** One retrieved company-policy chunk used as grounding context. */
export interface PolicyContextChunk {
  policyTitle: string;
  content: string;
  /** Pinecone similarity score — lets the prompt/reader judge relevance. */
  score: number;
}

export interface AnalysisInput {
  documentTitle: string;
  sourceName: string;
  /** Cleaned regulatory text (already truncated to the prompt budget by the caller). */
  regulatoryText: string;
  /** Org-scoped policy context, best match first. May be empty. */
  policyContext: PolicyContextChunk[];
}

/**
 * The three required outputs plus an explicit grounding signal. `strict` JSON
 * schema at the API layer guarantees the shape; this Zod schema is the
 * second gate (non-empty, sane) before anything is persisted.
 */
export const analysisOutputSchema = z.object({
  one_line: z.string().trim().min(1).max(2000),
  detailed: z.string().trim().min(1).max(20000),
  summary: z.string().trim().min(1).max(8000),
  /**
   * false when the policy context is empty or clearly unrelated to the
   * regulation — the outputs then say so plainly instead of inventing a
   * comparison (skills/SKILL.md guardrail).
   */
  evidence_sufficient: z.boolean(),
});

export type AnalysisOutputRaw = z.infer<typeof analysisOutputSchema>;

export interface AnalysisOutput {
  oneLine: string;
  detailed: string;
  summary: string;
  evidenceSufficient: boolean;
  /** Model identifier that produced this (logging / provenance). */
  model: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
