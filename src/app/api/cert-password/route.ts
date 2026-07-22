import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { createServiceClient } from '@/lib/supabase-server';
import { recordAdminAudit } from '@/lib/admin-audit';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES = 16;

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
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

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

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  }
  try {
    await recordAdminAudit(req, auth.user, 'Actualizó contraseña de certificado', companyId);
  } catch (auditError) {
    return NextResponse.json({ error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }

  const { error } = await supabase
    .from('companies')
    .update({ cert_password_encrypted: encrypted, certificado_password: null })
    .eq('id', companyId);

  if (error) {
    return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
