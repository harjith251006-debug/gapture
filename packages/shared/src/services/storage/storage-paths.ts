/**
 * Bucket names and path conventions, centralized so no code hand-constructs
 * a Storage path or bucket name string in more than one place (DB Schema §36).
 */

export const REGULATORY_DOCUMENTS_BUCKET = "regulatory-documents";
export const COMPLIANCE_POLICIES_BUCKET = "compliance-policies";

/** {organization_id}/{policy_id}/{filename} — matches migration 013's storage policies. */
export function compliancePolicyPath(organizationId: string, policyId: string, filename: string): string {
  return `${organizationId}/${policyId}/${filename}`;
}

/** {source_code}/{year}/{filename} — matches Tech Stack §13's suggested structure. */
export function regulatoryDocumentPath(sourceCode: string, year: number, filename: string): string {
  return `${sourceCode.toLowerCase()}/${year}/${filename}`;
}
