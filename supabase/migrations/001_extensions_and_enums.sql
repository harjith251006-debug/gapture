-- Migration 001 — Extensions and ENUM types
-- Source: Gapture_FT-07_Database_Schema.md §22/§43

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE document_processing_status AS ENUM (
    'DETECTED', 'RETRIEVED', 'OCR_PROCESSING', 'SECURED', 'STORED',
    'CLEANING', 'INDEXING', 'ANALYZING', 'COMPLETED', 'FAILED'
);

CREATE TYPE policy_processing_status AS ENUM (
    'UPLOADED', 'CLEANING', 'INDEXING', 'COMPLETED', 'FAILED'
);

CREATE TYPE chunk_embedding_status AS ENUM (
    'PENDING', 'EMBEDDED', 'FAILED'
);

-- Shared utility: maintain updated_at on every table that has one.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
