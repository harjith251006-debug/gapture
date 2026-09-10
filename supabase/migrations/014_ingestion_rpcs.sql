-- Migration 014 — Ingestion pipeline RPC
--
-- The document-processing worker needs "advance the document's status AND
-- record a processing event" to happen atomically (DB Schema §31 — a
-- document must never be left, e.g., STORED without a matching event, or
-- vice versa). supabase-js's REST layer can't do a multi-statement
-- transaction, so this is exposed as a single database function instead.
--
-- SECURITY DEFINER: called by the worker via the service role, which
-- already bypasses RLS — this just bundles the two writes.

CREATE OR REPLACE FUNCTION advance_document_status(
    p_document_id     UUID,
    p_new_status      document_processing_status,
    p_error_message   TEXT        DEFAULT NULL,
    p_sha256          CHAR(64)    DEFAULT NULL,
    p_storage_bucket  TEXT        DEFAULT NULL,
    p_storage_path    TEXT        DEFAULT NULL,
    p_mime_type       TEXT        DEFAULT NULL,
    p_file_size_bytes BIGINT      DEFAULT NULL,
    p_file_url        TEXT        DEFAULT NULL,
    p_retrieved_at    TIMESTAMPTZ DEFAULT NULL
)
RETURNS regulatory_documents AS $$
DECLARE
    updated regulatory_documents;
BEGIN
    UPDATE regulatory_documents SET
        status          = p_new_status,
        sha256          = COALESCE(p_sha256, sha256),
        storage_bucket  = COALESCE(p_storage_bucket, storage_bucket),
        storage_path    = COALESCE(p_storage_path, storage_path),
        mime_type       = COALESCE(p_mime_type, mime_type),
        file_size_bytes = COALESCE(p_file_size_bytes, file_size_bytes),
        file_url        = COALESCE(p_file_url, file_url),
        retrieved_at    = COALESCE(p_retrieved_at, retrieved_at)
    WHERE id = p_document_id
    RETURNING * INTO updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'regulatory_document % not found', p_document_id;
    END IF;

    INSERT INTO document_processing_events (document_id, status, error_message)
    VALUES (p_document_id, p_new_status, p_error_message);

    RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
