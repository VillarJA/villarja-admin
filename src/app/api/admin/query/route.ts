import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { removePrivateCompanyFields } from '@/lib/admin-response';

// Whitelist of tables the admin portal is allowed to read via service role
const ALLOWED_TABLES = new Set([
  'companies',
  'sequences',
  'ecf_documents',
  'received_ecf_documents',
  'audit_log',
  'portal_config',
  'subscription_plans',
  'contingencia_cola',
  'contingencia_eventos',
  'certification_cases',
  'certification_progress',
]);
const PRIVATE_COMPANY_COLUMNS = /\b(certificado_data|certificado_password|cert_password_encrypted|certificado_path)\b/i;

interface QueryBody {
  table: string;
  select?: string;
  eq?: Record<string, unknown>;
  neq?: Record<string, string>;
  gte?: Record<string, string>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json() as QueryBody;
  const { table, select = '*', eq: eqFilters, neq: neqFilters, gte: gteFilters, order, limit } = body;

  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Tabla no permitida: ${table}` }, { status: 403 });
  }
  if (!/^[\w\s,()*]+$/.test(select)
    || PRIVATE_COMPANY_COLUMNS.test(select)
    || /\bcompanies\s*\(\s*\*\s*\)/i.test(select)) {
    return NextResponse.json({ error: 'Selección de columnas inválida' }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' }, { status: 503 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = supabase.from(table).select(select) as any;
  if (eqFilters) {
    for (const [col, val] of Object.entries(eqFilters)) q = q.eq(col, val);
  }
  if (neqFilters) {
    for (const [col, val] of Object.entries(neqFilters)) q = q.neq(col, val);
  }
  if (gteFilters) {
    for (const [col, val] of Object.entries(gteFilters)) q = q.gte(col, val);
  }
  if (order) q = q.order(order.column, { ascending: order.ascending ?? false });
  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }
  const response = table === 'companies'
    ? (data ?? []).map(removePrivateCompanyFields)
    : (data ?? []);
  return NextResponse.json(response);
}
