-- Migration 006 — Compliance Policies & Policy Chunks
-- Source: Gapture_FT-07_Database_Schema.md §17/§43

CREATE TABLE compliance_policies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title            TEXT NOT NULL CHECK (char_length(title) > 0),
    storage_bucket   TEXT NOT NULL,
    storage_path     TEXT NOT NULL,
    mime_type        TEXT,
    file_size_bytes  BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    sha256           CHAR(64) CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
    status           policy_processing_status NOT NULL DEFAULT 'UPLOADED',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_org ON compliance_policies (organization_id);

CREATE UNIQUE INDEX uq_policies_org_sha256
    ON compliance_policies (organization_id, sha256)
    WHERE sha256 IS NOT NULL;

CREATE TRIGGER trg_compliance_policies_updated_at
    BEFORE UPDATE ON compliance_policies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE policy_chunks (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id          UUID NOT NULL REFERENCES compliance_policies(id) ON DELETE CASCADE,
    chunk_index        INTEGER NOT NULL CHECK (chunk_index >= 0),
    content            TEXT NOT NULL CHECK (char_length(content) > 0),
    pinecone_vector_id TEXT,
    embedding_status   chunk_embedding_status NOT NULL DEFAULT 'PENDING',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (policy_id, chunk_index)
);

CREATE UNIQUE INDEX uq_pchunks_pinecone_id
    ON policy_chunks (pinecone_vector_id)
    WHERE pinecone_vector_id IS NOT NULL;

CREATE INDEX idx_pchunks_pending
    ON policy_chunks (embedding_status)
    WHERE embedding_status = 'PENDING';

CREATE TRIGGER trg_policy_chunks_updated_at
    BEFORE UPDATE ON policy_chunks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
