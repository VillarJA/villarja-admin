import { NextRequest, NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params;
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const upstream = await fetch(
      `${ECF_BASE}/api/v1/certification/cases/${caseId}/send`,
      { method: 'POST', headers: { 'X-API-Key': apiKey } },
    );
    const body = await upstream.json().catch(() => ({}));
    return NextResponse.json(body, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de conexión con ECF API' },
      { status: 502 },
    );
  }
}
