-- Add certificate subject (owner name extracted from .p12 CN/O field).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'certificado_subject'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN certificado_subject TEXT;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
