-- DGII certification test cases
-- Each row is one test case from the DGII-provided Excel set.
-- e-NCFs are pre-assigned by DGII; the portal must use them verbatim.
CREATE TABLE IF NOT EXISTS certification_cases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID        NOT NULL,
  caso_prueba   TEXT        NOT NULL,
  tipo_ecf      INTEGER     NOT NULL,
  encf          TEXT        NOT NULL,
  estado        TEXT        NOT NULL DEFAULT 'pending',  -- pending|sent|accepted|rejected|error
  track_id      TEXT,
  error_msg     TEXT,
  test_data     JSONB       NOT NULL,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, encf)
);

CREATE INDEX IF NOT EXISTS idx_cert_cases_company
  ON certification_cases (company_id, estado);
