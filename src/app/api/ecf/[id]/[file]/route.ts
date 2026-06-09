import { NextRequest, NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await params;
  if (file !== 'xml' && file !== 'pdf') {
    return NextResponse.json({ error: 'Tipo de archivo no válido' }, { status: 400 });
  }
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const upstream = await fetch(`${ECF_BASE}/api/v1/ecf/${id}/${file}`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      return new NextResponse(text, { status: upstream.status });
    }
    const buffer = await upstream.arrayBuffer();
    const contentType = file === 'xml' ? 'application/xml' : 'application/pdf';
    const disposition =
      upstream.headers.get('content-disposition') || `attachment; filename="${id}.${file}"`;
    return new NextResponse(buffer, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Content-Disposition': disposition },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error de conexión con ECF API' },
      { status: 502 },
    );
  }
}
