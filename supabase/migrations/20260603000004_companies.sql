-- Tenant companies registered in the portal
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rnc text NOT NULL UNIQUE,
  razon_social text NOT NULL,
  nombre_comercial text NOT NULL,
  plan text NOT NULL DEFAULT 'Pro'
    CHECK (plan IN ('Básico', 'Pro', 'Enterprise')),
  estado text NOT NULL DEFAULT 'Pendiente'
    CHECK (estado IN ('Activo', 'Suspendido', 'Pendiente')),
  ambiente text NOT NULL DEFAULT 'eCF'
    CHECK (ambiente IN ('testeCF', 'certeCF', 'eCF')),
  facturas_mes integer NOT NULL DEFAULT 0,
  certificado_estado text NOT NULL DEFAULT 'Pendiente',
  certificado_vence text NOT NULL DEFAULT '—',
  api_key text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON companies;
CREATE POLICY "authenticated" ON companies
  FOR ALL USING (auth.role() = 'authenticated');
