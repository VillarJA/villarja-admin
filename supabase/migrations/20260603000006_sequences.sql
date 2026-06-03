-- NCF sequence ranges assigned to each tenant per e-CF document type
CREATE TABLE IF NOT EXISTS sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo_ecf integer NOT NULL,
  descripcion text NOT NULL,
  secuencia_desde integer NOT NULL,
  secuencia_hasta integer NOT NULL,
  usadas integer NOT NULL DEFAULT 0,
  fecha_vencimiento text NOT NULL,
  UNIQUE (company_id, tipo_ecf)
);

CREATE INDEX IF NOT EXISTS sequences_company_id_idx ON sequences(company_id);

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON sequences;
CREATE POLICY "authenticated" ON sequences
  FOR ALL USING (auth.role() = 'authenticated');
