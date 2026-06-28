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

export async function POST(
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

  const { data: company, error: fetchError } = await supabase
    .from('companies')
    .select('ambiente')
    .eq('id', id)
    .single();

  if (fetchError || !company) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
  }

  const newKey = generateApiKey(ambienteToPrefix(String(company.ambiente ?? 'testeCF')));

  const { error } = await supabase
    .from('companies')
    .update({ api_key: newKey })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ api_key: newKey });
}
