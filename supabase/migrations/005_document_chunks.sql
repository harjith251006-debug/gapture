-- Migration 005 — Document Chunks
-- Source: Gapture_FT-07_Database_Schema.md §16/§43

CREATE TABLE document_chunks (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id        UUID NOT NULL REFERENCES regulatory_documents(id) ON DELETE CASCADE,
    chunk_index        INTEGER NOT NULL CHECK (chunk_index >= 0),
    content            TEXT NOT NULL CHECK (char_length(content) > 0),
    pinecone_vector_id TEXT,
    embedding_status   chunk_embedding_status NOT NULL DEFAULT 'PENDING',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, chunk_index)
);

CREATE UNIQUE INDEX uq_chunks_pinecone_id
    ON document_chunks (pinecone_vector_id)
    WHERE pinecone_vector_id IS NOT NULL;

CREATE INDEX idx_chunks_pending
    ON document_chunks (embedding_status)
    WHERE embedding_status = 'PENDING';

CREATE TRIGGER trg_document_chunks_updated_at
    BEFORE UPDATE ON document_chunks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
