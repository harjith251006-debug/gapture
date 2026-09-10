-- Migration 010 — Row Level Security
-- Source: Gapture_FT-07_Database_Schema.md §35/§43

ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_sources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_policies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_chunks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE nlp_analyses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_interactions    ENABLE ROW LEVEL SECURITY;

-- Global reference/shared data: readable by any authenticated user.
CREATE POLICY regulatory_sources_read ON regulatory_sources
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY regulatory_documents_read ON regulatory_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY document_processing_events_read ON document_processing_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY document_chunks_read ON document_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Organization boundary.
CREATE POLICY organizations_read ON organizations
    FOR SELECT USING (
        id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY profiles_self ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_self_update ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY compliance_policies_org ON compliance_policies
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY policy_chunks_org ON policy_chunks
    FOR SELECT USING (
        policy_id IN (
            SELECT id FROM compliance_policies
            WHERE organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY nlp_analyses_org ON nlp_analyses
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- User boundary.
CREATE POLICY notifications_own ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_own_update ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY contextual_interactions_own ON contextual_interactions
    FOR SELECT USING (user_id = auth.uid());

-- Writes to regulatory_documents, document_processing_events, document_chunks,
-- nlp_analyses, and contextual_interactions (INSERT) are performed by the
-- backend/worker using the Supabase service role, which bypasses RLS by
-- design — no client-facing INSERT policy is defined for these tables.
