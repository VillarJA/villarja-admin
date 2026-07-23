CREATE TABLE IF NOT EXISTS company_dgii_root_certificates (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  certificate_pem TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
