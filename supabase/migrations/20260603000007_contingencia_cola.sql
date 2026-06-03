-- Documents queued for retry during DGII contingency mode
CREATE TABLE IF NOT EXISTS contingencia_cola (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  encf text NOT NULL,
  intentos integer NOT NULL DEFAULT 0,
  proximo_intento text NOT NULL DEFAULT '',
  motivo text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contingencia_cola_company_id_idx ON contingencia_cola(company_id);
CREATE INDEX IF NOT EXISTS contingencia_cola_created_at_idx ON contingencia_cola(created_at ASC);

ALTER TABLE contingencia_cola ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON contingencia_cola;
CREATE POLICY "authenticated" ON contingencia_cola
  FOR ALL USING (auth.role() = 'authenticated');
