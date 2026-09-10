import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OCRService, OcrSpaceProvider, OcrError } from "@gapture/shared";

/**
 * The ONLY place OCR.space is ever called from. The frontend calls this
 * Route Handler, never OCR.space directly — the API key never reaches the
 * browser (docs/IMPLEMENTATION-PLAN.md §8.1).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.error(
      JSON.stringify({ level: "error", component: "api/ocr/extract", message: "OCR_SPACE_API_KEY not set" }),
    );
    return NextResponse.json({ error: "OCR is not configured on this server" }, { status: 500 });
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

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const ocrService = new OCRService(
    new OcrSpaceProvider({
      apiKey,
      timeoutMs: Number(process.env.OCR_REQUEST_TIMEOUT_MS) || 30_000,
    }),
  );

  try {
    const result = await ocrService.extractText({
      fileBuffer,
      mimeType: file.type,
      filename: file.name,
    });
    return NextResponse.json({ text: result.text, succeeded: result.succeeded, pages: result.pages.length });
  } catch (err) {
    const message = err instanceof OcrError ? err.message : "OCR processing failed";
    console.error(
      JSON.stringify({
        level: "error",
        component: "api/ocr/extract",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
