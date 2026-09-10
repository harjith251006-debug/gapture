-- Migration 009 — Contextual Interactions
-- Source: Gapture_FT-07_Database_Schema.md §21/§43

CREATE TABLE contextual_interactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id      UUID NOT NULL REFERENCES regulatory_documents(id) ON DELETE CASCADE,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    question_text    TEXT NOT NULL CHECK (char_length(question_text) > 0),
    answer_text      TEXT NOT NULL CHECK (char_length(answer_text) > 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_user_doc_time
    ON contextual_interactions (user_id, document_id, created_at DESC);
CREATE INDEX idx_interactions_org
    ON contextual_interactions (organization_id);

CREATE TRIGGER trg_interactions_set_org
    BEFORE INSERT ON contextual_interactions
    FOR EACH ROW EXECUTE FUNCTION set_organization_id_from_profile();
