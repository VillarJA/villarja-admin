-- Paso 4 simulation: 29 cases (25 auto + 4 manual E32 < 250k) per company per serie.
-- send_order drives execution: Round 4 first (1-4), Round 1 (5-22), Round 2 (23-25), Round 3 RFCE (26-29).

CREATE TABLE IF NOT EXISTS certification_simulation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  serie INTEGER NOT NULL DEFAULT 1,
  caso_prueba TEXT NOT NULL,
  tipo_ecf INTEGER NOT NULL,
  is_rfce BOOLEAN NOT NULL DEFAULT false,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  send_order INTEGER NOT NULL,
  -- pendiente | en_proceso | aceptado | condicional | rechazado | error | manual
  estado TEXT NOT NULL DEFAULT 'pendiente',
  encf TEXT NOT NULL,
  track_id TEXT,
  xml_firmado TEXT,        -- stored for manual cases + all cases after signing
  codigo_seguridad TEXT,   -- first 6 chars of SignatureValue (manual E32 cases)
  dgii_response JSONB,
  error_message TEXT,
  intentos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_cases_lookup
  ON certification_simulation_cases(company_id, serie, send_order);

CREATE INDEX IF NOT EXISTS idx_sim_cases_encf
  ON certification_simulation_cases(company_id, encf);
