-- Migration 008 — Notifications
-- Source: Gapture_FT-07_Database_Schema.md §20/§35.2/§43

CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id      UUID NOT NULL REFERENCES regulatory_documents(id) ON DELETE RESTRICT,
    nlp_analysis_id  UUID REFERENCES nlp_analyses(id) ON DELETE SET NULL,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title            TEXT NOT NULL CHECK (char_length(title) > 0),
    description      TEXT NOT NULL CHECK (char_length(description) > 0),
    is_read          BOOLEAN NOT NULL DEFAULT false,
    read_at          TIMESTAMPTZ CHECK (read_at IS NULL OR is_read = true),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_time ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications (user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_document  ON notifications (document_id);
CREATE INDEX idx_notifications_org       ON notifications (organization_id);

CREATE OR REPLACE FUNCTION set_organization_id_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    NEW.organization_id := (SELECT organization_id FROM profiles WHERE id = NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notifications_set_org
    BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_organization_id_from_profile();
