import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

function generateApiKey(prefix: 'vja_live' | 'vja_cert' | 'vja_test' = 'vja_live'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const random = Array.from(arr, (b) => chars[b % chars.length]).join('');
  return `${prefix}_${random}`;
}

function ambienteToPrefix(amb: string): 'vja_live' | 'vja_cert' | 'vja_test' {
  const n = String(amb).toLowerCase();
  if (n === 'ecf') return 'vja_live';
  if (n === 'certecf') return 'vja_cert';
  return 'vja_test';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' },
      { status: 503 },
    );
  }
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const allowed = ['direccion', 'municipio', 'provincia', 'estado', 'plan', 'ambiente'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in (body as Record<string, unknown>)) {
      patch[key] = (body as Record<string, unknown>)[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  // When ambiente changes, always regenerate api_key with the correct prefix.
  if ('ambiente' in patch) {
    patch.api_key = generateApiKey(ambienteToPrefix(patch.ambiente as string));
  }

  const { data: updated, error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }
  return NextResponse.json(updated);
}
