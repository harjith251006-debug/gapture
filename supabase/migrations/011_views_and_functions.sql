-- Migration 011 — Views and Functions
-- Source: Gapture_FT-07_Database_Schema.md §34/§43

CREATE VIEW regulatory_document_latest_analysis AS
SELECT DISTINCT ON (a.document_id, a.organization_id)
    a.document_id,
    a.organization_id,
    a.id            AS analysis_id,
    a.one_line_output,
    a.detailed_output,
    a.summary_output,
    a.created_at    AS analyzed_at
FROM nlp_analyses a
ORDER BY a.document_id, a.organization_id, a.created_at DESC;

-- Proposed RPC: one round trip for the document detail page.
CREATE OR REPLACE FUNCTION get_document_with_latest_analysis(
    p_document_id UUID,
    p_organization_id UUID
)
RETURNS TABLE (
    document_id     UUID,
    title           TEXT,
    status          document_processing_status,
    source_code     TEXT,
    source_name     TEXT,
    one_line_output TEXT,
    detailed_output TEXT,
    summary_output  TEXT,
    analyzed_at     TIMESTAMPTZ
) AS $$
    SELECT
        d.id,
        d.title,
        d.status,
        s.code,
        s.name,
        a.one_line_output,
        a.detailed_output,
        a.summary_output,
        a.analyzed_at
    FROM regulatory_documents d
    INNER JOIN regulatory_sources s ON s.id = d.source_id
    LEFT JOIN regulatory_document_latest_analysis a
        ON a.document_id = d.id AND a.organization_id = p_organization_id
    WHERE d.id = p_document_id;
$$ LANGUAGE sql STABLE SECURITY INVOKER;
