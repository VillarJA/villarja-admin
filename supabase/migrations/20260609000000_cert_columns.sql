-- Add admin portal certificate columns (IF NOT EXISTS for idempotency).
-- These columns are written by villarja-admin-portal directly to Supabase.
-- certificado_password is legacy plain-text; the API auto-migrates to cert_password_encrypted on first read.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificado_data     TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificado_password TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificado_estado   TEXT DEFAULT 'Pendiente';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificado_subject  TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS certificado_vence    TEXT;
