import type { AnalysisInput } from "../types";

/**
 * Prompt + response schema for the regulatory-vs-policy comparison
 * (PRD FR-11–FR-16). The guardrails from skills/SKILL.md and
 * skills/ai-architecture.md are encoded here, not left to the model's
 * discretion:
 *
 *  - every statement must be grounded in the provided text; the model may
 *    NOT introduce a regulatory clause, date, threshold, or penalty that is
 *    not present in the CONTEXT
 *  - if the policy context is empty or clearly unrelated, say so
 *    (`evidence_sufficient: false`) rather than fabricating a comparison
 *  - "a policy exists" is not "a policy is implemented" — describe only what
 *    the policy text says, never assume operational reality
 *  - preserve uncertainty; do not flatten a partial/ambiguous match into a
 *    confident verdict
 */

export const ANALYSIS_JSON_SCHEMA = {
  name: "regulatory_policy_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      one_line: {
        type: "string",
        description:
          "One sentence: the single most important impact of this regulation on the organization's compliance obligations, grounded in the context.",
      },
      detailed: {
        type: "string",
        description:
          "A thorough comparison: what the regulation requires, which of the organization's policies (by title) are affected and how, what is already aligned, what gaps or conflicts exist, and what concrete action is needed. Cite only facts present in the CONTEXT.",
      },
      summary: {
        type: "string",
        description: "A short paragraph (3-5 sentences) summarising the detailed analysis for a compliance officer.",
      },
      evidence_sufficient: {
        type: "boolean",
        description:
          "true only if the policy context contains material genuinely relevant to this regulation. false if the context is empty or unrelated — in that case all three outputs must state plainly that no relevant policy context was found and no comparison could be made.",
      },
    },
    required: ["one_line", "detailed", "summary", "evidence_sufficient"],
  },
} as const;

const SYSTEM_PROMPT = `You are a regulatory compliance analyst for Indian financial-sector entities (RBI / SEBI regulated).

You compare a newly published regulatory document against a specific organization's own compliance policies and produce a structured analysis.

Absolute rules:
1. GROUND EVERYTHING. Every claim you make must be supported by text in the CONTEXT block. Never introduce a regulatory clause number, effective date, monetary threshold, percentage, or penalty that does not appear in the CONTEXT. If the regulation text is truncated, reason only about what is shown.
2. NO POLICY CONTEXT => NO COMPARISON. If the POLICY CONTEXT section is empty or is clearly about unrelated subject matter, set "evidence_sufficient" to false and make all three outputs say plainly that no relevant company policy context was available, so no comparison could be performed. Do not invent policy content.
3. "EXISTS" IS NOT "IMPLEMENTED". Describe only what a policy document says. Never assert that the organization actually does what its policy says, or that it is compliant in practice.
4. PRESERVE UNCERTAINTY. If the match between regulation and policy is partial or ambiguous, say so. Do not present a confident verdict you cannot support.
5. Output must be valid JSON matching the provided schema. No prose outside the JSON.`;

/** Render the CONTEXT block from the retrieved material. */
function renderContext(input: AnalysisInput): string {
  const policy =
    input.policyContext.length === 0
      ? "(none — this organization has no policy text relevant to this regulation)"
      : input.policyContext
          .map(
            (c, i) =>
              `--- Policy excerpt ${i + 1} (from "${c.policyTitle}", relevance ${c.score.toFixed(3)}) ---\n${c.content}`,
          )
          .join("\n\n");

  return `REGULATORY DOCUMENT
Source: ${input.sourceName}
Title: ${input.documentTitle}

REGULATION TEXT
${input.regulatoryText}

POLICY CONTEXT (this organization's own compliance policies)
${policy}`;
}

export function buildAnalysisMessages(input: AnalysisInput): { role: "system" | "user"; content: string }[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${renderContext(input)}

TASK
Produce the JSON analysis: one_line, detailed, summary, evidence_sufficient. Follow the absolute rules.`,
    },
  ];
}
