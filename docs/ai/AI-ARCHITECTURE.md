# Gapture FT-07 — AI Architecture

How the platform uses LLMs and vector retrieval, and — more importantly — the
guardrails that keep generated output trustworthy. Owed by Phase 9; also
covers Phase 13 (Contextual Q&A). Source rules: `skills/SKILL.md`,
`skills/ai-architecture.md`, BRD RISK-003, HLSA §9–§12, §21.

## The two AI features

| Feature | Phase | Trigger | Output |
|---|---|---|---|
| Regulatory-vs-policy analysis | 9 | worker, when a document reaches `ANALYZING` | 3 immutable `nlp_analyses` fields: `one_line`, `detailed`, `summary`, per organization |
| Contextual Q&A | 13 | user asks a question on a document detail page | one grounded answer + a `contextual_interactions` row |

Both are **retrieval-augmented**: the model never sees the whole corpus, only
a bounded set of chunks retrieved for the specific task, and is instructed to
use nothing else.

## Models

| Role | Model | Notes |
|---|---|---|
| Embeddings | `text-embedding-3-small` @ **1024 dims** | Matches the Pinecone `gaptureai` index (1024, cosine). 3-small emits 1024 natively via the `dimensions` param. Changing this = full re-embed + new index. |
| Chat (analysis + Q&A) | `gpt-5-mini` | Reasoning model: `max_completion_tokens`, no `temperature`. Supports `response_format: json_schema` (strict). Confirmed against the live `/v1/models` list 2026-09-11. Config: `OPENAI_ANALYSIS_MODEL`. |
| Speech-to-text (Phase 14) | OpenAI `gpt-4o-mini-transcribe` | `language=en`. Config: `OPENAI_TRANSCRIBE_MODEL`. |
| Text-to-speech (Phase 14) | ElevenLabs `eleven_flash_v2_5` → OpenAI `gpt-4o-mini-tts` → text-only | ElevenLabs is the architected primary (Tech Stack §29) but unusable on the current free plan (`402`); OpenAI TTS carries it today. MP3, non-streaming. |

Both are called with raw `fetch` — no `openai` SDK — from server-only code
(the worker, or a Next.js Route Handler). Keys are never in a Client
Component.

## Retrieval

Pinecone, one 1024-dim index, two namespaces:

- `regulatory` — one vector per `document_chunks` row. Metadata: `{document_id, chunk_index}`.
- `policy` — one vector per `policy_chunks` row. Metadata: `{organization_id, policy_id, chunk_index}`.

**Pinecone stores only identifiers.** The chunk text lives in Postgres; a
match's `id` (`{parentId}:{chunkIndex}`) is resolved back to
`*_chunks.content` (DB Schema §37). This keeps the vector store free of
transactional/duplicated data and makes Postgres the single source of truth.

**Scoping is a metadata filter, not a convention:**
- Analysis context: `policy` namespace filtered by `organization_id` — a
  document is never compared against another org's policies.
- Q&A regulatory context: `regulatory` namespace filtered by `document_id` —
  a question about document A structurally cannot retrieve document B's text.
- Q&A policy context: `policy` namespace filtered by `organization_id`.

## Guardrails — three layers

Every generated field passes through all three before it is persisted or shown.

### 1. The system prompt

- **Ground everything.** "Use ONLY facts in the CONTEXT. Never introduce a
  clause number, date, monetary threshold, percentage, or penalty that is not
  in the CONTEXT."
- **No context ⇒ no answer.** If the policy context is empty or unrelated,
  the analysis sets `evidence_sufficient: false` / the Q&A sets
  `answered: false`, and the text says so plainly — it does not invent a
  comparison or an answer.
- **"Exists" ≠ "implemented."** Describe only what a policy document *says*;
  never assert the organization actually does it.
- **Preserve uncertainty.** A partial or ambiguous match is reported as such,
  not flattened into a confident verdict.
- **Q&A only:** regulation excerpts are authoritative for what the document
  says; off-topic policy excerpts must be ignored; answers stay scoped to the
  one document being viewed (no general chat).

### 2. Structured output (`response_format: json_schema`, `strict: true`)

The model can only return the exact shape:
- analysis → `{one_line, detailed, summary, evidence_sufficient}`
- Q&A → `{answer, answered}`

No prose outside the JSON, no missing/extra fields.

### 3. A Zod gate before persistence

`analysisOutputSchema` / `qaSchema` re-validate the parsed JSON
(non-empty, length bounds, correct types). A response that fails — including
"the model returned prose instead of JSON" — is **rejected and retried**
(bounded backoff), never persisted. This is the `skills/api-testing-reporting.md`
"malformed AI JSON" failure mode, handled explicitly.

## Retrieval-side guardrails (Q&A)

- **Score floor.** Pinecone matches below `QA_MIN_SCORE` (default cosine
  0.15) are dropped as noise before they can become "context".
- **No usable context ⇒ the model is not called at all.** An explicit
  "couldn't find anything relevant / still processing" answer is returned
  directly.
- **Bounded context.** Top-k per namespace, then per-section character
  budgets, so prompt size and latency stay bounded regardless of corpus size.

## Failure handling (HLSA §21)

- The LLM/embedding/Pinecone calls are wrapped with retry + exponential
  backoff; transient (429/5xx/timeout) is retryable, a 4xx is not.
- Analysis: a per-organization failure holds the whole document at
  `ANALYZING` for the next cycle; already-analysed orgs are skipped on retry
  (no duplicate rows, no premature `COMPLETED`).
- Q&A: a failure surfaces to the user as "temporarily unavailable, try
  again" — never a fabricated answer, never a 500 with a stack trace.
- Notifications are created by a **separate** sweep; a notification failure
  can never roll back or block an analysis.

## What is deliberately NOT done

- No fine-tuning. No agent/tool-use loop. No general-purpose chatbot.
- No "regulatory change detection (old vs new)" as a product feature —
  SHA-256 is used only for fingerprint/dedup/integrity (IMPLEMENTATION-PLAN.md §6).
- No vendor lock beyond OpenAI + Pinecone, both already approved processors.
- No storing regulatory/policy text in Pinecone beyond what similarity search
  needs (ids + minimal metadata).
