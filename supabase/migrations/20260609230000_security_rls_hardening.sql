-- =============================================================================
-- Security hardening: fix RLS issues flagged by Supabase Advisor
-- 1. Enable RLS on tables missing it (admins, certification_cases, usage_monthly)
-- 2. Remove overbroad catch-all 'authenticated' ALL policies that bypass
--    company-scoped isolation on companies, ecf_documents, audit_log, sequences
-- =============================================================================

-- ── admins ────────────────────────────────────────────────────────────────────
-- Backend uses postgres superuser (bypasses RLS). PostgREST must never reach
-- this table — deny all access via the anon/authenticated roles.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE allowed through PostgREST or Supabase client.
-- Backend connects as postgres (service role) and is not affected by these policies.
CREATE POLICY admins_deny_all ON admins
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false);

-- ── usage_monthly ─────────────────────────────────────────────────────────────
-- Has company_id — apply the same company-scoped pattern as other tables.
ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_select ON usage_monthly
  FOR SELECT
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY usage_insert ON usage_monthly
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = current_company_id());

CREATE POLICY usage_update ON usage_monthly
  FOR UPDATE
  TO authenticated
  USING (company_id = current_company_id());

-- ── certification_cases ───────────────────────────────────────────────────────
-- Has company_id — apply company-scoped policies (same pattern as ecf_documents).
ALTER TABLE certification_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_select ON certification_cases
  FOR SELECT
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY cc_insert ON certification_cases
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = current_company_id());

CREATE POLICY cc_update ON certification_cases
  FOR UPDATE
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY cc_delete ON certification_cases
  FOR DELETE
  TO authenticated
  USING (company_id = current_company_id());

-- ── Remove overbroad catch-all policies ───────────────────────────────────────
-- These PERMISSIVE ALL policies match any authenticated user and, because
-- PostgreSQL ORs PERMISSIVE policies, they override the narrower company-scoped
-- policies, allowing cross-company data access via PostgREST.
-- The backend and admin portal both use postgres/service-role which bypass RLS,
-- so removing these does not affect normal operations.

DROP POLICY IF EXISTS authenticated ON companies;
DROP POLICY IF EXISTS authenticated ON ecf_documents;
DROP POLICY IF EXISTS authenticated ON audit_log;
DROP POLICY IF EXISTS authenticated ON sequences;
DROP POLICY IF EXISTS authenticated ON portal_config;
DROP POLICY IF EXISTS authenticated ON subscription_plans;
DROP POLICY IF EXISTS authenticated ON contingencia_cola;
DROP POLICY IF EXISTS authenticated ON contingencia_eventos;
