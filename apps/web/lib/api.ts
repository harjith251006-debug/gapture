import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared API-layer helpers (plan Phase 10 task 9): one response envelope for
 * every route, session validation, org resolution, and a wrapper that
 * guarantees no raw Postgres/Supabase error text ever reaches the client.
 *
 * Envelope:
 *   success  -> { data: <payload> }              (+ nextCursor on paged lists)
 *   failure  -> { error: { code, message } }
 */

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "conflict"
  | "unsupported_media_type"
  | "payload_too_large"
  | "internal"
  | "upstream_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  bad_request: 400,
  conflict: 409,
  unsupported_media_type: 415,
  payload_too_large: 413,
  internal: 500,
  upstream_error: 502,
};

export function ok<T>(data: T, extra?: Record<string, unknown>, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data, ...extra }, init);
}

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}

/**
 * Wrap a route handler: unhandled throws become a clean 500, `ApiError`
 * becomes its mapped status, and the real error is logged server-side only.
 */
export function route(
  component: string,
  handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return apiError(err.code, err.message);
      }
      console.error(
        JSON.stringify({
          level: "error",
          component,
          message: "unhandled route error",
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        }),
      );
      return apiError("internal", "Something went wrong");
    }
  };
}

export interface SessionContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  userEmail: string | undefined;
}

/** Validate the session server-side (plan task 10). Throws ApiError(401) if absent. */
export async function requireSession(): Promise<SessionContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError("unauthorized", "Sign in to continue");
  return { supabase, userId: user.id, userEmail: user.email };
}

/** The caller's organization id — always derived server-side, never from the request (plan task 10). */
export async function requireOrganizationId(session: SessionContext): Promise<string> {
  const { data } = await session.supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", session.userId)
    .single();
  const orgId = (data?.organization_id as string | undefined) ?? null;
  if (!orgId) throw new ApiError("forbidden", "No organization is associated with this account");
  return orgId;
}

export function parseJsonBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError("bad_request", result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  }
  return result.data;
}

export function parseQuery<T>(schema: z.ZodType<T>, url: string): T {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError("bad_request", result.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`).join("; "));
  }
  return result.data;
}

// --- Keyset pagination on (created_at, id), newest first ------------------

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export interface Cursor {
  createdAt: string;
  id: string;
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.createdAt === "string" && typeof parsed?.id === "string") {
      return parsed as Cursor;
    }
  } catch {
    // fall through
  }
  throw new ApiError("bad_request", "Invalid pagination cursor");
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Apply a `(created_at, id) < (cursor)` keyset predicate to a supabase-js
 * query builder (PostgREST has no native row-value comparison).
 */
export function applyKeyset<Q extends { or: (f: string) => Q; order: (c: string, o: { ascending: boolean }) => Q; limit: (n: number) => Q }>(
  query: Q,
  cursor: Cursor | null,
  limit: number,
): Q {
  let q = query;
  if (cursor) {
    q = q.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }
  return q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
}

/** Given `limit+1` rows, split off the extra and build the next cursor. */
export function pageResult<T extends { id: string; created_at: string }>(
  rows: T[],
  limit: number,
): { page: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { page: rows, nextCursor: null };
  const page = rows.slice(0, limit);
  const last = page[page.length - 1]!;
  return { page, nextCursor: encodeCursor({ createdAt: last.created_at, id: last.id }) };
}
