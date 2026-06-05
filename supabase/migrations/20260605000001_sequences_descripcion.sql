-- Add descripcion column to sequences (was missing on legacy schemas where
-- CREATE TABLE IF NOT EXISTS in migration 006 was a no-op).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'descripcion'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN descripcion TEXT NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'secuencia_desde'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN secuencia_desde INTEGER NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'secuencia_hasta'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN secuencia_hasta INTEGER NOT NULL DEFAULT 1000;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'usadas'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN usadas INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sequences' AND column_name = 'fecha_vencimiento'
  ) THEN
    ALTER TABLE public.sequences ADD COLUMN fecha_vencimiento TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
