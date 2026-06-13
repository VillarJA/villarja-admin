import { NextRequest, NextResponse } from 'next/server';

const ECF_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

function getApiKey(req: NextRequest): string | null {
  return req.headers.get('x-api-key');
}

export async function GET(req: NextRequest) {
  const key = getApiKey(req);
  const companyId = req.nextUrl.searchParams.get('companyId');

  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });
  if (!companyId) return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });

  try {
    const upstream = await fetch(`${ECF_BASE}/api/v1/companies/${companyId}/dgii-root-certificate`, {
      headers: { 'X-API-Key': key },
      cache: 'no-store',
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
  const key = getApiKey(req);
  if (!key) return NextResponse.json({ error: 'API key requerida' }, { status: 400 });

  try {
    const formData = await req.formData();
    const companyId = String(formData.get('companyId') ?? '').trim();
    const file = formData.get('cert') as File | null;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId requerido' }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No se seleccionó archivo' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.cer') && !fileName.endsWith('.crt') && !fileName.endsWith('.pem')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos .cer, .crt o .pem' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const upstream = await fetch(`${ECF_BASE}/api/v1/companies/${companyId}/dgii-root-certificate`, {
      method: 'POST',
      headers: {
        'X-API-Key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        certificateBase64: bytes.toString('base64'),
        fileName: file.name,
        mimeType: file.type || 'application/x-x509-ca-cert',
      }),
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
