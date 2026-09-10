-- Migration 012 — Org-assignment-at-signup
--
-- Resolves the Phase 3 open item flagged in docs/IMPLEMENTATION-PLAN.md:
-- no invite/onboarding flow is defined by any source document (BRD §10.3
-- marks org/role assignment as TBD), so this implements the simplest
-- reasonable option — self-serve organization creation at first login —
-- as a database trigger, so it fires uniformly for both email/password
-- sign-up and Google OAuth sign-up without depending on client-side code
-- running to completion.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    display_name TEXT;
BEGIN
    display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO organizations (name)
    VALUES (display_name || '''s Organization')
    RETURNING id INTO new_org_id;

    INSERT INTO profiles (id, organization_id, display_name)
    VALUES (NEW.id, new_org_id, display_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
