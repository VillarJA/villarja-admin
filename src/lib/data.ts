import type { Company, Factura, Secuencia, ContingenciaItem, ContingenciaHist, DgiiService, AuditLog, DonutItem } from '@/types';

export const COMARK = ['#a60005','#1f9d57','#2563c9','#6b3fa0','#d9700a','#0e8a8a','#b8860b','#c2185b'];

export const ECF_TYPES: Record<number, string> = {
  31: 'Factura de Crédito Fiscal',
  32: 'Factura de Consumo',
  33: 'Nota de Débito',
  34: 'Nota de Crédito',
  41: 'Compras',
  43: 'Gastos Menores',
  44: 'Regímenes Especiales',
  45: 'Gubernamental',
  46: 'Comprobante de Exportación',
  47: 'Pagos al Exterior',
};

export const PLAN_LIMITS: Record<string, { facturas: number; tipos: string; empresas: number; precio: number }> = {
  'Básico':     { facturas: 500,   tipos: '31, 32, 34', empresas: 1,  precio: 2500 },
  'Pro':        { facturas: 5000,  tipos: '31, 32, 33, 34, 41, 43', empresas: 3, precio: 8900 },
  'Enterprise': { facturas: 50000, tipos: 'Todos los tipos e-CF', empresas: 25, precio: 29500 },
};

export const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
  accepted:    { label: 'Aceptado',     cls: 'ok' },
  sent:        { label: 'Enviado',      cls: 'info' },
  rejected:    { label: 'Rechazado',    cls: 'err' },
  pending:     { label: 'En proceso',   cls: 'warn' },
  draft:       { label: 'Borrador',     cls: 'draft' },
  contingency: { label: 'Contingencia', cls: 'cont' },
};

export function markFor(c: Company): string {
  return COMARK[c.mark % COMARK.length];
}

export function fmtDOP(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('es-DO').format(n);
}

export function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

function rnd(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

export const CLIENTES: Company[] = [
  { id:'c01', rnc:'130862403', razon:'Distribuidora Caribe SRL', alias:'DISTCARIBE', plan:'Enterprise', estado:'Activo', amb:'eCF', facturasMes:12480, limite:50000, cert:'Vigente', certVence:'2026-11-04', apiKey:'vja_live_8f3kQ09xRm21Vbz7Np4LdW6', ingresoMes:29500, mark:0 },
  { id:'c02', rnc:'101023459', razon:'Ferretería del Este SA', alias:'FERREESTE', plan:'Pro', estado:'Activo', amb:'eCF', facturasMes:3920, limite:5000, cert:'Vigente', certVence:'2026-08-19', apiKey:'vja_live_2Lp9Wn4Zx81QmKd7Rb3Vc0Y', ingresoMes:8900, mark:1 },
  { id:'c03', rnc:'131456782', razon:'Farmacia Nacional EIRL', alias:'FARMANAC', plan:'Pro', estado:'Activo', amb:'eCF', facturasMes:4810, limite:5000, cert:'Por vencer', certVence:'2026-06-22', apiKey:'vja_live_Qz6Hb2Nm91Lk4Wd8Rp7Vx3T', ingresoMes:8900, mark:2 },
  { id:'c04', rnc:'130998871', razon:'Supermercados La Económica SRL', alias:'LAECONOMICA', plan:'Enterprise', estado:'Activo', amb:'eCF', facturasMes:38200, limite:50000, cert:'Vigente', certVence:'2027-01-30', apiKey:'vja_live_Rm4Kp8Vx21Nb7Wd9Lz3Qc6Y', ingresoMes:29500, mark:3 },
  { id:'c05', rnc:'132087654', razon:'Constructora Bávaro SA', alias:'CONSTBAVARO', plan:'Pro', estado:'Suspendido', amb:'eCF', facturasMes:0, limite:5000, cert:'Vencido', certVence:'2026-04-11', apiKey:'vja_live_Lp2Wm9Zx41Qk7Nd3Rb8Vc1T', ingresoMes:0, mark:4 },
  { id:'c06', rnc:'101567890', razon:'Tecnología Insular SRL', alias:'TECNOINSULAR', plan:'Básico', estado:'Activo', amb:'certeCF', facturasMes:312, limite:500, cert:'Vigente', certVence:'2026-09-08', apiKey:'vja_live_Vx8Nb3Qm71Lk2Wd9Rp4Zc5T', ingresoMes:2500, mark:5 },
  { id:'c07', rnc:'130445120', razon:'Hotelera Punta Cana SA', alias:'HOTPUNTACANA', plan:'Enterprise', estado:'Activo', amb:'eCF', facturasMes:21540, limite:50000, cert:'Vigente', certVence:'2026-12-15', apiKey:'vja_live_Nb6Qm2Vx81Lk9Wd3Rp7Zc4Y', ingresoMes:29500, mark:6 },
  { id:'c08', rnc:'131778903', razon:'Importadora Quisqueya EIRL', alias:'IMPQUISQUEYA', plan:'Pro', estado:'Activo', amb:'eCF', facturasMes:2680, limite:5000, cert:'Vigente', certVence:'2026-10-02', apiKey:'vja_live_Qk3Wd7Vx21Nb8Lp4Rm9Zc6T', ingresoMes:8900, mark:7 },
  { id:'c09', rnc:'132334109', razon:'Clínica Santo Domingo SRL', alias:'CLINSANTODOM', plan:'Pro', estado:'Activo', amb:'eCF', facturasMes:3140, limite:5000, cert:'Vigente', certVence:'2026-07-28', apiKey:'vja_live_Zc9Nb4Vx31Qm7Wd2Lp8Rk5Y', ingresoMes:8900, mark:0 },
  { id:'c10', rnc:'130112098', razon:'Agropecuaria del Cibao SA', alias:'AGROCIBAO', plan:'Básico', estado:'Pendiente', amb:'testeCF', facturasMes:48, limite:500, cert:'Pendiente', certVence:'—', apiKey:'vja_test_Wd2Lp9Vx41Nb6Qm3Rk8Zc7T', ingresoMes:2500, mark:1 },
  { id:'c11', rnc:'101889234', razon:'Editora Listín SRL', alias:'EDITLISTIN', plan:'Pro', estado:'Activo', amb:'eCF', facturasMes:1890, limite:5000, cert:'Vigente', certVence:'2026-11-19', apiKey:'vja_live_Lk7Wd3Vx91Nb2Qm8Rp4Zc6Y', ingresoMes:8900, mark:2 },
  { id:'c12', rnc:'132556771', razon:'Transporte Metropolitano SRL', alias:'TRANSMETRO', plan:'Básico', estado:'Activo', amb:'eCF', facturasMes:421, limite:500, cert:'Vigente', certVence:'2026-08-03', apiKey:'vja_live_Rp5Nb8Vx21Qm9Wd4Lk7Zc3T', ingresoMes:2500, mark:3 },
];

function buildFacturas(n: number): Factura[] {
  const types = [31,31,31,32,32,32,32,34,33,41,43,45,46];
  const out: Factura[] = [];
  const baseDate = new Date('2026-06-01T11:40:00');
  for (let i = 0; i < n; i++) {
    const t = types[Math.floor(rnd(i * 3 + 7) * types.length)];
    const cli = CLIENTES[Math.floor(rnd(i * 5 + 2) * CLIENTES.length)];
    let estado: Factura['estado'];
    const er = rnd(i * 7 + 3);
    if (er < 0.62) estado = 'accepted';
    else if (er < 0.78) estado = 'sent';
    else if (er < 0.86) estado = 'pending';
    else if (er < 0.92) estado = 'rejected';
    else if (er < 0.97) estado = 'contingency';
    else estado = 'draft';
    const seq = 100000000 + Math.floor(rnd(i * 11 + 5) * 900000);
    const monto = Math.round(500 + rnd(i * 13 + 1) * 240000);
    const itbis = Math.round(monto * 0.18);
    const d = new Date(baseDate.getTime() - i * 1000 * 60 * Math.floor(7 + rnd(i * 17) * 220));
    out.push({
      id: 'f' + pad(i, 4),
      encf: 'E' + t + pad(seq, 10),
      tipo: t,
      ambiente: i % 4 === 0 ? 'ecf' : 'certecf',
      clienteId: cli.id,
      cliente: cli.razon,
      rnc: cli.rnc,
      monto,
      itbis,
      total: monto + itbis,
      estado,
      fecha: d,
    });
  }
  return out;
}

export const FACTURAS: Factura[] = buildFacturas(140);

export const SERIE_30D: number[] = (() => {
  const arr: number[] = [];
  for (let i = 0; i < 30; i++) {
    const weekend = (i % 7 === 5 || i % 7 === 6);
    const base = 3800 + Math.sin(i / 3.2) * 900 + i * 42;
    arr.push(Math.round(base * (weekend ? 0.55 : 1) + rnd(i * 9 + 4) * 700));
  }
  return arr;
})();

export const DONUT_TIPOS: DonutItem[] = [
  { tipo: 31, label: '31 · Crédito Fiscal', value: 42180, color: '#a60005' },
  { tipo: 32, label: '32 · Consumo',        value: 51920, color: '#2563c9' },
  { tipo: 34, label: '34 · Nota Crédito',   value: 9840,  color: '#1f9d57' },
  { tipo: 33, label: '33 · Nota Débito',    value: 3120,  color: '#d9700a' },
  { tipo: 41, label: '41 · Compras',        value: 6710,  color: '#6b3fa0' },
  { tipo: 45, label: '45 · Gubernamental',  value: 2380,  color: '#0e8a8a' },
];

export const DGII_SERVICES: DgiiService[] = [
  { name: 'Recepción e-CF',          sub: '/fe/recepcion/api/ecf', estado: 'ok',   lat: '128 ms' },
  { name: 'Consulta de Estado',      sub: '/fe/consultaestado',    estado: 'ok',   lat: '94 ms' },
  { name: 'Autenticación (Semilla)', sub: '/fe/autenticacion',     estado: 'ok',   lat: '212 ms' },
  { name: 'Aprobación Comercial',    sub: '/fe/aprobacioncomercial', estado: 'warn', lat: '1.8 s' },
  { name: 'Directorio de Recepción', sub: '/fe/consultadirectorio', estado: 'ok',  lat: '156 ms' },
];

export const SECUENCIAS: Secuencia[] = [
  { tipo: 31, desc: 'Crédito Fiscal',  desde: 1, hasta: 50000, usadas: 38420, vence: '2026-12-31', ambiente: 'ecf' },
  { tipo: 32, desc: 'Consumo',         desde: 1, hasta: 50000, usadas: 41980, vence: '2026-12-31', ambiente: 'ecf' },
  { tipo: 34, desc: 'Nota de Crédito', desde: 1, hasta: 10000, usadas: 2140,  vence: '2026-12-31', ambiente: 'ecf' },
  { tipo: 33, desc: 'Nota de Débito',  desde: 1, hasta: 5000,  usadas: 680,   vence: '2026-12-31', ambiente: 'ecf' },
  { tipo: 41, desc: 'Compras',         desde: 1, hasta: 10000, usadas: 4310,  vence: '2026-12-31', ambiente: 'ecf' },
];

export const CONTINGENCIA_QUEUE: ContingenciaItem[] = [
  { encf: 'E310000128440', cliente: 'Supermercados La Económica SRL', intentos: 3, proximo: 'en 2 min', motivo: 'Timeout recepción DGII', desde: '12:38' },
  { encf: 'E320000451192', cliente: 'Hotelera Punta Cana SA', intentos: 2, proximo: 'en 4 min', motivo: '503 Service Unavailable', desde: '12:41' },
  { encf: 'E310000128512', cliente: 'Distribuidora Caribe SRL', intentos: 1, proximo: 'en 6 min', motivo: 'Timeout recepción DGII', desde: '12:44' },
  { encf: 'E320000451233', cliente: 'Farmacia Nacional EIRL', intentos: 4, proximo: 'en 1 min', motivo: 'Error firma TSS', desde: '12:33' },
];

export const CONTINGENCIA_HIST: ContingenciaHist[] = [
  { ts: '01 Jun 12:33', evt: 'Contingencia activada', det: 'DGII responde 503 — 18 e-CF encolados', tipo: 'cont' },
  { ts: '01 Jun 11:02', evt: 'Servicio restablecido', det: 'Cola drenada — 240 e-CF reenviados OK', tipo: 'ok' },
  { ts: '01 Jun 10:48', evt: 'Contingencia activada', det: 'Latencia recepción > 30s', tipo: 'cont' },
  { ts: '31 May 18:20', evt: 'Servicio restablecido', det: 'Cola drenada — 56 e-CF reenviados OK', tipo: 'ok' },
  { ts: '31 May 18:04', evt: 'Contingencia activada', det: 'Timeout autenticación (semilla)', tipo: 'cont' },
];

export const AUDIT_LOG: AuditLog[] = [
  { ts: '01 Jun 2026 12:44', actor: 'admin@villarja.com', accion: 'Regeneró API Key', obj: 'Distribuidora Caribe SRL', ip: '190.166.x.x' },
  { ts: '01 Jun 2026 11:18', actor: 'admin@villarja.com', accion: 'Cambió plan a Enterprise', obj: 'Hotelera Punta Cana SA', ip: '190.166.x.x' },
  { ts: '01 Jun 2026 09:52', actor: 'soporte@villarja.com', accion: 'Subió certificado .p12', obj: 'Tecnología Insular SRL', ip: '201.229.x.x' },
  { ts: '31 May 2026 17:30', actor: 'admin@villarja.com', accion: 'Suspendió cliente', obj: 'Constructora Bávaro SA', ip: '190.166.x.x' },
  { ts: '31 May 2026 16:11', actor: 'soporte@villarja.com', accion: 'Creó secuencia e-NCF (32)', obj: 'Farmacia Nacional EIRL', ip: '201.229.x.x' },
  { ts: '31 May 2026 14:05', actor: 'admin@villarja.com', accion: 'Nuevo cliente registrado', obj: 'Agropecuaria del Cibao SA', ip: '190.166.x.x' },
];
