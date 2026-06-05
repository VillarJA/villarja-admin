-- Add columns that migration 004 (CREATE TABLE IF NOT EXISTS) skipped on legacy deployments.
-- When the companies table already existed, the entire CREATE TABLE was a no-op,
-- leaving these columns absent from any schema created before this portal's migrations ran.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'certificado_estado'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN certificado_estado text NOT NULL DEFAULT 'Pendiente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'certificado_vence'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN certificado_vence text NOT NULL DEFAULT '—';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'facturas_mes'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN facturas_mes integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Reload PostgREST schema cache so the new columns are immediately visible via the API.
NOTIFY pgrst, 'reload schema';
