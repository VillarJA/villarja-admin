-- Add ambiente column to sequences table so the API can pick the right
-- sequence range per environment (testeCF / certeCF / eCF).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'ambiente'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN ambiente TEXT NOT NULL DEFAULT 'certecf';
  END IF;
END $$;
