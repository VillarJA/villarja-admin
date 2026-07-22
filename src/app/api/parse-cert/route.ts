import { NextRequest, NextResponse } from 'next/server';
import * as forge from 'node-forge';
import { requireSupabaseAdmin } from '@/lib/admin-session';

const MAX_CERTIFICATE_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireSupabaseAdmin(req);
  if (auth.response) return auth.response;

  const formData = await req.formData();
  const file = formData.get('cert') as File | null;
  const password = (formData.get('password') as string | null) ?? '';

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_CERTIFICATE_BYTES) {
    return NextResponse.json({ error: 'El certificado debe pesar entre 1 byte y 2 MB' }, { status: 413 });
  }
  if (!/\.(p12|pfx)$/i.test(file.name)) {
    return NextResponse.json({ error: 'Solo se aceptan certificados .p12 o .pfx' }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const p12Der = forge.util.createBuffer(buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch {
      return NextResponse.json({ error: 'Contraseña incorrecta o archivo dañado' }, { status: 422 });
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag?.cert) {
      return NextResponse.json({ error: 'El .p12 no contiene un certificado X.509 válido' }, { status: 422 });
    }

    const cert = certBag.cert;
    const cn = cert.subject.getField('CN')?.value ?? '';
    const o = cert.subject.getField('O')?.value ?? '';
    const subject = o || cn;

    const notAfter = cert.validity.notAfter;
    const d = notAfter;
    const vence = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

    return NextResponse.json({ subject, vence });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al procesar el certificado' },
      { status: 422 },
    );
  }
}
