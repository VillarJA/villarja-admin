export type CompanyPlan = 'Básico' | 'Pro' | 'Enterprise';
export type CompanyEstado = 'Activo' | 'Suspendido' | 'Pendiente';

interface CompanyInsertInput {
  rnc: string;
  razonSocial: string;
  alias: string;
  plan: CompanyPlan;
  ambiente: string;
  direccion?: string;
  municipio?: string;
  provincia?: string;
}

const LEGACY_ESTADO_RE = /\[portal_estado:(Activo|Suspendido|Pendiente)\]/;

export function normalizeCompanyAmbiente(raw: unknown): string {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'ecf') return 'eCF';
  if (value === 'certecf') return 'certeCF';
  if (value === 'testecf') return 'testeCF';
  return String(raw || 'testeCF');
}

export function normalizeCompanyEstado(row: Record<string, unknown>): CompanyEstado {
  const estado = String(row.estado || '').trim();
  if (estado === 'Activo' || estado === 'Suspendido' || estado === 'Pendiente') {
    return estado;
  }

  const legacyEstado = readLegacyPortalEstado(row.notas);
  if (legacyEstado) return legacyEstado;

  if (typeof row.activa === 'boolean') {
    return row.activa ? 'Activo' : 'Pendiente';
  }

  return 'Pendiente';
}

export function readLegacyPortalEstado(raw: unknown): CompanyEstado | null {
  const notes = String(raw || '');
  const match = notes.match(LEGACY_ESTADO_RE);
  return match?.[1] as CompanyEstado | null;
}

export function buildModernCompanyInsertPayload(input: CompanyInsertInput, apiKey: string) {
  return {
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
    ...(input.direccion ? { direccion: input.direccion } : {}),
    ...(input.municipio ? { municipio: input.municipio } : {}),
    ...(input.provincia ? { provincia: input.provincia } : {}),
  };
}

export function buildLegacyCompanyInsertPayload(
  input: CompanyInsertInput,
  apiKey: string,
  limiteFacturasMes: number,
) {
  return {
    rnc: input.rnc,
    razon_social: input.razonSocial,
    nombre_comercial: input.alias,
    direccion: input.direccion || 'Pendiente de completar',
    plan: toLegacyPlan(input.plan),
    ambiente: toLegacyAmbiente(input.ambiente),
    api_key: apiKey,
    limite_facturas_mes: limiteFacturasMes,
    activa: false,
    notas: '[portal_estado:Pendiente]',
    ...(input.municipio ? { municipio: input.municipio } : {}),
    ...(input.provincia ? { provincia: input.provincia } : {}),
  };
}

export function buildLegacyEstadoUpdate(estado: CompanyEstado) {
  return {
    activa: estado === 'Activo',
    notas: `[portal_estado:${estado}]`,
  };
}

export function isLegacySchemaMismatch(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error?.message) return false;
  if (error.code !== 'PGRST204' && error.code !== '42703') return false;

  return [
    'estado',
    'facturas_mes',
    'certificado_estado',
    'certificado_vence',
  ].some((column) => error.message?.includes(`'${column}'`) || error.message?.includes(`.${column}`));
}

function toLegacyPlan(plan: CompanyPlan): string {
  if (plan === 'Básico') return 'basico';
  return plan.toLowerCase();
}

function toLegacyAmbiente(ambiente: string): string {
  return normalizeCompanyAmbiente(ambiente).toLowerCase();
}
