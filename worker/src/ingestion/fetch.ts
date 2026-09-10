const USER_AGENT = "GaptureMonitor/1.0 (+regulatory compliance monitoring)";

export class RetrievalError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    cause?: unknown,
  ) {
    super(message);
    this.name = "RetrievalError";
    this.cause = cause;
  }
}

export interface FetchedBinary {
  bytes: Buffer;
  contentType: string;
  finalUrl: string;
}

async function doFetch(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    throw new RetrievalError(
      isAbort ? `Timed out fetching ${url} after ${timeoutMs}ms` : `Network error fetching ${url}`,
      true,
      err,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBinary(
  url: string,
  timeoutMs: number,
  maxBytes: number,
): Promise<FetchedBinary> {
  const res = await doFetch(url, timeoutMs);
  if (!res.ok) {
    throw new RetrievalError(`HTTP ${res.status} fetching ${url}`, res.status >= 500);
  }

  const declaredLength = Number(res.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) {
    throw new RetrievalError(
      `File at ${url} is ${declaredLength} bytes, over the ${maxBytes}-byte limit`,
      false,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  if (bytes.byteLength > maxBytes) {
    throw new RetrievalError(
      `File at ${url} is ${bytes.byteLength} bytes, over the ${maxBytes}-byte limit`,
      false,
    );
  }

  return {
    bytes,
    contentType: (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim(),
    finalUrl: res.url || url,
  };
}

export async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await doFetch(url, timeoutMs);
  if (!res.ok) {
    throw new RetrievalError(`HTTP ${res.status} fetching ${url}`, res.status >= 500);
  }
  return res.text();
}
