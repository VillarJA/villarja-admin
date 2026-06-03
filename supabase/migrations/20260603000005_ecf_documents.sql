-- Electronic fiscal documents (e-CF) emitted by tenants
CREATE TABLE IF NOT EXISTS ecf_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  encf text NOT NULL UNIQUE,
  tipo_ecf integer NOT NULL,
  monto numeric(18,2) NOT NULL DEFAULT 0,
  itbis numeric(18,2) NOT NULL DEFAULT 0,
  monto_total numeric(18,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pending'
    CHECK (estado IN ('accepted', 'sent', 'rejected', 'pending', 'draft', 'contingency')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecf_documents_company_id_idx ON ecf_documents(company_id);
CREATE INDEX IF NOT EXISTS ecf_documents_created_at_idx ON ecf_documents(created_at DESC);

ALTER TABLE ecf_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON ecf_documents;
CREATE POLICY "authenticated" ON ecf_documents
  FOR ALL USING (auth.role() = 'authenticated');
