import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isValidUrl = (s?: string) =>
  !!s && (s.startsWith('https://') || s.startsWith('http://'));

export const supabase = isValidUrl(url) && key ? createClient(url!, key) : null;
