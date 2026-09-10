/**
 * Voice I/O helpers (Phase 14). All credentials are server-only — these run
 * exclusively inside the /api/voice/* Route Handlers (HLSA §26).
 *
 * STT: OpenAI (gpt-4o-mini-transcribe).
 * TTS: ElevenLabs is the architected primary (Tech Stack §29); on the current
 *      free plan it returns 402 paid_plan_required, so `synthesizeSpeech`
 *      falls back to OpenAI TTS, then the caller falls back to text-only
 *      (HLSA §21 / BRD RISK-004). English, mp3, non-streaming for MVP.
 */

const OPENAI_STT_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";

export class VoiceError extends Error {}

export async function transcribeAudio(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new VoiceError("OPENAI_API_KEY not set");

  const form = new FormData();
  form.set("file", file, file.name || "audio.webm");
  form.set("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  form.set("language", "en");

  const res = await fetch(OPENAI_STT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 200);
    try {
      message = JSON.parse(text).error?.message ?? message;
    } catch {
      /* keep raw */
    }
    throw new VoiceError(`Transcription failed (HTTP ${res.status}): ${message}`);
  }
  const parsed = JSON.parse(text) as { text?: string };
  return (parsed.text ?? "").trim();
}

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
  provider: "elevenlabs" | "openai";
}

/** Try ElevenLabs, then OpenAI. Returns null if both fail (caller → text-only). */
export async function synthesizeSpeech(text: string): Promise<SpeechResult | null> {
  const clean = text.slice(0, 4000);

  const el = await tryElevenLabs(clean);
  if (el) return el;

  const oa = await tryOpenAiTts(clean);
  if (oa) return oa;

  return null;
}

async function tryElevenLabs(text: string): Promise<SpeechResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return null;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
        output_format: "mp3_44100_128",
      }),
    });
    if (!res.ok) {
      console.warn(
        JSON.stringify({
          level: "warn",
          component: "lib/voice",
          message: "ElevenLabs TTS unavailable — falling back",
          status: res.status,
        }),
      );
      return null;
    }
    return {
      audio: Buffer.from(await res.arrayBuffer()),
      contentType: "audio/mpeg",
      provider: "elevenlabs",
    };
  } catch (err) {
    console.warn(
      JSON.stringify({ level: "warn", component: "lib/voice", message: "ElevenLabs TTS error — falling back", error: String(err) }),
    );
    return null;
  }
}

async function tryOpenAiTts(text: string): Promise<SpeechResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(OPENAI_TTS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "alloy",
        input: text,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      console.error(
        JSON.stringify({ level: "error", component: "lib/voice", message: "OpenAI TTS failed", status: res.status }),
      );
      return null;
    }
    return { audio: Buffer.from(await res.arrayBuffer()), contentType: "audio/mpeg", provider: "openai" };
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", component: "lib/voice", message: "OpenAI TTS error", error: String(err) }),
    );
    return null;
  }
}
