import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { createServiceClient } from '@/lib/supabase-server';
import { isLegacySchemaMismatch } from '@/lib/company-schema';
import { recordAdminAudit } from '@/lib/admin-audit';

const MAX_CERTIFICATE_BASE64_LENGTH = 3 * 1024 * 1024;

interface CertificateBody {
  certificateBase64?: unknown;
  subject?: unknown;
  vence?: unknown;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => null) as CertificateBody | null;
  const certificateBase64 = typeof body?.certificateBase64 === 'string' ? body.certificateBase64 : '';
  if (!certificateBase64 || certificateBase64.length > MAX_CERTIFICATE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(certificateBase64)) {
    return NextResponse.json({ error: 'Certificado inválido o demasiado grande' }, { status: 400 });
  }

  const { id: companyId } = await params;
  const update: Record<string, unknown> = {
    certificado_data: certificateBase64,
    certificado_estado: 'Vigente',
  };
  if (typeof body?.subject === 'string' && body.subject.length <= 500) update.certificado_subject = body.subject;
  if (typeof body?.vence === 'string' && body.vence.length <= 32) update.certificado_vence = body.vence;

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  try {
    await recordAdminAudit(req, auth.user, 'Subió certificado .p12', companyId);
  } catch (auditError) {
    return NextResponse.json({ error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }
  let { error } = await supabase.from('companies').update(update).eq('id', companyId);
  if (error && isLegacySchemaMismatch(error)) {
    const legacyUpdate = { ...update };
    delete legacyUpdate.certificado_estado;
    ({ error } = await supabase.from('companies').update(legacyUpdate).eq('id', companyId));
  }
  if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true });
}
