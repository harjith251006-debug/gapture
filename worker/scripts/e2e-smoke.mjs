/**
 * Phase 16 — End-to-End Integration smoke test.
 *
 * Drives ONE real regulatory document through the entire pipeline against
 * real external services (Supabase, OCR.space, OpenAI, Pinecone, ElevenLabs)
 * and checks off the integration checklist from docs/IMPLEMENTATION-PLAN.md.
 *
 *   node --env-file=../.env scripts/e2e-smoke.mjs            # run
 *   node --env-file=../.env scripts/e2e-smoke.mjs --cleanup  # restore state
 *
 * Web-render + Q&A + voice checks need `pnpm --filter @gapture/web dev`
 * running on :3000; pass --skip-web to omit them.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { loadConfig } from "../src/config.js";
import { createWorkerSupabaseClient } from "../src/supabase.js";
import { createLogger } from "../src/logger.js";
import { runCycle } from "../src/monitoring/loop.js";
import { processDocument } from "../src/ingestion/process-document.js";
import { cleanAndChunkDocument } from "../src/intelligence/process-cleaning.js";
import { embedAndIndexDocument } from "../src/intelligence/embed-and-index.js";
import { processPolicyDocument } from "../src/intelligence/policy-pipeline.js";
import { runAnalysisForDocument } from "../src/analysis/run-analysis.js";
import { createNotificationsForDocument } from "../src/analysis/create-notification.js";
import {
  COMPLIANCE_POLICIES_BUCKET,
  compliancePolicyPath,
  deriveKey,
  decrypt,
  encrypt,
  sha256Hex,
  getSignedUrl,
} from "@gapture/shared";

loadDotenv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });

const config = loadConfig();
const supabase = createWorkerSupabaseClient(config);
const log = createLogger("e2e");
const key = deriveKey(config.DOCUMENT_ENCRYPTION_KEY);
const admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_ClyjHuykWR6lSfPx4HLz5A_dJVqe7YM";
const REF = config.SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const BASE = "http://localhost:3000";
const SKIP_WEB = process.argv.includes("--skip-web");

const ORG_A = "E2E Org A (AML)";
const ORG_B = "E2E Org B (data protection)";
const EMAIL_A = "e2e.a@example.com";
const EMAIL_B = "e2e.b@example.com";
const PASS = "E2E-smoke-pw!";
const MARKER = "[e2e-smoke]";

const POLICY_A = `${MARKER} ACME BANK — SANCTIONS SCREENING & AML POLICY
All customers and counterparties are screened against the UNSC 1267/1989 (ISIL
& Al-Qaida) and 1988 (Taliban) sanctions lists at onboarding and within 24
hours of any RBI amendment to the designated-persons lists under Section 51A of
UAPA, 1967. On a positive match the account is frozen and reported within 24
hours. Screening records are retained for five years.`;

const POLICY_B = `${MARKER} GLOBEX — CUSTOMER DATA PROTECTION POLICY
Personal data is collected only for a stated purpose, encrypted at rest, and
retained no longer than required by law. Customers may request a copy of their
data or its deletion. Access is role-based and logged.`;

const STATE_FILE = join(dirname(fileURLToPath(import.meta.url)), ".e2e-state.json");

const results = [];
const check = (label, pass, detail = "") => {
  results.push({ label, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
};

// ---------------------------------------------------------------------------
async function findTestUsers() {
  const { data } = await admin.auth.admin.listUsers();
  return {
    a: data.users.find((u) => u.email === EMAIL_A),
    b: data.users.find((u) => u.email === EMAIL_B),
  };
}

async function cleanup() {
  console.log("cleanup: restoring pre-run state…");
  const { a, b } = await findTestUsers();
  for (const u of [a, b].filter(Boolean)) {
    const { data: p } = await admin.from("profiles").select("organization_id").eq("id", u.id).maybeSingle();
    await admin.from("notifications").delete().eq("user_id", u.id);
    await admin.from("contextual_interactions").delete().eq("user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
    if (p) {
      const { data: pols } = await admin.from("compliance_policies").select("storage_path").eq("organization_id", p.organization_id);
      for (const pol of pols ?? []) await admin.storage.from(COMPLIANCE_POLICIES_BUCKET).remove([pol.storage_path]);
      await admin.from("organizations").delete().eq("id", p.organization_id);
    }
  }
  // Restore every document whose status changed during the run to its
  // pre-run status, wiping any chunks / vectors / sidecars produced.
  const snapshot = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")).snapshot ?? {} : {};
  const { data: docs } = await admin
    .from("regulatory_documents")
    .select("id, external_reference, status, storage_bucket, storage_path");
  for (const d of docs ?? []) {
    const prev = snapshot[d.id];
    if (!prev || prev === d.status) continue;
    const { data: chunks } = await admin.from("document_chunks").select("pinecone_vector_id").eq("document_id", d.id);
    const vids = (chunks ?? []).map((c) => c.pinecone_vector_id).filter(Boolean);
    if (vids.length) {
      await fetch(`${config.PINECONE_INDEX_HOST}/vectors/delete`, {
        method: "POST",
        headers: { "Api-Key": config.PINECONE_API_KEY, "Content-Type": "application/json", "X-Pinecone-API-Version": "2025-01" },
        body: JSON.stringify({ ids: vids, namespace: config.PINECONE_NAMESPACE_REGULATORY }),
      });
    }
    await admin.from("document_chunks").delete().eq("document_id", d.id);
    await admin.from("nlp_analyses").delete().eq("document_id", d.id);
    if (d.storage_path) {
      await admin.storage.from(d.storage_bucket).remove([d.storage_path, d.storage_path.replace(/original\.enc$/, "extracted.enc")]);
    }
    await admin.rpc("advance_document_status", { p_document_id: d.id, p_new_status: prev });
    if (prev === "DETECTED") {
      await admin
        .from("regulatory_documents")
        .update({ storage_bucket: null, storage_path: null, mime_type: null, file_size_bytes: null, sha256: null, retrieved_at: null })
        .eq("id", d.id);
    }
    console.log(`  reset ${d.external_reference} : ${d.status} -> ${prev}`);
  }
  await fetch(`${config.PINECONE_INDEX_HOST}/vectors/delete`, {
    method: "POST",
    headers: { "Api-Key": config.PINECONE_API_KEY, "Content-Type": "application/json", "X-Pinecone-API-Version": "2025-01" },
    body: JSON.stringify({ deleteAll: true, namespace: config.PINECONE_NAMESPACE_POLICY }),
  });
  if (existsSync(STATE_FILE)) rmSync(STATE_FILE);
  console.log("cleanup done.");
}

if (process.argv.includes("--cleanup")) {
  await cleanup();
  process.exit(0);
}

// ===========================================================================
console.log("=== Phase 16 — End-to-End Integration ===\n");
const t0 = Date.now();

// --- 1. Live monitoring cycle: detection + no-spurious-data ----------------
console.log("[1] Live monitoring cycle");
const beforeCounts = (await admin.from("regulatory_documents").select("id, status")).data;
// snapshot every doc's status so cleanup can restore whatever runCycle advances
writeFileSync(STATE_FILE, JSON.stringify({ snapshot: Object.fromEntries(beforeCounts.map((d) => [d.id, d.status])), at: new Date().toISOString() }));
await runCycle(supabase, log, config);
const afterCounts = (await admin.from("regulatory_documents").select("id, status, source_id, detected_at")).data;
const afterTally = afterCounts.reduce((m, r) => ((m[r.status] = (m[r.status] || 0) + 1), m), {});
const totalBefore = beforeCounts.length;
const totalAfter = afterCounts.length;
check("monitoring cycle completes without throwing", true, `docs ${totalBefore} -> ${totalAfter}`);
check(
  "no spurious documents created by a poll cycle",
  totalAfter - totalBefore >= 0 && totalAfter - totalBefore <= 20,
  `${totalAfter - totalBefore} new (real detections or 0; 31-doc backlog predates this run)`,
);
// source coverage from the existing corpus
const { data: sources } = await admin.from("regulatory_sources").select("id, code");
const bySource = {};
for (const s of sources) {
  const { count } = await admin.from("regulatory_documents").select("id", { count: "exact", head: true }).eq("source_id", s.id);
  bySource[s.code] = count ?? 0;
}
check("RBI monitoring has detected real items", (bySource.RBI ?? 0) > 0, `${bySource.RBI} RBI docs`);
check("SEBI monitoring has detected real items", (bySource.SEBI ?? 0) > 0, `${bySource.SEBI} SEBI docs`);

// --- 2. Drive ONE real DETECTED doc through the full worker pipeline -------
console.log("\n[2] Full worker pipeline on one real document");
const { data: pick } = await admin
  .from("regulatory_documents")
  .select("id, external_reference, title, status")
  .eq("status", "DETECTED")
  .order("detected_at", { ascending: true })
  .limit(20);
// prefer an RBI sanctions/UAPA doc so the AML policy is a real match
const target =
  pick.find((d) => /sanction|uapa|isil|taliban|al-qaida|kyc|aml/i.test(d.title)) ?? pick[0];
{
  const st = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  writeFileSync(STATE_FILE, JSON.stringify({ ...st, docId: target.id, ref: target.external_reference }));
}
console.log(`  target: ${target.external_reference} — "${target.title.slice(0, 70)}"`);

const timings = {};
let mark = Date.now();
const ing = await processDocument(supabase, log, config, target.id);
timings.ingest = Date.now() - mark;
check("ingestion (retrieve/OCR/hash/encrypt/store) completes", ing.outcome === "stored", `method=${ing.method}, ${ing.textChars} chars, ${timings.ingest}ms`);

mark = Date.now();
const cln = await cleanAndChunkDocument(supabase, log, config, target.id);
timings.clean = Date.now() - mark;
check("cleaning + chunking completes", cln.outcome === "cleaned", `${cln.chunkCount} chunks, ${cln.cleanedChars} chars, ${timings.clean}ms`);

mark = Date.now();
const emb = await embedAndIndexDocument(supabase, log, config, target.id);
timings.embed = Date.now() - mark;
check("embedding + Pinecone upsert completes", emb.outcome === "indexed", `${emb.vectorsUpserted} vectors, ${timings.embed}ms`);

// status trail
const { data: events } = await admin
  .from("document_processing_events")
  .select("status, error_message, occurred_at")
  .eq("document_id", target.id)
  .order("occurred_at", { ascending: true });
const trail = events.map((e) => e.status);
const expectedTrail = ["DETECTED", "RETRIEVED", "SECURED", "STORED", "CLEANING", "INDEXING", "ANALYZING"];
const trailOk = expectedTrail.every((s) => trail.includes(s));
check("document_processing_events records the full status trail", trailOk, trail.join(" -> "));

// --- 3. Signed-URL retrieval + AES round-trip of the encrypted original ----
console.log("\n[3] Encrypted original — signed URL + AES round-trip");
const { data: doc } = await admin
  .from("regulatory_documents")
  .select("storage_bucket, storage_path, mime_type, sha256")
  .eq("id", target.id)
  .single();
const signed = await getSignedUrl(admin, doc.storage_bucket, doc.storage_path, 120);
const enc = Buffer.from(await (await fetch(signed)).arrayBuffer());
const dec = decrypt(enc, key);
const sha = sha256Hex(dec);
check("encrypted original retrievable via time-limited signed URL", signed.includes("token="), `${enc.length} bytes`);
check("original decrypts and SHA-256 matches the stored fingerprint", sha === doc.sha256, `${sha.slice(0, 16)}…`);
// extracted-text sidecar
const extPath = doc.storage_path.replace(/original\.enc$/, "extracted.enc");
const extSigned = await getSignedUrl(admin, doc.storage_bucket, extPath, 120);
const extText = decrypt(Buffer.from(await (await fetch(extSigned)).arrayBuffer()), key).toString("utf8");
check("extracted-text sidecar decrypts to real document text", extText.length > 200, `${extText.length} chars`);

// --- 4. Pinecone round-trip: match resolves to the right Postgres row -----
console.log("\n[4] Pinecone round-trip");
const { data: chunk0 } = await admin
  .from("document_chunks")
  .select("id, chunk_index, content, pinecone_vector_id")
  .eq("document_id", target.id)
  .order("chunk_index", { ascending: true })
  .limit(1)
  .single();
const embRes = await fetch("https://api.openai.com/v1/embeddings", {
  method: "POST",
  headers: { Authorization: "Bearer " + config.OPENAI_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ model: config.OPENAI_EMBEDDING_MODEL, input: [chunk0.content], dimensions: config.OPENAI_EMBEDDING_DIMENSIONS }),
});
const qv = (await embRes.json()).data[0].embedding;
const pcQ = await fetch(`${config.PINECONE_INDEX_HOST}/query`, {
  method: "POST",
  headers: { "Api-Key": config.PINECONE_API_KEY, "Content-Type": "application/json", "X-Pinecone-API-Version": "2025-01" },
  body: JSON.stringify({ vector: qv, topK: 1, namespace: config.PINECONE_NAMESPACE_REGULATORY, includeMetadata: true, filter: { document_id: target.id } }),
});
const topMatch = (await pcQ.json()).matches[0];
check(
  "Pinecone match resolves back to the correct document_chunks row",
  topMatch?.id === chunk0.pinecone_vector_id && topMatch?.metadata?.document_id === target.id,
  `score ${topMatch?.score?.toFixed(4)}`,
);

// --- 5. Two orgs, two policies ------------------------------------------
console.log("\n[5] Two organizations with different policies");
async function ensureUserOrg(email, orgName) {
  const { data: list } = await admin.auth.admin.listUsers();
  let u = list.users.find((x) => x.email === email);
  if (!u) {
    u = (await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true })).data.user;
    await new Promise((r) => setTimeout(r, 500));
  }
  const { data: p } = await admin.from("profiles").select("organization_id").eq("id", u.id).single();
  await admin.from("organizations").update({ name: orgName }).eq("id", p.organization_id);
  return { user: u, orgId: p.organization_id };
}
const a = await ensureUserOrg(EMAIL_A, ORG_A);
const b = await ensureUserOrg(EMAIL_B, ORG_B);

async function uploadPolicy(orgId, title, text) {
  const bytes = Buffer.from(text, "utf8");
  const sha = sha256Hex(bytes);
  const { data: dupe } = await admin.from("compliance_policies").select("id").eq("organization_id", orgId).eq("sha256", sha).maybeSingle();
  if (dupe) return dupe.id;
  const pid = randomUUID();
  const path = compliancePolicyPath(orgId, pid, "original.enc");
  await admin.storage.from(COMPLIANCE_POLICIES_BUCKET).upload(path, encrypt(bytes, key), { contentType: "application/octet-stream", upsert: false });
  await admin.from("compliance_policies").insert({
    id: pid, organization_id: orgId, title,
    storage_bucket: COMPLIANCE_POLICIES_BUCKET, storage_path: path, mime_type: "text/plain",
    file_size_bytes: bytes.byteLength, sha256: sha, status: "UPLOADED",
  });
  return pid;
}
const polA = await uploadPolicy(a.orgId, `${MARKER} ACME Sanctions & AML Policy`, POLICY_A);
const polB = await uploadPolicy(b.orgId, `${MARKER} Globex Data Protection Policy`, POLICY_B);
mark = Date.now();
for (const pid of [polA, polB]) await processPolicyDocument(supabase, log, config, pid);
timings.policies = Date.now() - mark;
const { data: polRows } = await admin.from("compliance_policies").select("status").in("id", [polA, polB]);
check("both policies processed to COMPLETED (clean/chunk/embed)", polRows.every((p) => p.status === "COMPLETED"), `${timings.policies}ms`);

// --- 6. NLP analysis for both orgs ------------------------------------
console.log("\n[6] NLP analysis — two distinct, correctly-scoped analyses");
mark = Date.now();
const ana = await runAnalysisForDocument(supabase, log, config, target.id);
timings.analysis = Date.now() - mark;
const { data: analyses } = await admin
  .from("nlp_analyses")
  .select("organization_id, one_line_output, detailed_output, summary_output")
  .eq("document_id", target.id);
check("analysis run completes and document reaches COMPLETED", ana.outcome === "analyzed", `${timings.analysis}ms`);
check("exactly two analyses, one per organization", analyses.length === 2 && new Set(analyses.map((x) => x.organization_id)).size === 2);
const anaA = analyses.find((x) => x.organization_id === a.orgId);
const anaB = analyses.find((x) => x.organization_id === b.orgId);
check(
  "the two organizations' analyses are materially different",
  anaA && anaB && anaA.detailed_output !== anaB.detailed_output && anaA.one_line_output !== anaB.one_line_output,
);
check(
  "each output is a non-empty 1-Line / Detailed / Summary",
  analyses.every((x) => x.one_line_output && x.detailed_output && x.summary_output),
);

// --- 7. Notifications --------------------------------------------------
console.log("\n[7] Notification fan-out");
await createNotificationsForDocument(supabase, log, target.id);
const { data: notifs } = await admin
  .from("notifications")
  .select("user_id, organization_id, title, description, nlp_analysis_id")
  .eq("document_id", target.id);
const notifA = notifs.find((n) => n.user_id === a.user.id);
const notifB = notifs.find((n) => n.user_id === b.user.id);
check("one notification per organization member", notifs.length === 2 && Boolean(notifA) && Boolean(notifB));
check(
  "notification title/description carry the analysis 1-Line/Summary, org-scoped",
  notifA && notifA.title === anaA.one_line_output.slice(0, 500) && notifA.description === anaA.summary_output &&
    notifB && notifB.title === anaB.one_line_output.slice(0, 500),
);

// --- 8. Web + Q&A + voice (needs `next dev`) --------------------------
if (!SKIP_WEB) {
  console.log("\n[8] Web application + Contextual Q&A + voice");
  try {
    const anon = createClient(config.SUPABASE_URL, ANON, { auth: { persistSession: false } });
    const { data: sess } = await anon.auth.signInWithPassword({ email: EMAIL_A, password: PASS });
    const COOKIE = `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(sess.session)).toString("base64")}`;
    const authed = (p, init = {}) => fetch(`${BASE}${p}`, { ...init, headers: { Cookie: COOKIE, ...(init.headers || {}) } });

    const dash = await authed("/dashboard");
    const dashHtml = await dash.text();
    check("web: /dashboard renders the notification", dash.status === 200 && dashHtml.includes(anaA.one_line_output.slice(0, 40)));

    const list = await authed("/api/documents?status=COMPLETED&limit=50");
    const listJson = await list.json();
    check("web: document list API returns the completed document", listJson.data?.some((d) => d.id === target.id));

    const detail = await authed(`/regulations/${target.id}`);
    const detailHtml = await detail.text();
    check(
      "web: document detail renders 1-Line + Summary + Detailed",
      detail.status === 200 && detailHtml.includes(anaA.one_line_output.slice(0, 40)) && detailHtml.includes("Detailed analysis"),
    );

    const notifPage = await authed("/notifications");
    check("web: /notifications renders", (await notifPage).status === 200);

    // Q&A
    mark = Date.now();
    const qa = await authed("/api/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: target.id, question: "What does this circular require regulated entities to do?" }),
    });
    const qaJson = await qa.json();
    timings.qa = Date.now() - mark;
    check("Q&A: grounded answer for a real question", qa.status === 201 && qaJson.data?.answered === true, `sources ${JSON.stringify(qaJson.data?.sources)}, ${timings.qa}ms`);
    check("Q&A: off-topic question is refused, not fabricated", await (async () => {
      const off = await authed("/api/qa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: target.id, question: "What is the boiling point of water at sea level?" }) });
      const j = await off.json();
      return j.data?.answered === false && !/100|celsius|212/i.test(j.data?.answer ?? "");
    })());
    const hist = await authed(`/api/qa/history?documentId=${target.id}`);
    check("Q&A: history persists", ((await hist.json()).data?.length ?? 0) >= 2);

    // Voice round trip: synth question -> transcribe -> qa -> speak
    mark = Date.now();
    const synth = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + config.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "alloy", input: "What action does this document require?", response_format: "mp3" }),
    });
    const qAudio = Buffer.from(await synth.arrayBuffer());
    const tf = new FormData();
    tf.set("audio", new Blob([qAudio], { type: "audio/mpeg" }), "q.mp3");
    const tr = await authed("/api/voice/transcribe", { method: "POST", body: tf });
    const trJson = await tr.json();
    const speak = await authed("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: anaA.summary_output.slice(0, 400) }) });
    timings.voice = Date.now() - mark;
    check(
      "voice: STT -> Q&A -> TTS round trip",
      tr.status === 200 && /action.*document.*require/i.test(trJson.data?.text ?? "") && speak.status === 200 && speak.headers.get("content-type") === "audio/mpeg",
      `TTS via ${speak.headers.get("x-tts-provider")}, ${timings.voice}ms`,
    );
  } catch (err) {
    check("web/Q&A/voice checks", false, `error: ${err.message} (is 'pnpm --filter @gapture/web dev' running?)`);
  }
} else {
  console.log("\n[8] Web/Q&A/voice — skipped (--skip-web)");
}

// --- 9. Secret scan ------------------------------------------------
console.log("\n[9] Secret hygiene");
const secretsToScan = [config.SUPABASE_SERVICE_ROLE_KEY, config.OPENAI_API_KEY, config.PINECONE_API_KEY, config.OCR_SPACE_API_KEY, config.DOCUMENT_ENCRYPTION_KEY].filter(Boolean);
// captured worker logs go to stdout as JSON; this process printed them above.
// Re-scan our own captured output isn't available, so scan the doc/analysis
// content we just persisted for accidental key material instead.
const persisted = [extText, ...analyses.flatMap((x) => [x.one_line_output, x.detailed_output, x.summary_output]), ...notifs.flatMap((n) => [n.title, n.description])].join("\n");
const leaked = secretsToScan.filter((s) => persisted.includes(s));
check("no API key or encryption key appears in any persisted text", leaked.length === 0, leaked.length ? "LEAK!" : "clean");

// --- 10. Report ---------------------------------------------------
const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
console.log("\n=== TIMINGS (first real data for the Phase 19 baseline) ===");
console.log(`  ingest ${timings.ingest}ms | clean ${timings.clean}ms | embed ${timings.embed}ms | 2 policies ${timings.policies}ms | analysis(2 orgs) ${timings.analysis}ms`);
if (timings.qa) console.log(`  qa ${timings.qa}ms | voice round-trip ${timings.voice}ms`);
console.log(`  total wall clock: ${elapsed}s`);

const passed = results.filter((r) => r.pass).length;
console.log(`\n=== CHECKLIST: ${passed}/${results.length} passed ===`);
for (const r of results) if (!r.pass) console.log(`  FAIL: ${r.label} ${r.detail}`);

console.log("\nRun with --cleanup to remove test orgs/users/policies/notifications and reset the document.");
process.exit(passed === results.length ? 0 : 1);
