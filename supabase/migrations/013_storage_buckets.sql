-- Migration 013 — Storage Buckets & Access Policies
-- Source: Gapture_FT-07_Database_Schema.md §36; docs/IMPLEMENTATION-PLAN.md Phase 3
--
-- Two buckets:
--   regulatory-documents  — global reference data, readable by any
--                            authenticated user (mirrors the
--                            regulatory_documents table's RLS boundary).
--                            Writes are service-role-only (the worker).
--   compliance-policies   — org-scoped. Path convention:
--                            {organization_id}/{policy_id}/{filename}
--                            so storage policies can check the path prefix
--                            without a join back to compliance_policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
    ('regulatory-documents', 'regulatory-documents', false, null),
    ('compliance-policies',  'compliance-policies',  false, null)
ON CONFLICT (id) DO NOTHING;

-- regulatory-documents: read-only for any authenticated user; no client
-- INSERT/UPDATE/DELETE policy — those happen via the worker's service role,
-- which bypasses RLS/Storage policies entirely (mirrors DB Schema §35's
-- "no client-facing INSERT policy" pattern for regulatory_documents itself).
CREATE POLICY regulatory_documents_bucket_read ON storage.objects
    FOR SELECT
    USING (bucket_id = 'regulatory-documents' AND auth.role() = 'authenticated');

-- compliance-policies: org-scoped by the first path segment.
CREATE POLICY compliance_policies_bucket_read ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'compliance-policies'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY compliance_policies_bucket_insert ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'compliance-policies'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY compliance_policies_bucket_delete ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'compliance-policies'
        AND (storage.foldername(name))[1] = (
            SELECT organization_id::text FROM profiles WHERE id = auth.uid()
        )
    );
