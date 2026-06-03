// DGII Padrón RNC/Cédula lookup — separate Supabase project
// Table: rnc_contribuyentes
// Env: NEXT_PUBLIC_DGII_PADRON_URL + NEXT_PUBLIC_DGII_PADRON_ANON_KEY

const PADRON_URL  = process.env.NEXT_PUBLIC_DGII_PADRON_URL ?? '';
const PADRON_KEY  = process.env.NEXT_PUBLIC_DGII_PADRON_ANON_KEY ?? '';

export interface PadronResult {
  rnc: string;
  nombre: string;          // Razón social
  nombreComercial: string; // Nombre comercial (puede ser null)
  estado: string;          // 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO'
  actividad: string;
  regimenPago: string;
  fechaInicio: string;
  activo: boolean;
}

// Query rnc_contribuyentes via Supabase REST. Returns null if not found or on error.
export async function buscarRNC(rnc: string): Promise<PadronResult | null> {
  const clean = rnc.replace(/\D/g, '');
  if (!clean || !PADRON_URL || !PADRON_KEY) return null;

  try {
    const url = `${PADRON_URL}/rest/v1/rnc_contribuyentes?rnc=eq.${encodeURIComponent(clean)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: PADRON_KEY,
        Authorization: `Bearer ${PADRON_KEY}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;
    const rows: Record<string, string | null>[] = await res.json();
    if (!rows.length) return null;

    const r = rows[0];
    const estado = String(r['estado'] ?? '').toUpperCase();
    return {
      rnc:            String(r['rnc'] ?? clean),
      nombre:         String(r['nombre'] ?? ''),
      nombreComercial: String(r['nombre_comerc'] ?? ''),
      estado,
      actividad:      String(r['actividad_economica'] ?? ''),
      regimenPago:    String(r['regimen_pago'] ?? ''),
      fechaInicio:    String(r['fecha_inicio_operaciones'] ?? ''),
      activo:         estado === 'ACTIVO',
    };
  } catch {
    return null;
  }
}
