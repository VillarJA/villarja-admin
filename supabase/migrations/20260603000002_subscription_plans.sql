-- Subscription plans catalog
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  precio integer NOT NULL,
  facturas_limite integer NOT NULL,
  tipos_ecf text NOT NULL,
  empresas_limite integer NOT NULL,
  descripcion text,
  popular boolean DEFAULT false,
  features text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated" ON subscription_plans;
CREATE POLICY "authenticated" ON subscription_plans
  FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO subscription_plans (id, nombre, precio, facturas_limite, tipos_ecf, empresas_limite, descripcion, popular, features)
VALUES
  (
    'basico', 'Básico', 2500, 500, '31, 32, 34', 1,
    'Para emisores de bajo volumen', false,
    ARRAY['500 e-CF / mes', 'Tipos 31, 32, 34', '1 empresa (RNC)', 'Soporte por correo', 'Ambiente testeCF + eCF']
  ),
  (
    'pro', 'Pro', 8900, 5000, '31, 32, 33, 34, 41, 43', 3,
    'El más elegido por las PYMEs', true,
    ARRAY['5,000 e-CF / mes', 'Tipos 31–34, 41, 43', 'Hasta 3 empresas', 'Soporte prioritario', 'Webhooks + reportes', 'Contingencia automática']
  ),
  (
    'enterprise', 'Enterprise', 29500, 50000, 'Todos los tipos e-CF', 25,
    'Alto volumen y multi-empresa', false,
    ARRAY['50,000 e-CF / mes', 'Todos los tipos e-CF', 'Hasta 25 empresas', 'SLA 99.9% + soporte 24/7', 'Gerente de cuenta', 'Integración dedicada']
  )
ON CONFLICT DO NOTHING;
