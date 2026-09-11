import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { requireSession } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/demo/run — "Run Live Demo". Spawns the worker's demo CLI
 * (`worker/src/demo/run-demo-cli.ts`) as a child process — the exact same
 * execution model as the production worker (`worker/src/index.ts --once`),
 * just triggered on demand instead of by the poll timer. It runs the real
 * production pipeline functions (see run-demo.ts) against the real,
 * currently-configured RBI/SEBI RSS feeds; nothing here reimplements OCR,
 * cleaning, embedding, analysis, or notification logic.
 *
 * Streams the child's demo-progress NDJSON lines straight through to the
 * browser as they're produced (one JSON object per line) so the frontend can
 * show live progress instead of blocking on one multi-minute response.
 * Internal pipeline log lines (createLogger's own JSON output) are drained
 * from stdout but not relayed — only lines shaped like
 * `{"type":"demo-progress", ...}` are forwarded.
 *
 * Assumes the monorepo's standard layout (apps/web and worker as siblings);
 * override with WORKER_DIR if the deployment layout ever differs.
 */
const WORKER_DIR = process.env.WORKER_DIR ?? resolve(process.cwd(), "..", "..", "worker");
const DEMO_CLI_ENTRY = resolve(WORKER_DIR, "src", "demo", "run-demo-cli.ts");

export async function POST() {
  await requireSession(); // any authenticated user may trigger the demo — same bar as the rest of the app

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const child = spawn(process.execPath, ["--import", "tsx/esm", DEMO_CLI_ENTRY], {
        cwd: WORKER_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const rl = createInterface({ input: child.stdout });
      rl.on("line", (line) => {
        let event: { type?: string } | null = null;
        try {
          event = JSON.parse(line);
        } catch {
          return; // not JSON — ignore
        }
        if (event?.type === "demo-progress") {
          controller.enqueue(encoder.encode(`${line}\n`));
        }
      });

      // Drain stderr (internal warn/error logs) so the child never blocks on
      // a full pipe; not relayed to the client — run-demo.ts already yields
      // an explicit demo-progress event with the real reason for every
      // failure path, so nothing meaningful is lost.
      child.stderr.resume();

      child.on("error", (err) => {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({ type: "demo-progress", stage: "error", message: `Could not start the demo process: ${err.message}`, ok: false })}\n`,
          ),
        );
        close();
      });

      child.on("close", () => {
        close();
      });
    },
    cancel() {
      // Client disconnected — nothing else to clean up; the child process
      // finishes its run and its own DB writes regardless (same as any
      // other fire-and-forget worker sweep).
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
