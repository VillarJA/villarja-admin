import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireSupabaseAdmin } from '@/lib/admin-session';
import { removePrivateCompanyFields } from '@/lib/admin-response';
import { recordAdminAudit } from '@/lib/admin-audit';
import {
  buildLegacyCompanyInsertPayload,
  buildModernCompanyInsertPayload,
  isLegacySchemaMismatch,
} from '@/lib/company-schema';

function generateApiKey(ambiente: string): string {
  const prefix = ambiente.toLowerCase() === 'ecf' ? 'vja_live'
    : ambiente.toLowerCase() === 'certecf' ? 'vja_cert' : 'vja_test';
  const random = crypto.getRandomValues(new Uint8Array(24));
  return `${prefix}_${Array.from(random, (value) => value.toString(36).padStart(2, '0')).join('')}`;
}

const PLAN_LIMITS: Record<string, number> = { Básico: 500, Pro: 5000, Enterprise: 50000 };

export async function GET(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

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
  return NextResponse.json((data ?? []).map(removePrivateCompanyFields));
}

export async function POST(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.rnc !== 'string' || typeof body.razonSocial !== 'string'
    || typeof body.plan !== 'string' || typeof body.ambiente !== 'string') {
    return NextResponse.json({ error: 'Datos de empresa inválidos' }, { status: 400 });
  }

  const input = {
    rnc: body.rnc.trim(),
    razonSocial: body.razonSocial.trim(),
    alias: typeof body.alias === 'string' ? body.alias.trim() || undefined : undefined,
    plan: body.plan as 'Básico' | 'Pro' | 'Enterprise',
    ambiente: body.ambiente,
    direccion: typeof body.direccion === 'string' ? body.direccion.trim() || undefined : undefined,
    municipio: typeof body.municipio === 'string' ? body.municipio.trim() || undefined : undefined,
    provincia: typeof body.provincia === 'string' ? body.provincia.trim() || undefined : undefined,
  };
  if (!input.rnc || !input.razonSocial || !['Básico', 'Pro', 'Enterprise'].includes(input.plan)) {
    return NextResponse.json({ error: 'Datos de empresa inválidos' }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Servicio de datos no configurado' }, { status: 503 });
  const apiKey = generateApiKey(input.ambiente);
  try {
    await recordAdminAudit(req, auth.user, 'Nuevo cliente registrado', input.razonSocial);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }
  let result = await supabase.from('companies').insert(buildModernCompanyInsertPayload(input, apiKey)).select().single();
  if (isLegacySchemaMismatch(result.error)) {
    result = await supabase.from('companies')
      .insert(buildLegacyCompanyInsertPayload(input, apiKey, PLAN_LIMITS[input.plan]))
      .select().single();
  }
  if (result.error) return NextResponse.json({ error: `DB: ${result.error.message}` }, { status: 500 });
  return NextResponse.json(removePrivateCompanyFields(result.data), { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurado' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { id, ...fields } = body as Record<string, unknown>;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }

  const allowed = ['direccion', 'municipio', 'provincia', 'estado', 'plan'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) patch[key] = fields[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  try {
    await recordAdminAudit(req, auth.user, 'Actualizó datos de cliente', String(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo registrar auditoría' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
  }
  return NextResponse.json(removePrivateCompanyFields(data));
}
