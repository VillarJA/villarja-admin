import { supabase } from './supabase';
import type { Company, Factura, Secuencia, ContingenciaItem, ContingenciaHist, DgiiService, AuditLog, DonutItem } from '@/types';
import {
  CLIENTES, FACTURAS, SECUENCIAS, CONTINGENCIA_QUEUE, CONTINGENCIA_HIST,
  AUDIT_LOG, DGII_SERVICES, COMARK, PLAN_LIMITS, ECF_TYPES,
} from './data';

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

function mapCompany(row: Record<string, unknown>, idx: number): Company {
  const plan = String(row.plan || 'Básico') as Company['plan'];
  return {
    id: String(row.id),
    rnc: String(row.rnc || ''),
    razon: String(row.razon_social || row.razon || ''),
    alias: String(row.nombre_comercial || row.alias || ''),
    plan,
    estado: String(row.estado || 'Pendiente') as Company['estado'],
    amb: String(row.ambiente || row.amb || 'testeCF'),
    facturasMes: Number(row.facturas_mes ?? row.facturasMes ?? 0),
    limite: PLAN_LIMITS[plan]?.facturas ?? 500,
    cert: String(row.certificado_estado || row.cert || 'Pendiente'),
    certVence: String(row.certificado_vence || row.certVence || '—'),
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
  if (!supabase) return CLIENTES;
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data?.length) return CLIENTES;
    return data.map((row, idx) => mapCompany(row as Record<string, unknown>, idx));
  } catch {
    return CLIENTES;
  }
}

export async function getClienteById(id: string): Promise<Company> {
  if (!supabase) return CLIENTES.find((c) => c.id === id) ?? CLIENTES[0];
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return CLIENTES.find((c) => c.id === id) ?? CLIENTES[0];
    return mapCompany(data as Record<string, unknown>, 0);
  } catch {
    return CLIENTES.find((c) => c.id === id) ?? CLIENTES[0];
  }
}

// ─── READ: Facturas ────────────────────────────────────────────────────────────

export async function getFacturas(): Promise<Factura[]> {
  if (!supabase) return FACTURAS;
  try {
    const { data, error } = await supabase
      .from('ecf_documents')
      .select('*, companies(razon_social, rnc)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error || !data?.length) return FACTURAS;
    return data.map((row) => mapFactura(row as Record<string, unknown>));
  } catch {
    return FACTURAS;
  }
}

export async function getFacturasForCliente(companyId: string): Promise<Factura[]> {
  if (!supabase) return FACTURAS.filter((f) => f.clienteId === companyId).slice(0, 6);
  try {
    const { data, error } = await supabase
      .from('ecf_documents')
      .select('*, companies(razon_social, rnc)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error || !data?.length) return FACTURAS.filter((f) => f.clienteId === companyId).slice(0, 6);
    return data.map((row) => mapFactura(row as Record<string, unknown>));
  } catch {
    return FACTURAS.filter((f) => f.clienteId === companyId).slice(0, 6);
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
  if (!supabase) return SECUENCIAS;
  try {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('company_id', companyId)
      .order('tipo_ecf', { ascending: true });
    if (error || !data?.length) return SECUENCIAS;
    return data.map((row) => mapSecuencia(row as Record<string, unknown>));
  } catch {
    return SECUENCIAS;
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

  if (!supabase) {
    const c: Company = {
      id: 'demo-' + Date.now(),
      rnc: input.rnc,
      razon: input.razonSocial,
      alias: input.alias,
      plan: input.plan,
      estado: 'Pendiente',
      amb: input.ambiente,
      facturasMes: 0,
      limite: PLAN_LIMITS[input.plan]?.facturas ?? 500,
      cert: 'Pendiente',
      certVence: '—',
      apiKey,
      ingresoMes: PLAN_LIMITS[input.plan]?.precio ?? 0,
      mark: 0,
    };
    return c;
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      rnc: input.rnc,
      razon_social: input.razonSocial,
      nombre_comercial: input.alias,
      plan: input.plan,
      estado: 'Pendiente',
      ambiente: input.ambiente,
      facturas_mes: 0,
      certificado_estado: 'Pendiente',
      certificado_vence: '—',
      api_key: apiKey,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  await insertAuditLog('Nuevo cliente registrado', input.razonSocial);
  return mapCompany(data as Record<string, unknown>, 0);
}

export async function updateCompanyEstado(
  id: string,
  estado: Company['estado'],
  razon: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('companies')
    .update({ estado })
    .eq('id', id);
  if (error) throw new Error(error.message);
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
  });
  if (error) throw new Error(error.message);
  await insertAuditLog(
    `Creó secuencia e-NCF (${input.tipoEcf})`,
    input.razonCliente,
  );
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
