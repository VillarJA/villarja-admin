import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET() {
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
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
