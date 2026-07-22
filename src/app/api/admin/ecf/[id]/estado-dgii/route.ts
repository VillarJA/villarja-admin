import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/admin-session';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSupabaseAdmin(req);
  if (session.response) return session.response;

  const { id } = await params;
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Authorization requerida' }, { status: 401 });

  try {
    const upstream = await fetch(`${ECF_BASE}/admin/ecf/${id}/estado-dgii`, {
      headers: { Authorization: auth },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Error upstream: HTTP ${upstream.status}` },
        { status: upstream.status },
      );
    }
    const json = await upstream.json();
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de conexión con ECF API' },
      { status: 502 },
    );
  }
}
