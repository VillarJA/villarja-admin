import { NextRequest, NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key');
  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const upstream = await fetch(`${ECF_BASE}/api/v1/test-firma-stored`, {
      method: 'POST',
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
