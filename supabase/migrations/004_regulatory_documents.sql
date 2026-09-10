-- Migration 004 — Regulatory Documents & Processing Events
-- Source: Gapture_FT-07_Database_Schema.md §13/§14/§43

CREATE TABLE regulatory_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id           UUID NOT NULL REFERENCES regulatory_sources(id) ON DELETE RESTRICT,
    external_reference  TEXT,
    title               TEXT NOT NULL CHECK (char_length(title) > 0),
    source_url          TEXT NOT NULL,
    file_url            TEXT,
    published_at        TIMESTAMPTZ,
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    retrieved_at        TIMESTAMPTZ,
    sha256              CHAR(64) CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
    storage_bucket      TEXT,
    storage_path        TEXT,
    mime_type           TEXT,
    file_size_bytes     BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    status              document_processing_status NOT NULL DEFAULT 'DETECTED',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_regdocs_source_sha256
    ON regulatory_documents (source_id, sha256)
    WHERE sha256 IS NOT NULL;

CREATE UNIQUE INDEX uq_regdocs_source_extref
    ON regulatory_documents (source_id, external_reference)
    WHERE external_reference IS NOT NULL;

CREATE INDEX idx_regdocs_source  ON regulatory_documents (source_id);
CREATE INDEX idx_regdocs_status  ON regulatory_documents (status);
CREATE INDEX idx_regdocs_created ON regulatory_documents (created_at);

CREATE TRIGGER trg_regulatory_documents_updated_at
    BEFORE UPDATE ON regulatory_documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE document_processing_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES regulatory_documents(id) ON DELETE CASCADE,
    status        document_processing_status NOT NULL,
    error_message TEXT,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_document_time
    ON document_processing_events (document_id, occurred_at DESC);
