import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 16;
const TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.CERT_ENCRYPTION_KEY;
  if (!raw) throw new Error('CERT_ENCRYPTION_KEY no está configurada en el servidor');
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptPassword(password: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [iv (16)] [tag (16)] [ciphertext] — matches certificate.service.ts
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export async function POST(req: NextRequest) {
  let companyId: string;
  let password: string;

  try {
    ({ companyId, password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!companyId || !password) {
    return NextResponse.json({ error: 'companyId y password son requeridos' }, { status: 400 });
  }

  let encrypted: string;
  try {
    encrypted = encryptPassword(password);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de encriptación' },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error } = await supabase
    .from('companies')
    .update({ cert_password_encrypted: encrypted, certificado_password: null })
    .eq('id', companyId);

  if (error) {
    return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
