import type { PolicyContextChunk } from "@gapture/shared";
import type { WorkerSupabaseClient } from "../supabase.js";
import type { Config } from "../config.js";
import { getEmbeddingClients } from "../intelligence/clients.js";

/**
 * Context retrieval for Phase 9. Analysis is organization-scoped (DB Schema
 * §7 / HLSA §11), so policy context is always fetched per organization and
 * the Pinecone query is filtered by `organization_id` — a document is never
 * compared against another org's policies.
 */

export interface RegulatoryText {
  title: string;
  sourceName: string;
  text: string;
  chunkCount: number;
}

/** Reassemble the document's cleaned text from its chunks, capped for the prompt. */
export async function getRegulatoryText(
  supabase: WorkerSupabaseClient,
  documentId: string,
  maxChars: number,
): Promise<RegulatoryText> {
  const { data: docData, error } = await supabase
    .from("regulatory_documents")
    .select("title, regulatory_sources(name)")
    .eq("id", documentId)
    .single();
  if (error || !docData) throw new Error(`cannot load document ${documentId}: ${error?.message}`);

  const doc = docData as unknown as {
    title: string;
    regulatory_sources: { name: string } | { name: string }[] | null;
  };

  const { data: chunks, error: chunkErr } = await supabase
    .from("document_chunks")
    .select("content")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });
  if (chunkErr) throw new Error(`cannot load chunks for ${documentId}: ${chunkErr.message}`);

  const joined = (chunks ?? []).map((c) => c.content as string).join("\n\n");
  const text = joined.length > maxChars ? `${joined.slice(0, maxChars)}\n\n[...regulation text truncated...]` : joined;

  const source = Array.isArray(doc.regulatory_sources)
    ? doc.regulatory_sources[0]
    : doc.regulatory_sources;
  return {
    title: doc.title,
    sourceName: source?.name ?? "Unknown regulator",
    text,
    chunkCount: chunks?.length ?? 0,
  };
}

/** Organizations that have at least one fully-processed policy to compare against. */
export async function getOrganizationsWithPolicies(supabase: WorkerSupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("compliance_policies")
    .select("organization_id")
    .eq("status", "COMPLETED");
  if (error) throw new Error(`cannot list organizations with policies: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.organization_id as string))];
}

interface PolicyChunkJoin {
  pinecone_vector_id: string;
  content: string;
  compliance_policies: { title: string } | { title: string }[] | null;
}

function joinTitle(j: PolicyChunkJoin): string {
  const p = Array.isArray(j.compliance_policies) ? j.compliance_policies[0] : j.compliance_policies;
  return p?.title ?? "Untitled policy";
}

/**
 * Retrieve the most relevant policy chunks for one organization, grounded on
 * the regulatory text. Returns [] when the org has no relevant policy
 * material — the caller treats that as "insufficient evidence".
 */
export async function retrievePolicyContext(
  supabase: WorkerSupabaseClient,
  config: Config,
  organizationId: string,
  queryText: string,
): Promise<PolicyContextChunk[]> {
  const { embeddings, pinecone } = getEmbeddingClients(config);

  const [queryVector] = await embeddings.embedTexts([queryText.slice(0, config.ANALYSIS_MAX_REG_CHARS)]);
  if (!queryVector) return [];

  const matches = await pinecone.query({
    vector: queryVector,
    topK: config.ANALYSIS_CONTEXT_TOPK,
    namespace: config.PINECONE_NAMESPACE_POLICY,
    includeMetadata: true,
    filter: { organization_id: organizationId },
  });
  if (matches.length === 0) return [];

  // Resolve each vector id back to its Postgres row (DB Schema §37 — text
  // lives in Postgres, never in Pinecone).
  const ids = matches.map((m) => m.id);
  const { data: rows, error } = await supabase
    .from("policy_chunks")
    .select("pinecone_vector_id, content, compliance_policies(title)")
    .in("pinecone_vector_id", ids);
  if (error) throw new Error(`cannot resolve policy chunks: ${error.message}`);

  const byId = new Map<string, PolicyChunkJoin>();
  for (const r of (rows ?? []) as unknown as PolicyChunkJoin[]) {
    byId.set(r.pinecone_vector_id, r);
  }

  const out: PolicyContextChunk[] = [];
  for (const match of matches) {
    const row = byId.get(match.id);
    if (!row) continue; // vector with no live row (stale) — skip, never guess
    out.push({ policyTitle: joinTitle(row), content: row.content, score: match.score });
  }
  return out;
}
