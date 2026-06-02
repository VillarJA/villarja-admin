-- Portal configuration (single-row table)
CREATE TABLE IF NOT EXISTS portal_config (
  id boolean PRIMARY KEY DEFAULT true,
  CONSTRAINT single_row CHECK (id = true),
  admin_name text NOT NULL DEFAULT 'Villar JA — Admin',
  admin_email text NOT NULL DEFAULT 'admin@villarja.com',
  razon_social text NOT NULL DEFAULT 'Villar JA Data y Tecnología, SRL',
  rnc text NOT NULL DEFAULT '133-29871-4',
  ambiente_activo text NOT NULL DEFAULT 'eCF',
  url_recepcion text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/recepcion/api/ecf',
  url_consulta_estado text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/consultaestado',
  url_autenticacion text NOT NULL DEFAULT 'https://ecf.dgii.gov.do/fe/autenticacion/api/semilla',
  timeout_recepcion integer NOT NULL DEFAULT 30,
  cors_origins text NOT NULL DEFAULT 'https://app.villarja.com',
  forzar_https boolean NOT NULL DEFAULT true,
  rate_limiting boolean NOT NULL DEFAULT true,
  tfa_admin boolean NOT NULL DEFAULT true,
  rotacion_llaves boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO portal_config (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE portal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "authenticated" ON portal_config
  FOR ALL USING (auth.role() = 'authenticated');
