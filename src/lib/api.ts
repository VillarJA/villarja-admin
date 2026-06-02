import { getToken, removeToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://ecf.villarja.com';

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | undefined>;
};

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? getToken() : null;

  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) url += '?' + qs;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...fetchOptions, headers });

  if (res.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const adminApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { email: string; name: string } }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  dashboard: () => api<unknown>('/admin/dashboard'),

  companies: (params?: { search?: string; plan?: string; estado?: string; page?: number; limit?: number }) =>
    api<unknown>('/admin/companies', { params: params as Record<string, string | number | undefined> }),

  company: (id: string) => api<unknown>(`/admin/companies/${id}`),

  facturas: (params?: { search?: string; tipo?: string; estado?: string; page?: number; limit?: number }) =>
    api<unknown>('/admin/facturas', { params: params as Record<string, string | number | undefined> }),

  contingencia: () => api<unknown>('/admin/contingencia'),

  regenerateApiKey: (id: string) =>
    api<unknown>(`/admin/companies/${id}/regenerate-key`, { method: 'POST' }),
};

export default api;
