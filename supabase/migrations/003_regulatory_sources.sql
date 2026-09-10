-- Migration 003 — Regulatory Sources (+ seed data)
-- Source: Gapture_FT-07_Database_Schema.md §12/§42/§43
-- No FIU row is seeded, per PRD §2.1/§6.3.

CREATE TABLE regulatory_sources (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL CHECK (char_length(name) > 0),
    website_url   TEXT NOT NULL,
    rss_feed_url  TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_regulatory_sources_updated_at
    BEFORE UPDATE ON regulatory_sources
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- rss_feed_url values below were supplied directly by the user (2026-09-10)
-- and should be verified reachable in Phase 4 before the worker relies on them.
INSERT INTO regulatory_sources (code, name, website_url, rss_feed_url, is_active) VALUES
    ('RBI',  'Reserve Bank of India',
             'https://www.rbi.org.in', 'https://rbi.org.in/notifications_rss.xml', true),
    ('SEBI', 'Securities and Exchange Board of India',
             'https://www.sebi.gov.in', 'https://www.sebi.gov.in/sebirss.xml', true);
