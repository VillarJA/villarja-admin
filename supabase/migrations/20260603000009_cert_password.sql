-- Add certificate binary storage and password columns to companies table.
-- Safe to run on any existing schema; IF NOT EXISTS prevents duplicate-column errors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'certificado_data'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN certificado_data TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'certificado_password'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN certificado_password TEXT;
  END IF;
END $$;

-- Reload PostgREST schema cache so new columns are immediately visible via the API
NOTIFY pgrst, 'reload schema';
