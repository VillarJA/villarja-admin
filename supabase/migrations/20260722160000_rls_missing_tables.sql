-- =============================================================================
-- RLS gap fix: received_ecf_documents, certification_simulation_cases, and
-- company_dgii_root_certificates were created after 20240531000000_rls.sql /
-- 20260609230000_security_rls_hardening.sql and never received RLS. Confirmed
-- via Supabase Advisor: anon/authenticated had full CRUD grants with zero row
-- policies on all three. Mirrors src/migrations/011_rls_missing_tables.sql.
-- Backend connects as postgres (bypasses RLS) — this only closes the gap for
-- PostgREST/anon/authenticated connections.
-- =============================================================================

ALTER TABLE received_ecf_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_simulation_cases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_dgii_root_certificates  ENABLE ROW LEVEL SECURITY;

-- ─── received_ecf_documents ────────────────────────────────────────────────
DROP POLICY IF EXISTS recv_ecf_select ON received_ecf_documents;
DROP POLICY IF EXISTS recv_ecf_insert ON received_ecf_documents;
DROP POLICY IF EXISTS recv_ecf_update ON received_ecf_documents;

CREATE POLICY recv_ecf_select ON received_ecf_documents FOR SELECT
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY recv_ecf_insert ON received_ecf_documents FOR INSERT
  TO authenticated
  WITH CHECK (company_id = current_company_id());

CREATE POLICY recv_ecf_update ON received_ecf_documents FOR UPDATE
  TO authenticated
  USING (company_id = current_company_id());

-- ─── certification_simulation_cases ────────────────────────────────────────
DROP POLICY IF EXISTS cert_sim_select ON certification_simulation_cases;
DROP POLICY IF EXISTS cert_sim_insert ON certification_simulation_cases;
DROP POLICY IF EXISTS cert_sim_update ON certification_simulation_cases;

CREATE POLICY cert_sim_select ON certification_simulation_cases FOR SELECT
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY cert_sim_insert ON certification_simulation_cases FOR INSERT
  TO authenticated
  WITH CHECK (company_id = current_company_id());

CREATE POLICY cert_sim_update ON certification_simulation_cases FOR UPDATE
  TO authenticated
  USING (company_id = current_company_id());

-- ─── company_dgii_root_certificates ────────────────────────────────────────
DROP POLICY IF EXISTS dgii_root_cert_select ON company_dgii_root_certificates;
DROP POLICY IF EXISTS dgii_root_cert_insert ON company_dgii_root_certificates;
DROP POLICY IF EXISTS dgii_root_cert_update ON company_dgii_root_certificates;

CREATE POLICY dgii_root_cert_select ON company_dgii_root_certificates FOR SELECT
  TO authenticated
  USING (company_id = current_company_id());

CREATE POLICY dgii_root_cert_insert ON company_dgii_root_certificates FOR INSERT
  TO authenticated
  WITH CHECK (company_id = current_company_id());

CREATE POLICY dgii_root_cert_update ON company_dgii_root_certificates FOR UPDATE
  TO authenticated
  USING (company_id = current_company_id());
