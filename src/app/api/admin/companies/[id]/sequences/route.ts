import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { createServiceClient } from '@/lib/supabase-server';
import { ECF_TYPES } from '@/lib/data';
import { recordAdminAudit } from '@/lib/admin-audit';

interface SequenceInput {
  tipoEcf?: unknown;
  desde?: unknown;
  hasta?: unknown;
  fechaVencimiento?: unknown;
  ambiente?: unknown;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => null) as SequenceInput | null;
  const tipoEcf = Number(body?.tipoEcf);
  const desde = Number(body?.desde);
  const hasta = Number(body?.hasta);
  const fechaVencimiento = typeof body?.fechaVencimiento === 'string' ? body.fechaVencimiento : '';
  const ambiente = typeof body?.ambiente === 'string' ? body.ambiente.toLowerCase() : '';
  if (!Number.isInteger(tipoEcf) || !Number.isInteger(desde) || !Number.isInteger(hasta)
    || desde < 1 || hasta < desde || !fechaVencimiento || !['testecf', 'certecf', 'ecf'].includes(ambiente)) {
    return NextResponse.json({ error: 'Datos de secuencia inválidos' }, { status: 400 });
  }

  const { id: companyId } = await params;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  try {
    await recordAdminAudit(req, auth.user, `Creó secuencia e-NCF tipo ${tipoEcf} (${ambiente})`, companyId);
  } catch (auditError) {
    return NextResponse.json({ error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }
  const { error } = await supabase.from('sequences').insert({
    company_id: companyId,
    tipo_ecf: tipoEcf,
    descripcion: ECF_TYPES[tipoEcf] ?? '',
    secuencia_desde: desde,
    secuencia_hasta: hasta,
    usadas: 0,
    fecha_vencimiento: fechaVencimiento,
    ambiente,
  });
  if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
