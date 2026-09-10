# Gapture FT-07 — API Specification

De facto API contract (no external API-Spec document exists — see IMPLEMENTATION-PLAN.md §6).
All routes are Next.js Route Handlers under `apps/web/app/api/`. Built in Phase 10.

## Conventions

- **Auth:** every route requires a valid Supabase session (cookie). No session → `401`.
  There is no public route.
- **Organization scope:** derived server-side from the caller's `profiles.organization_id`.
  A route **never** reads `organization_id` from the request.
- **Response envelope:**
  - success → `{ "data": <payload> }`, plus `"nextCursor": string | null` on paginated lists
  - failure → `{ "error": { "code": string, "message": string } }`
- **Error codes → HTTP:** `unauthorized` 401 · `forbidden` 403 · `not_found` 404 ·
  `bad_request` 400 · `conflict` 409 · `unsupported_media_type` 415 · `payload_too_large` 413 ·
  `upstream_error` 502 · `internal` 500. Raw Postgres/Supabase errors are logged server-side
  only, never returned.
- **Pagination:** keyset on `(created_at, id)` descending. `?limit=` (1–50, default 20),
  `?cursor=` is the opaque `nextCursor` from the previous page. Absent `nextCursor` (or `null`)
  means the last page.
- **Validation:** every body / query param is Zod-validated; failure → `400 bad_request`.

## Endpoints

### `GET /api/documents`
Keyset list of regulatory documents with their source (one round trip, `INNER JOIN regulatory_sources`).
Regulatory documents are global reference data — session-required but not org-scoped.

`data[]`: `{ id, title, status, publishedAt, source: { code, name } | null }`

### `GET /api/documents/[id]`
Document detail + the latest NLP analysis **for the caller's organization**, via the
`get_document_with_latest_analysis` RPC (one round trip). `400` on a non-uuid id, `404` if unknown.

`data`: `{ id, title, status, source: { code, name } | null, analysis: { oneLine, detailed, summary, analyzedAt } | null }`

### `GET /api/notifications`
The notification feed — keyset, zero-join (`title`/`description` are denormalized). RLS scopes
rows to `user_id = auth.uid()`.

`data[]`: `{ id, documentId, nlpAnalysisId, title, description, isRead, createdAt }`

### `PATCH /api/notifications/[id]/read`
Body: `{ "isRead": boolean }` (optional, default `true`). Mutates `is_read` / `read_at` only,
on the caller's own rows. `404` if the id is not the caller's notification.

`data`: `{ id, isRead, readAt }`

### `GET /api/notifications/unread-count`
`data`: `{ unread: number }` — `HEAD`+count on the `idx_notifications_unread` partial index.

### `POST /api/policies`
`multipart/form-data`: `file` (required; PDF / text / Markdown / PNG / JPEG, ≤ 10 MB),
`title` (optional). Stores the AES-encrypted original, dedupes on `(organization_id, sha256)`,
inserts an `UPLOADED` row. `409` if the same file already exists for the org. `201` on success.

`data`: `{ id, title, status, createdAt, warning: string | null }`

### `GET /api/policies`
`data[]`: `{ id, title, status, createdAt }` — the caller's organization's policies (RLS-scoped).

### `POST /api/qa`
Body: `{ "documentId": uuid, "question": string (3–2000 chars) }`. Retrieves regulatory context
(that document) + policy context (the caller's org) from Pinecone, answers with an LLM grounded
**only** in retrieved text, and persists the Q&A pair to `contextual_interactions`. Empty
retrieval → `answered: false` with an explicit "cannot answer" — never model general knowledge.
`201` on success.

`data`: `{ id, documentId, question, answer, answered, createdAt }`

### `GET /api/qa/history?documentId=<uuid>`
This user's Q&A history for one document (`idx_interactions_user_doc_time`, newest first,
up to 50). RLS scopes to `user_id = auth.uid()`.

`data[]`: `{ id, question, answer, createdAt }`

## Not yet covered

- Voice endpoints (Phase 14).
- A persistent automated test suite (Phase 19).
