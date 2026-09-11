import type { AnalysisInput } from "../types";

/**
 * Prompt + response schema for the regulatory-vs-policy comparison
 * (PRD FR-11–FR-16). This is Gapture's regulatory change & gap analysis
 * reasoning model — not a summarizer — applied within the existing 3-field
 * output (one_line / detailed / summary): the model is required to reason
 * through Regulatory Requirement -> Existing Company Compliance -> Gap ->
 * Required Update -> Priority -> Evidence, and to render that reasoning as
 * clearly labeled prose inside `detailed`. No new schema/DB column and no
 * dedicated UI classification surface was added for this — DESIGN.md §47
 * lists "automated gap classification" / "risk scoring" / "compliance
 * status classification" as not-active FT-07 UI features, so the richer
 * reasoning ships as analysis text the model produces, not a persisted,
 * queryable taxonomy.
 *
 * The guardrails from skills/SKILL.md and skills/ai-architecture.md are
 * encoded here, not left to the model's discretion:
 *
 *  - every statement must be grounded in the provided text; the model may
 *    NOT introduce a regulatory clause, date, threshold, or penalty that is
 *    not present in the CONTEXT, and may never infer a regulation's content
 *    from its title/number alone
 *  - do not default to "insufficient evidence" — check for semantically
 *    equivalent terminology across both streams before concluding a gap is
 *    genuinely unsupported by the retrieved policy context
 *  - "a policy exists" is not "a policy is implemented" — describe only what
 *    the policy text says, never assume operational reality
 *  - preserve uncertainty; distinguish a proven gap from a potential gap
 *    from genuinely missing evidence, and do not flatten a partial or
 *    ambiguous match into a confident verdict
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
          "The direct, actionable Executive Answer (1-3 sentences): what, specifically, the organization needs to do about this regulation given its current policies — not a generic restatement of what the regulation says.",
      },
      detailed: {
        type: "string",
        description:
          "The full compliance-gap analysis, formatted as Markdown with a '## ' heading per section: Regulatory Requirement (what this document requires); Existing Company Compliance (what the retrieved policy excerpts say, by policy title); Gap (the specific compliance delta — proven gap vs. potential gap vs. evidence genuinely missing); Required Update (the specific policy/procedure/process/system/control/documentation/training change needed, naming the policy by title — never 'update the policy accordingly'); Priority (how urgent, and why, in prose); Evidence (which regulation/policy excerpts the analysis relied on, by title and section/clause if the excerpt provides one). Use '-' bullet lists for multi-item content and '**bold**' for policy/regulation titles and key terms. Omit a section only if genuinely not applicable. Cite only facts present in the CONTEXT.",
      },
      summary: {
        type: "string",
        description:
          "A short paragraph (3-5 sentences, plain prose, no headings needed) summarising the Gap and Required Update for a compliance officer. '**bold**' may be used for the policy/regulation names.",
      },
      evidence_sufficient: {
        type: "boolean",
        description:
          "false only if, after checking the POLICY CONTEXT for semantically equivalent terminology (not just exact keyword matches), it is genuinely empty or about a clearly unrelated subject — in that case all three outputs must state plainly that no relevant policy context was found. true whenever a partial or directional comparison is possible, even if the match is incomplete.",
      },
    },
    required: ["one_line", "detailed", "summary", "evidence_sufficient"],
  },
} as const;

const SYSTEM_PROMPT = `You are Gapture's regulatory compliance change & gap analysis engine for Indian financial-sector entities (RBI / SEBI regulated). You are NOT a summarizer — you compare what a specific regulatory document requires against what a specific organization's own retrieved policy text says, and identify the compliance delta.

REASONING MODEL — work through these in order:
1. Regulatory Requirement: what does the regulation (REGULATION TEXT) require?
2. Existing Company Compliance: what does the retrieved POLICY CONTEXT say the organization's current policy already covers?
3. Comparison: does the existing policy fully address the requirement, partially address it, not address it, or is this not applicable to the organization? Reason in prose — do not overstate non-compliance. Distinguish a PROVEN gap (the policy text plainly conflicts with or is silent on an explicit requirement) from a POTENTIAL gap (the policy text is ambiguous or only loosely related) from genuinely MISSING EVIDENCE (neither stream addresses it).
4. Gap: if there is a gap, state exactly what is missing.
5. Required Update: name the specific policy (by its retrieved title), procedure, process, system control, documentation, or training that must change, and what the change is. Never say "update the policy accordingly" — say what changes, in which document.
6. Priority: how urgent, considering the nature of the regulatory obligation, any effective date stated in the regulation text, and the operational/customer impact visible in the evidence. State your reasoning; do not present certainty the evidence does not support.

DO NOT DEFAULT TO "INSUFFICIENT EVIDENCE". Before concluding the POLICY CONTEXT doesn't address the requirement: check for synonymous or semantically equivalent terminology rather than relying on exact keyword matches (e.g. customer identification ~ customer verification, suspicious transaction ~ unusual transaction, enhanced due diligence ~ EDD, sanctions screening ~ sanctions checking, record keeping ~ record retention, transaction monitoring ~ transaction surveillance). Look for related requirements even where the exact wording differs. Only set evidence_sufficient to false, and only state that no relevant policy context exists, after that check genuinely fails.

ABSOLUTE GROUNDING RULES (never violate):
- Every claim must be supported by text in REGULATION TEXT or POLICY CONTEXT. Never introduce a regulatory clause number, effective date, monetary threshold, percentage, or penalty that does not appear in the CONTEXT. Never infer a regulation's contents from its title or number alone — if the regulation text is truncated, reason only about what is shown.
- "EXISTS" is not "IMPLEMENTED": describe only what a policy document says. Never assert the organization actually does what its policy says, or that it is compliant in practice.
- PRESERVE UNCERTAINTY: if the match between regulation and policy is partial or ambiguous, say so plainly rather than presenting a confident verdict you cannot support.
- CITE EVIDENCE: reference the regulation and/or policy by title for every substantive claim. If the excerpt gives a section, clause, or page number, cite it; if not, cite the document/policy title only — never invent a locator.

FORMATTING: write "detailed" as Markdown — a "## " heading for each section named above (in that order, omitting only what's genuinely not applicable), "-" bullets for multi-item lists (e.g. multiple affected policies or multiple missing items), and "**bold**" around policy/regulation titles and key defined terms. Do not wrap the whole response in a code block. Write "one_line" and "summary" as plain prose (bold is fine, no headings).

Output must be valid JSON matching the provided schema. No prose outside the JSON.`;

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
Produce the JSON analysis: one_line, detailed, summary, evidence_sufficient. Follow the reasoning model and the absolute rules.`,
    },
  ];
}
