import { supabase } from './supabase';
import type { Company, Factura, Secuencia, ContingenciaItem, ContingenciaHist, DgiiService, AuditLog } from '@/types';
import {
  CLIENTES, FACTURAS, SECUENCIAS, CONTINGENCIA_QUEUE, CONTINGENCIA_HIST,
  AUDIT_LOG, DGII_SERVICES, COMARK, PLAN_LIMITS, ECF_TYPES,
} from './data';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

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
  return CONTINGENCIA_HIST;
}

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
