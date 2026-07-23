-- Add `estado` column to companies to support admin-portal activation flow.
-- The legacy schema stored activation state only in `activa` (boolean) and
-- optionally in `notas` as [portal_estado:Activo/Suspendido/Pendiente].
-- Modern admin-portal builds read/write `estado` directly.
--
-- This migration is safe to run multiple times (IF NOT EXISTS).
-- Existing rows are backfilled from `notas` legacy markers or from `activa`.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS estado TEXT;

UPDATE companies
SET estado = CASE
  WHEN notas LIKE '%[portal_estado:Pendiente]%'   THEN 'Pendiente'
  WHEN notas LIKE '%[portal_estado:Suspendido]%'  THEN 'Suspendido'
  WHEN activa = true                               THEN 'Activo'
  ELSE                                                  'Pendiente'
END
WHERE estado IS NULL;
