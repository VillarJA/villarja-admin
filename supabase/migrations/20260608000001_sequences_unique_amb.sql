-- Fix sequences UNIQUE constraint to include ambiente.
-- Original constraint UNIQUE(company_id, tipo_ecf) prevents a company from having
-- separate sequence rows for certecf vs testecf for the same tipo_ecf.
-- This migration replaces it with UNIQUE(company_id, tipo_ecf, ambiente).

DO $$
BEGIN
  -- Drop the old constraint (name varies by Postgres version; try both forms)
  ALTER TABLE public.sequences
    DROP CONSTRAINT IF EXISTS sequences_company_id_tipo_ecf_key;

  ALTER TABLE public.sequences
    DROP CONSTRAINT IF EXISTS sequences_company_id_tipo_ecf_ambiente_key;

  -- Add the correct constraint
  ALTER TABLE public.sequences
    ADD CONSTRAINT sequences_company_id_tipo_ecf_ambiente_key
    UNIQUE (company_id, tipo_ecf, ambiente);
END $$;

-- Allow anon role to read and update sequences (admin portal uses anon key)
DROP POLICY IF EXISTS "anon_read" ON public.sequences;
CREATE POLICY "anon_read" ON public.sequences
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_write" ON public.sequences;
CREATE POLICY "anon_write" ON public.sequences
  FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
