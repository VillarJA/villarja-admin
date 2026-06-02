-- Contingency event history
CREATE TABLE IF NOT EXISTS contingencia_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('ok', 'cont')),
  evento text NOT NULL,
  detalle text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contingencia_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "authenticated" ON contingencia_eventos
  FOR ALL USING (auth.role() = 'authenticated');
