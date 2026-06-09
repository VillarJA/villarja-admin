-- Defer e-NCF sequence assignment from draft creation to transmission time.
-- Sequences are now consumed only when a document is actually sent to DGII,
-- preventing waste of fiscal sequence numbers on cancelled drafts (DGII Norma 06-18).

-- Allow draft documents to exist without an assigned e-NCF
ALTER TABLE ecf_documents ALTER COLUMN encf DROP NOT NULL;

-- Store original request payload so sendECFToDGII can build the XML and assign
-- the sequence at transmission time
ALTER TABLE ecf_documents ADD COLUMN IF NOT EXISTS draft_body JSONB;
