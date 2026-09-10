import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  COMPLIANCE_POLICIES_BUCKET,
  compliancePolicyPath,
  deriveKey,
  encrypt,
  sha256Hex,
} from "@gapture/shared";

export const runtime = "nodejs";

/**
 * Company compliance policy upload + listing (PRD FR-12, plan Phase 8).
 *
 * POST: authenticated, org-scoped. Stores the AES-256-encrypted original at
 * compliance-policies/{organization_id}/{policy_id}/original.enc, dedupes on
 * (organization_id, sha256), and inserts an UPLOADED compliance_policies row.
 * The worker's policy sweep then does extract -> clean -> chunk -> embed.
 *
 * GET: lists the caller's organization's policies (RLS scopes the query).
 *
 * Deliberately NOT built (plan Phase 8 task 5): versioning, categorization,
 * approval workflow. "Replacing" a policy is just another upload.
 */

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** OCR.space free tier caps PDFs/images at 1 MB — warn, don't block. */
const OCR_SOFT_LIMIT_BYTES = 1024 * 1024;

async function resolveOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return (data?.organization_id as string | undefined) ?? null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error(
      JSON.stringify({ level: "error", component: "api/policies", message: "DOCUMENT_ENCRYPTION_KEY not set" }),
    );
    return NextResponse.json({ error: "Policy storage is not configured on this server" }, { status: 500 });
  }

  const organizationId = await resolveOrgId(supabase, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "No organization for this account" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with a 'file' field" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A 'file' field is required" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type '${file.type || "unknown"}'. Allowed: PDF, plain text, Markdown, PNG, JPEG.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is ${file.size} bytes, over the ${MAX_UPLOAD_BYTES}-byte limit` },
      { status: 413 },
    );
  }

  const titleRaw = formData.get("title");
  const title = (typeof titleRaw === "string" && titleRaw.trim()) || file.name || "Untitled policy";

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = sha256Hex(bytes);

  const { data: existing } = await supabase
    .from("compliance_policies")
    .select("id, title")
    .eq("organization_id", organizationId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "This exact file is already uploaded for your organization", existingPolicyId: existing.id },
      { status: 409 },
    );
  }

  const policyId = randomUUID();
  const storagePath = compliancePolicyPath(organizationId, policyId, "original.enc");
  const ciphertext = encrypt(bytes, deriveKey(encryptionKey));

  const { error: uploadError } = await supabase.storage
    .from(COMPLIANCE_POLICIES_BUCKET)
    .upload(storagePath, ciphertext, { contentType: "application/octet-stream", upsert: false });
  if (uploadError) {
    console.error(
      JSON.stringify({ level: "error", component: "api/policies", message: "storage upload failed", error: uploadError.message }),
    );
    return NextResponse.json({ error: "Failed to store the uploaded file" }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("compliance_policies")
    .insert({
      id: policyId,
      organization_id: organizationId,
      title,
      storage_bucket: COMPLIANCE_POLICIES_BUCKET,
      storage_path: storagePath,
      mime_type: file.type,
      file_size_bytes: bytes.byteLength,
      sha256,
      status: "UPLOADED",
    })
    .select("id, title, status, created_at")
    .single();

  if (insertError || !inserted) {
    // Roll back the orphaned object so a retry with the same file isn't blocked.
    await supabase.storage.from(COMPLIANCE_POLICIES_BUCKET).remove([storagePath]);
    console.error(
      JSON.stringify({ level: "error", component: "api/policies", message: "policy insert failed", error: insertError?.message }),
    );
    return NextResponse.json({ error: "Failed to record the policy" }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: inserted.id,
      title: inserted.title,
      status: inserted.status,
      createdAt: inserted.created_at,
      ...(bytes.byteLength > OCR_SOFT_LIMIT_BYTES && file.type !== "text/plain" && file.type !== "text/markdown"
        ? { warning: "File is over OCR.space's 1 MB free-tier limit; text extraction may fail until a paid OCR tier is configured." }
        : {}),
    },
    { status: 201 },
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("compliance_policies")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      JSON.stringify({ level: "error", component: "api/policies", message: "policy list failed", error: error.message }),
    );
    return NextResponse.json({ error: "Failed to list policies" }, { status: 500 });
  }

  return NextResponse.json({
    policies: (data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
    })),
  });
}
