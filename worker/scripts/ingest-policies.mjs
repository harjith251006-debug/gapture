/**
 * One-off: ingest the 10 real company-policy files from
 * D:\gapture\gapture_10_files\ as compliance_policies for a given org, then
 * drive them (plus any already-UPLOADED policies for that org) through the
 * Phase 8 pipeline (clean -> chunk -> embed) so they're immediately usable
 * as RAG context for Phase 9 analysis and Phase 13 Q&A.
 *
 *   node --env-file=../.env scripts/ingest-policies.mjs <organization_id>
 */
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

import { loadConfig } from "../src/config.js";
import { createWorkerSupabaseClient } from "../src/supabase.js";
import { createLogger } from "../src/logger.js";
import { processPolicyDocument } from "../src/intelligence/policy-pipeline.js";
import {
  COMPLIANCE_POLICIES_BUCKET,
  compliancePolicyPath,
  deriveKey,
  encrypt,
  sha256Hex,
} from "@gapture/shared";
import { randomUUID } from "node:crypto";

const SOURCE_DIR = "D:\\gapture\\gapture_10_files";

const orgId = process.argv[2];
if (!orgId) {
  console.error("Usage: node scripts/ingest-policies.mjs <organization_id>");
  process.exit(1);
}

const config = loadConfig();
const supabase = createWorkerSupabaseClient(config);
const log = createLogger("ingest-policies");
const key = deriveKey(config.DOCUMENT_ENCRYPTION_KEY);

function titleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, "")
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => (w.length <= 3 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

async function uploadOne(filePath) {
  const filename = basename(filePath);
  const text = readFileSync(filePath, "utf8");
  const bytes = Buffer.from(text, "utf8");
  const sha256 = sha256Hex(bytes);
  const title = titleFromFilename(filename);

  const { data: existing } = await supabase
    .from("compliance_policies")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (existing) {
    console.log(`  already uploaded: ${filename} -> ${existing.id} (${existing.status})`);
    return existing.id;
  }

  const policyId = randomUUID();
  const storagePath = compliancePolicyPath(orgId, policyId, "original.enc");
  const { error: upErr } = await supabase.storage
    .from(COMPLIANCE_POLICIES_BUCKET)
    .upload(storagePath, encrypt(bytes, key), { contentType: "application/octet-stream", upsert: false });
  if (upErr) throw new Error(`storage upload failed for ${filename}: ${upErr.message}`);

  const { error: insErr } = await supabase.from("compliance_policies").insert({
    id: policyId,
    organization_id: orgId,
    title,
    storage_bucket: COMPLIANCE_POLICIES_BUCKET,
    storage_path: storagePath,
    mime_type: "text/markdown",
    file_size_bytes: bytes.byteLength,
    sha256,
    status: "UPLOADED",
  });
  if (insErr) throw new Error(`insert failed for ${filename}: ${insErr.message}`);

  console.log(`  uploaded: ${filename} -> "${title}" (${policyId})`);
  return policyId;
}

console.log(`=== Ingesting policies from ${SOURCE_DIR} into org ${orgId} ===\n`);

const files = readdirSync(SOURCE_DIR)
  .filter((f) => f.toLowerCase().endsWith(".md"))
  .sort()
  .map((f) => join(SOURCE_DIR, f));

console.log(`[1] Upload (${files.length} files)`);
const newIds = [];
for (const f of files) newIds.push(await uploadOne(f));

console.log(`\n[2] Process (clean -> chunk -> embed) every non-COMPLETED policy for this org`);
const { data: pending } = await supabase
  .from("compliance_policies")
  .select("id, title, status")
  .eq("organization_id", orgId)
  .neq("status", "COMPLETED");

console.log(`  ${pending.length} polic${pending.length === 1 ? "y" : "ies"} to process`);
let done = 0;
let failed = 0;
for (const p of pending) {
  process.stdout.write(`  - ${p.title} ... `);
  const result = await processPolicyDocument(supabase, log, config, p.id);
  if (result.outcome === "completed") {
    console.log(`COMPLETED (${result.chunkCount} chunks, ${result.vectorsUpserted} vectors)`);
    done++;
  } else {
    console.log(`HELD (${result.reason})`);
    failed++;
  }
}

console.log(`\n[3] Final status for org ${orgId}`);
const { data: all } = await supabase
  .from("compliance_policies")
  .select("title, status")
  .eq("organization_id", orgId)
  .order("created_at", { ascending: true });
for (const p of all) console.log(`  ${p.status.padEnd(10)} ${p.title}`);

console.log(`\nDone. ${done} newly processed, ${failed} held for retry.`);
process.exit(failed > 0 ? 1 : 0);
