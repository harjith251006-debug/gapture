import { ApiError, ok, requireSession, route } from "@/lib/api";
import { transcribeAudio, VoiceError } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = ["audio/"];
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * POST /api/voice/transcribe — multipart/form-data with an `audio` file.
 * Forwards to OpenAI STT server-side (the key never reaches the browser) and
 * returns the transcript. The client then sends that text to /api/qa — voice
 * is I/O around the existing Q&A flow, not a separate pipeline (HLSA §13).
 */
export const POST = route("api/voice/transcribe", async (req) => {
  await requireSession();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new ApiError("bad_request", "Expected multipart/form-data with an 'audio' field");
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new ApiError("bad_request", "An 'audio' field is required");
  if (audio.type && !ALLOWED_PREFIXES.some((p) => audio.type.startsWith(p))) {
    throw new ApiError("unsupported_media_type", `Expected an audio file, got '${audio.type}'`);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    throw new ApiError("payload_too_large", "Recording is too long");
  }
  if (audio.size < 200) {
    throw new ApiError("bad_request", "No audio captured");
  }

  let text: string;
  try {
    text = await transcribeAudio(audio);
  } catch (err) {
    if (err instanceof VoiceError) {
      console.error(JSON.stringify({ level: "error", component: "api/voice/transcribe", error: err.message }));
      throw new ApiError("upstream_error", "Couldn't transcribe that. Try again or type your question.");
    }
    throw err;
  }

  if (!text) throw new ApiError("bad_request", "Couldn't make out any speech in that recording");

  return ok({ text });
});
