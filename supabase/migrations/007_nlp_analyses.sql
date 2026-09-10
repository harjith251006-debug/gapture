-- Migration 007 — NLP Analyses
-- Source: Gapture_FT-07_Database_Schema.md §18/§19/§43

CREATE TABLE nlp_analyses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id      UUID NOT NULL REFERENCES regulatory_documents(id) ON DELETE CASCADE,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    one_line_output  TEXT NOT NULL CHECK (char_length(one_line_output) > 0),
    detailed_output  TEXT NOT NULL CHECK (char_length(detailed_output) > 0),
    summary_output   TEXT NOT NULL CHECK (char_length(summary_output) > 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyses_org_doc_time
    ON nlp_analyses (organization_id, document_id, created_at DESC);
