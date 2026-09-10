import { z } from "zod";
import { ApiError, apiError, parseJsonBody, requireSession, route } from "@/lib/api";
import { synthesizeSpeech } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ text: z.string().trim().min(1).max(4000) });

/**
 * POST /api/voice/speak — { text } -> audio/mpeg. Tries ElevenLabs then
 * OpenAI TTS server-side. If both are unavailable, returns 502 so the client
 * falls back to showing the answer as text only (HLSA §21, BRD RISK-004) —
 * the text answer is always already on screen, so this never blocks the
 * interaction.
 */
export const POST = route("api/voice/speak", async (req) => {
  await requireSession();

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new ApiError("bad_request", "Request body must be JSON");
  }
  const { text } = parseJsonBody(bodySchema, rawBody);

  const speech = await synthesizeSpeech(text);
  if (!speech) {
    return apiError("upstream_error", "Voice output is unavailable right now — showing the answer as text.");
  }

  return new Response(new Uint8Array(speech.audio), {
    status: 200,
    headers: {
      "Content-Type": speech.contentType,
      "Content-Length": String(speech.audio.byteLength),
      "X-TTS-Provider": speech.provider,
      "Cache-Control": "no-store",
    },
  });
});
