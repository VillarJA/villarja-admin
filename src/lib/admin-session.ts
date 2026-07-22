import 'server-only';

import { createClient, type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'vja_admin_token';
const ADMIN_ROLE = 'admin';

export function hasAdminRole(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== 'object') return false;
  return (appMetadata as Record<string, unknown>).role === ADMIN_ROLE;
}

export function getSupabaseAccessToken(req: NextRequest): string | null {
  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice('Bearer '.length);

  return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function requireSupabaseAdmin(req: NextRequest): Promise<
  | { user: User; response?: never }
  | { user?: never; response: NextResponse }
> {
  const token = getSupabaseAccessToken(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !url || !anonKey) {
    return { response: NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 }) };
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { response: NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 }) };
  }

  if (!hasAdminRole(user.app_metadata)) {
    return { response: NextResponse.json({ error: 'Permisos de administrador requeridos' }, { status: 403 }) };
  }

  return { user };
}
