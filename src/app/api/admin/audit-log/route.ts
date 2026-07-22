import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { recordAdminAudit } from '@/lib/admin-audit';

export async function POST(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => null) as { accion?: unknown; objeto?: unknown } | null;
  const accion = typeof body?.accion === 'string' ? body.accion.trim() : '';
  const objeto = typeof body?.objeto === 'string' ? body.objeto.trim() : '';
  if (!accion || accion.length > 200 || objeto.length > 500) {
    return NextResponse.json({ error: 'Datos de auditoría inválidos' }, { status: 400 });
  }

  try {
    await recordAdminAudit(req, auth.user, accion, objeto);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }
  return NextResponse.json({ success: true }, { status: 201 });
}
