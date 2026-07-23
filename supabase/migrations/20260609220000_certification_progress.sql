-- 20260609220000_certification_progress.sql
-- Track per-company DGII e-CF certification progress.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS certification_status          TEXT    NOT NULL DEFAULT 'no_iniciada',
  ADD COLUMN IF NOT EXISTS certification_completed_steps JSONB   NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certification_notes           TEXT;
