import 'server-only';

import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function recordAdminAudit(
  req: NextRequest,
  user: User,
  accion: string,
  objeto: string,
): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error('Servicio de datos no configurado');

  const { error } = await supabase.from('audit_log').insert({
    actor: user.email ?? user.id,
    accion,
    objeto,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '',
  });
  if (error) throw new Error(`Auditoría: ${error.message}`);
}
