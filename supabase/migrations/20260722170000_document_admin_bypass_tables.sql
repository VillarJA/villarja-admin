-- =============================================================================
-- Documentation-only migration: portal_config, subscription_plans,
-- contingencia_cola, and contingencia_eventos already exist in production —
-- created directly against Supabase by villarja-admin (or by hand), never
-- captured by any migration in this repo. CREATE TABLE IF NOT EXISTS below
-- mirrors the live schema exactly (confirmed via information_schema.columns)
-- so `supabase db push` stops drifting and future changes are versioned.
--
-- Note: contingencia_cola/contingencia_eventos are a SEPARATE, Spanish-named
-- table pair from this repo's own contingency_queue/contingency_events
-- (003_contingency.sql) — villarja-admin appears to run its own parallel
-- contingency tracking directly against Supabase rather than this API.
-- Flagged for the villarja-admin/security brief, not resolved here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS portal_config (
  id                  BOOLEAN     PRIMARY KEY DEFAULT true CHECK (id),
  admin_name          TEXT        NOT NULL DEFAULT 'Villar JA — Admin',
  admin_email         TEXT        NOT NULL DEFAULT 'admin@villarja.com',
  razon_social        TEXT        NOT NULL DEFAULT 'Villar JA Data y Tecnología, SRL',
  rnc                 TEXT        NOT NULL DEFAULT '133-29871-4',
  ambiente_activo     TEXT        NOT NULL DEFAULT 'eCF',
  url_recepcion       TEXT        NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/recepcion/api/ecf',
  url_consulta_estado TEXT        NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/consultaestado',
  url_autenticacion   TEXT        NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/autenticacion/api/semilla',
  timeout_recepcion   INTEGER     NOT NULL DEFAULT 30,
  cors_origins        TEXT        NOT NULL DEFAULT 'https://app.villarja.com',
  forzar_https        BOOLEAN     NOT NULL DEFAULT true,
  rate_limiting       BOOLEAN     NOT NULL DEFAULT true,
  tfa_admin           BOOLEAN     NOT NULL DEFAULT true,
  rotacion_llaves     BOOLEAN     NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO portal_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id               TEXT    PRIMARY KEY,
  nombre           TEXT    NOT NULL,
  precio           INTEGER NOT NULL,
  facturas_limite  INTEGER NOT NULL,
  tipos_ecf        TEXT    NOT NULL,
  empresas_limite  INTEGER NOT NULL,
  descripcion      TEXT,
  popular          BOOLEAN DEFAULT false,
  features         TEXT[]  DEFAULT '{}',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contingencia_cola (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID,
  encf             TEXT        NOT NULL,
  intentos         INTEGER     NOT NULL DEFAULT 0,
  proximo_intento  TEXT        NOT NULL DEFAULT '',
  motivo           TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contingencia_eventos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT        NOT NULL,
  evento      TEXT        NOT NULL,
  detalle     TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
