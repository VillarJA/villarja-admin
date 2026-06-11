import { NextRequest, NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export async function GET(req: NextRequest, { params }: { params: Promise<{ caseId: string }> }) {
  const key = req.headers.get('x-api-key');
  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });
  const { caseId } = await params;
  try {
    const upstream = await fetch(`${ECF_BASE}/api/v1/certification/simulation/${caseId}/xml`, {
      headers: { 'X-API-Key': key },
    });
    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}));
      return NextResponse.json(body, { status: upstream.status });
    }
    const blob = await upstream.blob();
    const cd = upstream.headers.get('content-disposition') ?? 'attachment; filename="ecf.xml"';
    return new NextResponse(blob, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': cd },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error de conexión con ECF API' }, { status: 502 });
  }
}
