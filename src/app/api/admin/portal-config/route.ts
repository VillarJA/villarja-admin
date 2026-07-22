import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { createServiceClient } from '@/lib/supabase-server';
import { recordAdminAudit } from '@/lib/admin-audit';

const FIELDS = [
  'admin_name', 'admin_email', 'razon_social', 'rnc', 'ambiente_activo',
  'url_recepcion', 'url_consulta_estado', 'url_autenticacion', 'timeout_recepcion',
  'cors_origins', 'forzar_https', 'rate_limiting', 'tfa_admin', 'rotacion_llaves',
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });

  const { data, error } = await supabase.from('portal_config').select('*').eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });

  const values: Record<string, unknown> = { id: true, updated_at: new Date().toISOString() };
  for (const field of FIELDS) {
    if (field in (body as Record<string, unknown>)) values[field] = (body as Record<string, unknown>)[field];
  }

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  try {
    await recordAdminAudit(req, auth.user, 'Actualizó configuración del portal', 'portal_config');
  } catch (auditError) {
    return NextResponse.json({ error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }
  const { error } = await supabase.from('portal_config').upsert(values);
  if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true });
}
