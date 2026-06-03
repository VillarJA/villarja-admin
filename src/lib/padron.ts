// DGII Padrón RNC/Cédula lookup — separate Supabase project
// Table: rnc_contribuyentes
// Env: NEXT_PUBLIC_DGII_PADRON_URL + NEXT_PUBLIC_DGII_PADRON_ANON_KEY

const PADRON_URL  = process.env.NEXT_PUBLIC_DGII_PADRON_URL ?? '';
const PADRON_KEY  = process.env.NEXT_PUBLIC_DGII_PADRON_ANON_KEY ?? '';

export interface PadronResult {
  rnc: string;
  nombre: string;       // Razón social / nombre
  nombreComercial: string;
  tipo: string;         // 'JURIDICO' | 'FISICO'
  estado: string;       // 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO'
  actividad: string;
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
    const rows: Record<string, string>[] = await res.json();
    if (!rows.length) return null;

    const r = rows[0];
    return {
      rnc:            r['rnc']               ?? r['numero_rnc']    ?? clean,
      nombre:         r['nombre']            ?? r['razon_social']  ?? r['nombre_completo'] ?? '',
      nombreComercial: r['nombre_comercial'] ?? r['nombre']        ?? '',
      tipo:           r['tipo_rnc']          ?? r['tipo']          ?? '',
      estado:         r['estado']            ?? '',
      actividad:      r['actividad_economica'] ?? r['actividad']   ?? '',
    };
  } catch {
    return null;
  }
}
