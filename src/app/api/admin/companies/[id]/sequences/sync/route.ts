import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { createServiceClient } from '@/lib/supabase-server';
import { recordAdminAudit } from '@/lib/admin-audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const { id: companyId } = await params;
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  try {
    await recordAdminAudit(req, auth.user, 'Sincronizó contadores de secuencias e-NCF', companyId);
  } catch (auditError) {
    return NextResponse.json({ error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }

  const [{ data: docs, error: docsError }, { data: sequences, error: seqError }] = await Promise.all([
    supabase.from('ecf_documents').select('tipo_ecf').eq('company_id', companyId).neq('estado', 'draft'),
    supabase.from('sequences').select('tipo_ecf, ambiente').eq('company_id', companyId),
  ]);
  if (docsError || seqError) return NextResponse.json({ error: `DB: ${(docsError ?? seqError)?.message}` }, { status: 500 });

  const counts: Record<number, number> = {};
  for (const document of docs ?? []) {
    const tipo = Number(document.tipo_ecf);
    counts[tipo] = (counts[tipo] ?? 0) + 1;
  }
  for (const sequence of sequences ?? []) {
    const { error } = await supabase.from('sequences').update({ usadas: counts[Number(sequence.tipo_ecf)] ?? 0 })
      .eq('company_id', companyId).eq('tipo_ecf', sequence.tipo_ecf).eq('ambiente', sequence.ambiente);
    if (error) return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
