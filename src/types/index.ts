export type CertStatus = 'no_iniciada' | 'en_proceso' | 'certificada';

export interface Company {
  id: string;
  rnc: string;
  razon: string;
  alias: string;
  plan: 'Básico' | 'Pro' | 'Enterprise';
  estado: 'Activo' | 'Suspendido' | 'Pendiente';
  amb: string;
  facturasMes: number;
  limite: number;
  cert: string;
  certVence: string;
  certSubject?: string;
  certPassword?: string;
  apiKey: string;
  ingresoMes: number;
  mark: number;
  certStatus: CertStatus;
}

export interface Factura {
  id: string;
  encf: string;
  tipo: number;
  clienteId: string;
  cliente: string;
  rnc: string;
  monto: number;
  itbis: number;
  total: number;
  estado: FacturaEstado;
  fecha: Date;
}

export type FacturaEstado = 'accepted' | 'sent' | 'rejected' | 'pending' | 'draft' | 'contingency';

export interface Secuencia {
  tipo: number;
  desc: string;
  desde: number;
  hasta: number;
  usadas: number;
  vence: string;
  ambiente: string;
}

export interface ContingenciaItem {
  encf: string;
  cliente: string;
  intentos: number;
  proximo: string;
  motivo: string;
  desde: string;
}

export interface ContingenciaHist {
  ts: string;
  evt: string;
  det: string;
  tipo: 'ok' | 'cont';
}

export interface DgiiService {
  name: string;
  sub: string;
  estado: 'ok' | 'warn';
  lat: string;
}

export interface AuditLog {
  ts: string;
  actor: string;
  accion: string;
  obj: string;
  ip: string;
}

export interface DashboardData {
  clientesActivos: number;
  facturasHoy: number;
  ingresosMes: number;
  tasaRechazo: number;
  serie30d: number[];
  donutTipos: DonutItem[];
  ultimasFacturas: Factura[];
  dgiiServices: DgiiService[];
}

export interface DonutItem {
  tipo: number;
  label: string;
  value: number;
  color: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

export interface Recepcion {
  id: string;
  companyId: string;
  razonSocial: string;   // nombre de nuestro cliente (el receptor o el emisor original)
  rncEmisor: string;
  rncComprador: string;
  encf: string;
  tipoEcf: number | null;
  tipo: 'ecf' | 'aprobacion';
  procesado: boolean;
  fecha: Date;
}

export type RecepcionTipo = 'ecf' | 'aprobacion';
