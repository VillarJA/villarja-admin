import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { recordAdminAudit } from '@/lib/admin-audit';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

function apiKey(req: NextRequest): string | null {
  return req.headers.get('x-api-key');
}

export async function GET(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

  const key = apiKey(req);
  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const upstream = await fetch(`${ECF_BASE}/api/v1/certification/progress`, {
      headers: { 'X-API-Key': key },
    });
    const body = await upstream.json().catch(() => ({}));
    return NextResponse.json(body, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de conexión con ECF API' },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

  const key = apiKey(req);
  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const body = await req.json();
    const upstream = await fetch(`${ECF_BASE}/api/v1/certification/progress`, {
      method: 'POST',
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseBody = await upstream.json().catch(() => ({}));

    // When certification completes, persist status to the companies table so the
    // badge is correct on next page load (not just in the current session).
    if (upstream.ok) {
      const data = (responseBody as { data?: { status?: string } }).data ?? responseBody;
      const newStatus = (data as { status?: string }).status;
      if (newStatus === 'certificada' || newStatus === 'en_proceso') {
        const supabase = createServiceClient();
        if (supabase) {
          // Look up company by API key, then update certification_status
          const { data: rows } = await supabase
            .from('companies')
            .select('id')
            .eq('api_key', key)
            .limit(1);
          if (rows?.[0]?.id) {
            try {
              await recordAdminAudit(req, auth.user, 'Actualizó progreso de certificación', rows[0].id);
            } catch (auditError) {
              return NextResponse.json(
                { error: auditError instanceof Error ? auditError.message : 'No se pudo registrar auditoría' },
                { status: 500 },
              );
            }
            await supabase
              .from('companies')
              .update({ certification_status: newStatus })
              .eq('id', rows[0].id);
          }
        }
      }
    }

    return NextResponse.json(responseBody, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de conexión con ECF API' },
      { status: 502 },
    );
  }
}
