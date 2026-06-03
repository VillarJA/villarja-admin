-- Admin action audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  accion text NOT NULL,
  objeto text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON audit_log;
CREATE POLICY "authenticated" ON audit_log
  FOR ALL USING (auth.role() = 'authenticated');
