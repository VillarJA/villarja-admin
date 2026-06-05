import { supabase } from './supabase';
import type { Company, Factura, Secuencia, ContingenciaItem, ContingenciaHist, DgiiService, AuditLog, DonutItem } from '@/types';
import {
  CONTINGENCIA_QUEUE, CONTINGENCIA_HIST,
  AUDIT_LOG, DGII_SERVICES, COMARK, PLAN_LIMITS, ECF_TYPES,
} from './data';
import {
  buildLegacyCompanyInsertPayload,
  buildLegacyEstadoUpdate,
  buildModernCompanyInsertPayload,
  isLegacySchemaMismatch,
  normalizeCompanyAmbiente,
  normalizeCompanyEstado,
} from './company-schema';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateApiKey(prefix: 'vja_live' | 'vja_cert' | 'vja_test' = 'vja_live'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const random = Array.from(arr, (b) => chars[b % chars.length]).join('');
  return `${prefix}_${random}`;
}

async function insertAuditLog(accion: string, obj: string): Promise<void> {
  if (!supabase) return;
  const actor = typeof window !== 'undefined'
    ? (localStorage.getItem('vja_admin_email') ?? 'admin')
    : 'admin';
  try {
    await supabase.from('audit_log').insert({
      actor,
      accion,
      objeto: obj,
      ip: '—',
    });
  } catch { /* non-critical */ }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function normalizePlan(raw: unknown): Company['plan'] {
  const s = String(raw || '').toLowerCase();
  if (s === 'básico' || s === 'basico') return 'Básico';
  if (s === 'enterprise') return 'Enterprise';
  if (s === 'pro') return 'Pro';
  const valid: Company['plan'][] = ['Básico', 'Pro', 'Enterprise'];
  return valid.find((v) => v === raw) ?? 'Pro';
}

function buildAlias(raw: unknown, razon: string): string {
  const alias = String(raw || '').trim();
  if (alias) return alias;
  return razon
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.slice(0, 4).toUpperCase())
    .join('')
    .slice(0, 20);
}

function mapCompany(row: Record<string, unknown>, idx: number): Company {
  const plan = normalizePlan(row.plan);
  const razon = String(row.razon_social || row.razon || '');
  return {
    id: String(row.id),
    rnc: String(row.rnc || ''),
    razon,
    alias: buildAlias(row.nombre_comercial || row.alias, razon),
    plan,
    estado: normalizeCompanyEstado(row),
    amb: normalizeCompanyAmbiente(row.ambiente || row.amb || 'testeCF'),
    facturasMes: Number(row.facturas_mes ?? row.facturasMes ?? 0),
    limite: Number(row.limite_facturas_mes ?? PLAN_LIMITS[plan]?.facturas ?? 500),
    cert: String(row.certificado_estado || (row.certificado_path ? 'Vigente' : row.cert) || 'Pendiente'),
    certVence: String(row.certificado_vence || row.certVence || '—'),
    certSubject: row.certificado_subject ? String(row.certificado_subject) : undefined,
    certPassword: String(row.certificado_password || row.certPassword || ''),
    apiKey: String(row.api_key || row.apiKey || ''),
    ingresoMes: PLAN_LIMITS[plan]?.precio ?? 0,
    mark: idx % COMARK.length,
  };
}

function mapFactura(row: Record<string, unknown>): Factura {
  const comp = row.companies as Record<string, unknown> | null;
  const monto = Number(row.monto || 0);
  const itbis = Number(row.itbis || 0);
  return {
    id: String(row.id),
    encf: String(row.encf || ''),
    tipo: Number(row.tipo_ecf ?? row.tipo ?? 31),
    clienteId: String(row.company_id || row.clienteId || ''),
    cliente: String(comp?.razon_social || row.cliente || ''),
    rnc: String(comp?.rnc || row.rnc || ''),
    monto,
    itbis,
    total: Number(row.monto_total ?? row.total ?? monto + itbis),
    estado: String(row.estado || 'pending') as Factura['estado'],
    fecha: new Date(String(row.created_at || row.fecha || new Date().toISOString())),
  };
}

function mapSecuencia(row: Record<string, unknown>): Secuencia {
  const tipo = Number(row.tipo_ecf ?? row.tipo ?? 31);
  return {
    tipo,
    desc: String(row.descripcion || row.desc || ECF_TYPES[tipo] || ''),
    desde: Number(row.secuencia_desde ?? row.desde ?? 1),
    hasta: Number(row.secuencia_hasta ?? row.hasta ?? 1000),
    usadas: Number(row.usadas ?? 0),
    vence: String(row.fecha_vencimiento || row.vence || '—'),
    ambiente: String(row.ambiente || 'certecf'),
  };
}

function mapContingencia(row: Record<string, unknown>): ContingenciaItem {
  const comp = row.companies as Record<string, unknown> | null;
  const d = new Date(String(row.created_at || new Date().toISOString()));
  const desde = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    encf: String(row.encf || ''),
    cliente: String(comp?.razon_social || row.cliente || ''),
    intentos: Number(row.intentos ?? 0),
    proximo: String(row.proximo_intento || row.proximo || 'en 5 min'),
    motivo: String(row.motivo || ''),
    desde,
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  const d = new Date(String(row.created_at || new Date().toISOString()));
  const ts = new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
  return {
    ts,
    actor: String(row.actor || ''),
    accion: String(row.accion || ''),
    obj: String(row.objeto ?? row.obj ?? ''),
    ip: String(row.ip || ''),
  };
}

// ─── READ: Companies ───────────────────────────────────────────────────────────

export async function getClientes(): Promise<Company[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    if (!data?.length) return [];
    return data.map((row, idx) => mapCompany(row as Record<string, unknown>, idx));
  } catch {
    return [];
  }
}

export async function getClienteById(id: string): Promise<Company | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return mapCompany(data as Record<string, unknown>, 0);
  } catch {
    return null;
  }
}

// ─── READ: Facturas ────────────────────────────────────────────────────────────

export async function getFacturas(): Promise<Factura[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('ecf_documents')
      .select('*, companies(razon_social, rnc)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return [];
    if (!data?.length) return [];
    return data.map((row) => mapFactura(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getFacturasForCliente(companyId: string): Promise<Factura[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('ecf_documents')
      .select('*, companies(razon_social, rnc)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) return [];
    if (!data?.length) return [];
    return data.map((row) => mapFactura(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

// ─── READ: Chart data ─────────────────────────────────────────────────────────

export async function getChartData30d(): Promise<number[]> {
  if (!supabase) {
    // Return zeroed array — no invented data
    return new Array(30).fill(0);
  }
  try {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('ecf_documents')
      .select('created_at')
      .gte('created_at', since.toISOString());

    if (error || !data) return new Array(30).fill(0);

    const counts = new Array(30).fill(0);
    const now = new Date();
    for (const row of data) {
      const d = new Date(String((row as Record<string, unknown>).created_at));
      const dayIdx = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIdx >= 0 && dayIdx < 30) counts[29 - dayIdx]++;
    }
    return counts;
  } catch {
    return new Array(30).fill(0);
  }
}

export async function getDonutTipos(): Promise<DonutItem[]> {
  const COLORS: Record<number, string> = {
    31: '#a60005', 32: '#2563c9', 34: '#1f9d57',
    33: '#d9700a', 41: '#6b3fa0', 45: '#0e8a8a',
    43: '#b8860b', 44: '#c2185b', 46: '#0e8a8a', 47: '#9092a8',
  };
  if (!supabase) {
    return [];
  }
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('ecf_documents')
      .select('tipo_ecf')
      .gte('created_at', startOfMonth.toISOString());

    if (error || !data?.length) return [];

    const counts: Record<number, number> = {};
    for (const row of data) {
      const tipo = Number((row as Record<string, unknown>).tipo_ecf ?? 31);
      counts[tipo] = (counts[tipo] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([tipo, value]) => ({
        tipo: Number(tipo),
        label: `${tipo} · ${ECF_TYPES[Number(tipo)] ?? 'Otro'}`,
        value,
        color: COLORS[Number(tipo)] ?? '#9092a8',
      }))
      .sort((a, b) => b.value - a.value);
  } catch {
    return [];
  }
}

// ─── READ: Sequences ──────────────────────────────────────────────────────────

export async function getSecuencias(companyId: string): Promise<Secuencia[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('company_id', companyId)
      .order('tipo_ecf', { ascending: true });
    if (error) return [];
    if (!data?.length) return [];
    return data.map((row) => mapSecuencia(row as Record<string, unknown>));
  } catch {
    return [];
  }
}

// ─── READ: Contingencia ───────────────────────────────────────────────────────

export async function getContingenciaQueue(): Promise<ContingenciaItem[]> {
  if (!supabase) return CONTINGENCIA_QUEUE;
  try {
    const { data, error } = await supabase
      .from('contingencia_cola')
      .select('*, companies(razon_social)')
      .order('created_at', { ascending: true });
    if (error || !data?.length) return CONTINGENCIA_QUEUE;
    return data.map((row) => mapContingencia(row as Record<string, unknown>));
  } catch {
    return CONTINGENCIA_QUEUE;
  }
}

export async function getContingenciaHist(): Promise<ContingenciaHist[]> {
  if (!supabase) return CONTINGENCIA_HIST;
  try {
    const { data, error } = await supabase
      .from('contingencia_eventos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error || !data?.length) return CONTINGENCIA_HIST;
    return data.map((row) => {
      const r = row as Record<string, unknown>;
      const d = new Date(String(r.created_at));
      const ts = new Intl.DateTimeFormat('es-DO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(d);
      return {
        ts,
        evt: String(r.evento || ''),
        det: String(r.detalle || ''),
        tipo: (r.tipo === 'ok' ? 'ok' : 'cont') as ContingenciaHist['tipo'],
      };
    });
  } catch {
    return CONTINGENCIA_HIST;
  }
}

// ─── READ: Audit log ──────────────────────────────────────────────────────────

export async function getAuditLog(): Promise<AuditLog[]> {
  if (!supabase) return AUDIT_LOG;
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data?.length) return AUDIT_LOG;
    return data.map((row) => mapAuditLog(row as Record<string, unknown>));
  } catch {
    return AUDIT_LOG;
  }
}

// ─── READ: DGII services ──────────────────────────────────────────────────────

export async function getDGIIServices(): Promise<DgiiService[]> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return DGII_SERVICES;
    const json = await res.json() as Record<string, unknown>;
    if (Array.isArray(json.services)) {
      return (json.services as Record<string, unknown>[]).map((s) => ({
        name: String(s.name || ''),
        sub: String(s.sub || s.path || ''),
        estado: (s.estado === 'warn' ? 'warn' : 'ok') as DgiiService['estado'],
        lat: String(s.lat || s.latency || '—'),
      }));
    }
    return DGII_SERVICES;
  } catch {
    return DGII_SERVICES;
  }
}

// ─── READ: Portal config ──────────────────────────────────────────────────────

export interface PortalConfig {
  adminName: string;
  adminEmail: string;
  razonSocial: string;
  rnc: string;
  ambienteActivo: string;
  urlRecepcion: string;
  urlConsultaEstado: string;
  urlAutenticacion: string;
  timeoutRecepcion: number;
  corsOrigins: string;
  forzarHttps: boolean;
  rateLimiting: boolean;
  tfaAdmin: boolean;
  rotacionLlaves: boolean;
}

const DEFAULT_CONFIG: PortalConfig = {
  adminName: 'Villar JA — Admin',
  adminEmail: 'admin@villarja.com',
  razonSocial: 'Villar JA Data y Tecnología, SRL',
  rnc: '133-29871-4',
  ambienteActivo: 'eCF',
  urlRecepcion: 'https://ecf.dgii.gov.do/fe/recepcion/api/ecf',
  urlConsultaEstado: 'https://ecf.dgii.gov.do/fe/consultaestado',
  urlAutenticacion: 'https://ecf.dgii.gov.do/fe/autenticacion/api/semilla',
  timeoutRecepcion: 30,
  corsOrigins: 'https://app.villarja.com',
  forzarHttps: true,
  rateLimiting: true,
  tfaAdmin: true,
  rotacionLlaves: false,
};

export async function getPortalConfig(): Promise<PortalConfig> {
  if (!supabase) return DEFAULT_CONFIG;
  try {
    const { data, error } = await supabase
      .from('portal_config')
      .select('*')
      .single();
    if (error || !data) return DEFAULT_CONFIG;
    const r = data as Record<string, unknown>;
    return {
      adminName: String(r.admin_name ?? DEFAULT_CONFIG.adminName),
      adminEmail: String(r.admin_email ?? DEFAULT_CONFIG.adminEmail),
      razonSocial: String(r.razon_social ?? DEFAULT_CONFIG.razonSocial),
      rnc: String(r.rnc ?? DEFAULT_CONFIG.rnc),
      ambienteActivo: String(r.ambiente_activo ?? DEFAULT_CONFIG.ambienteActivo),
      urlRecepcion: String(r.url_recepcion ?? DEFAULT_CONFIG.urlRecepcion),
      urlConsultaEstado: String(r.url_consulta_estado ?? DEFAULT_CONFIG.urlConsultaEstado),
      urlAutenticacion: String(r.url_autenticacion ?? DEFAULT_CONFIG.urlAutenticacion),
      timeoutRecepcion: Number(r.timeout_recepcion ?? DEFAULT_CONFIG.timeoutRecepcion),
      corsOrigins: String(r.cors_origins ?? DEFAULT_CONFIG.corsOrigins),
      forzarHttps: Boolean(r.forzar_https ?? DEFAULT_CONFIG.forzarHttps),
      rateLimiting: Boolean(r.rate_limiting ?? DEFAULT_CONFIG.rateLimiting),
      tfaAdmin: Boolean(r.tfa_admin ?? DEFAULT_CONFIG.tfaAdmin),
      rotacionLlaves: Boolean(r.rotacion_llaves ?? DEFAULT_CONFIG.rotacionLlaves),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function upsertPortalConfig(cfg: PortalConfig): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase.from('portal_config').upsert({
    id: true,
    admin_name: cfg.adminName,
    admin_email: cfg.adminEmail,
    razon_social: cfg.razonSocial,
    rnc: cfg.rnc,
    ambiente_activo: cfg.ambienteActivo,
    url_recepcion: cfg.urlRecepcion,
    url_consulta_estado: cfg.urlConsultaEstado,
    url_autenticacion: cfg.urlAutenticacion,
    timeout_recepcion: cfg.timeoutRecepcion,
    cors_origins: cfg.corsOrigins,
    forzar_https: cfg.forzarHttps,
    rate_limiting: cfg.rateLimiting,
    tfa_admin: cfg.tfaAdmin,
    rotacion_llaves: cfg.rotacionLlaves,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

// ─── READ: Planes ─────────────────────────────────────────────────────────────

export interface PlanStat {
  id: string;
  nombre: string;
  precio: number;
  facturas_limite: number;
  tipos_ecf: string;
  empresas_limite: number;
  descripcion: string;
  popular: boolean;
  features: string[];
  clienteCount: number;
}

export async function getPlanes(): Promise<PlanStat[]> {
  const fallback: PlanStat[] = [
    { id: 'basico', nombre: 'Básico', precio: 2500, facturas_limite: 500, tipos_ecf: '31, 32, 34', empresas_limite: 1, descripcion: 'Para emisores de bajo volumen', popular: false, features: ['500 e-CF / mes', 'Tipos 31, 32, 34', '1 empresa (RNC)', 'Soporte por correo', 'Ambiente testeCF + eCF'], clienteCount: 0 },
    { id: 'pro', nombre: 'Pro', precio: 8900, facturas_limite: 5000, tipos_ecf: '31, 32, 33, 34, 41, 43', empresas_limite: 3, descripcion: 'El más elegido por las PYMEs', popular: true, features: ['5,000 e-CF / mes', 'Tipos 31–34, 41, 43', 'Hasta 3 empresas', 'Soporte prioritario', 'Webhooks + reportes', 'Contingencia automática'], clienteCount: 0 },
    { id: 'enterprise', nombre: 'Enterprise', precio: 29500, facturas_limite: 50000, tipos_ecf: 'Todos los tipos e-CF', empresas_limite: 25, descripcion: 'Alto volumen y multi-empresa', popular: false, features: ['50,000 e-CF / mes', 'Todos los tipos e-CF', 'Hasta 25 empresas', 'SLA 99.9% + soporte 24/7', 'Gerente de cuenta', 'Integración dedicada'], clienteCount: 0 },
  ];
  if (!supabase) return fallback;
  try {
    const [planesRes, companiesRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('precio', { ascending: true }),
      supabase.from('companies').select('plan'),
    ]);
    if (planesRes.error || !planesRes.data?.length) return fallback;

    const counts: Record<string, number> = {};
    for (const c of (companiesRes.data ?? [])) {
      const plan = String((c as Record<string, unknown>).plan || '');
      counts[plan] = (counts[plan] || 0) + 1;
    }

    return planesRes.data.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        nombre: String(r.nombre),
        precio: Number(r.precio),
        facturas_limite: Number(r.facturas_limite),
        tipos_ecf: String(r.tipos_ecf),
        empresas_limite: Number(r.empresas_limite),
        descripcion: String(r.descripcion ?? ''),
        popular: Boolean(r.popular),
        features: Array.isArray(r.features) ? (r.features as string[]) : [],
        clienteCount: counts[String(r.nombre)] ?? 0,
      };
    });
  } catch {
    return fallback;
  }
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export interface CreateCompanyInput {
  rnc: string;
  razonSocial: string;
  alias: string;
  plan: Company['plan'];
  ambiente: string;
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const apiKey = generateApiKey(ambToPrefix(input.ambiente));
  const planLimit = PLAN_LIMITS[input.plan]?.facturas ?? 500;

  if (!supabase) throw new Error('Supabase no configurado');

  let result = await supabase
    .from('companies')
    .insert(buildModernCompanyInsertPayload(input, apiKey))
    .select()
    .single();

  if (isLegacySchemaMismatch(result.error)) {
    result = await supabase
      .from('companies')
      .insert(buildLegacyCompanyInsertPayload(input, apiKey, planLimit))
      .select()
      .single();
  }

  if (result.error) throw new Error(result.error.message);
  await insertAuditLog('Nuevo cliente registrado', input.razonSocial);
  const company = mapCompany(result.data as Record<string, unknown>, 0);

  // Auto-create test sequences for certeCF / testeCF (non-critical)
  if (input.ambiente.toLowerCase() !== 'ecf') {
    try {
      await createDefaultSequencias(company.id, input.ambiente, input.razonSocial);
    } catch { /* migration may not have run yet — admin can create sequences manually */ }
  }

  return company;
}

export async function updateCompanyEstado(
  id: string,
  estado: Company['estado'],
  razon: string,
): Promise<void> {
  if (!supabase) return;
  let result = await supabase
    .from('companies')
    .update({ estado })
    .eq('id', id);

  if (isLegacySchemaMismatch(result.error)) {
    result = await supabase
      .from('companies')
      .update(buildLegacyEstadoUpdate(estado))
      .eq('id', id);
  }

  if (result.error) throw new Error(result.error.message);
  await insertAuditLog(
    estado === 'Suspendido' ? 'Suspendió cliente' : 'Activó cliente',
    razon,
  );
}

export async function updateCompanyPlan(
  id: string,
  plan: Company['plan'],
  razon: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('companies')
    .update({ plan })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await insertAuditLog(`Cambió plan a ${plan}`, razon);
}

function ambToPrefix(amb: string): 'vja_live' | 'vja_cert' | 'vja_test' {
  const n = amb.toLowerCase();
  if (n === 'ecf') return 'vja_live';
  if (n === 'certecf') return 'vja_cert';
  return 'vja_test';
}

export async function regenerateApiKey(id: string, razon: string, amb: string): Promise<string> {
  const newKey = generateApiKey(ambToPrefix(amb));
  if (!supabase) return newKey;
  const { error } = await supabase
    .from('companies')
    .update({ api_key: newKey })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await insertAuditLog('Regeneró API Key', razon);
  return newKey;
}

export async function updateCompanyAmbiente(
  id: string,
  newAmbiente: string,
  razon: string,
): Promise<string> {
  const newKey = generateApiKey(ambToPrefix(newAmbiente));
  if (!supabase) return newKey;
  const { error } = await supabase
    .from('companies')
    .update({ ambiente: newAmbiente, api_key: newKey })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await insertAuditLog(`Cambió ambiente a ${newAmbiente} — API Key regenerada`, razon);
  return newKey;
}

export interface CreateSecuenciaInput {
  companyId: string;
  tipoEcf: number;
  desde: number;
  hasta: number;
  fechaVencimiento: string;
  razonCliente: string;
  ambiente: string;
}

export async function createSecuencia(input: CreateSecuenciaInput): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('sequences').insert({
    company_id: input.companyId,
    tipo_ecf: input.tipoEcf,
    descripcion: ECF_TYPES[input.tipoEcf] ?? '',
    secuencia_desde: input.desde,
    secuencia_hasta: input.hasta,
    usadas: 0,
    fecha_vencimiento: input.fechaVencimiento,
    ambiente: input.ambiente.toLowerCase(),
  });
  if (error) throw new Error(error.message);
  await insertAuditLog(
    `Creó secuencia e-NCF tipo ${input.tipoEcf} (${input.ambiente})`,
    input.razonCliente,
  );
}

// ─── DEFAULT SEQUENCES ────────────────────────────────────────────────────────

const DEFAULT_SEQUENCE_TYPES = [31, 32, 33, 34, 41, 43, 44, 45, 46, 47];

export async function createDefaultSequencias(
  companyId: string,
  ambiente: string,
  razonCliente: string,
): Promise<void> {
  if (!supabase) return;
  const norm = ambiente.toLowerCase();
  if (norm === 'ecf') return; // Production sequences come from DGII; admin enters them manually

  // certeCF: DGII allows up to 10,000,000 per type; testeCF: small range for local testing
  const hasta = norm === 'testecf' ? 9999 : 10000000;

  const exp = new Date();
  norm === 'testecf' ? exp.setMonth(exp.getMonth() + 6) : exp.setFullYear(exp.getFullYear() + 1);
  const vence = `${String(exp.getDate()).padStart(2, '0')}-${String(exp.getMonth() + 1).padStart(2, '0')}-${exp.getFullYear()}`;

  const inserts = DEFAULT_SEQUENCE_TYPES.map((tipo) => ({
    company_id: companyId,
    tipo_ecf: tipo,
    descripcion: ECF_TYPES[tipo] ?? '',
    secuencia_desde: 1,
    secuencia_hasta: hasta,
    usadas: 0,
    fecha_vencimiento: vence,
    ambiente: norm,
  }));

  const { error } = await supabase.from('sequences').insert(inserts);
  if (error) throw new Error(error.message);
  await insertAuditLog(`Creó ${inserts.length} secuencias automáticas (${norm})`, razonCliente);
}

// ─── CERTIFICATE ──────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadCertificate(
  companyId: string,
  file: File,
  razon: string,
  certMeta?: { subject: string; vence: string },
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const base64 = await fileToBase64(file);
  const update: Record<string, unknown> = {
    certificado_data: base64,
    certificado_estado: 'Vigente',
  };
  if (certMeta?.subject) update.certificado_subject = certMeta.subject;
  if (certMeta?.vence) update.certificado_vence = certMeta.vence;

  let { error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', companyId);
  if (error && isLegacySchemaMismatch(error)) {
    // Legacy schema: certificado_estado column absent — update only safe columns
    const legacyUpdate: Record<string, unknown> = { certificado_data: base64 };
    if (certMeta?.subject) legacyUpdate.certificado_subject = certMeta.subject;
    if (certMeta?.vence) legacyUpdate.certificado_vence = certMeta.vence;
    ({ error } = await supabase
      .from('companies')
      .update(legacyUpdate)
      .eq('id', companyId));
  }
  if (error) {
    if (error.code === 'PGRST204' || error.code === '42703') {
      throw new Error(`Schema cache desactualizado (${error.code}): recarga el schema cache en Supabase Dashboard → Settings → API. Detalle: ${error.message}`);
    }
    throw new Error(`[${error.code}] ${error.message}`);
  }
  await insertAuditLog('Subió certificado .p12', razon);
}

export async function updateCertPassword(
  companyId: string,
  password: string,
  razon: string,
): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado');
  const { error } = await supabase
    .from('companies')
    .update({ certificado_password: password })
    .eq('id', companyId);
  if (error) {
    if (error.code === 'PGRST204' || error.code === '42703') {
      throw new Error(`Schema cache desactualizado (${error.code}): recarga el schema cache en Supabase Dashboard → Settings → API. Detalle: ${error.message}`);
    }
    throw new Error(`[${error.code}] ${error.message}`);
  }
  await insertAuditLog('Actualizó contraseña de certificado', razon);
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────

export function exportCSV(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = String(r[k] ?? '').replace(/"/g, '""');
          return `"${v}"`;
        })
        .join(','),
    )
    .join('\n');
  const csv = header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
