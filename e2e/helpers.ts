import { Page } from '@playwright/test';

export const hasE2EAdminCredentials = Boolean(
  process.env.E2E_SUPABASE_EMAIL && process.env.E2E_SUPABASE_PASSWORD,
);

/** Log in with an actual Supabase administrator account supplied by the test environment. */
export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_SUPABASE_EMAIL;
  const password = process.env.E2E_SUPABASE_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_SUPABASE_EMAIL y E2E_SUPABASE_PASSWORD son requeridos para pruebas autenticadas');
  }

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole('button', { name: 'Entrar al portal' }).click();
  await page.waitForURL('/admin/dashboard');
}

/** Clear auth tokens to simulate logged-out state. */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('vja_admin_token');
    localStorage.removeItem('vja_admin_user');
    document.cookie = 'vja_admin_token=; path=/; max-age=0';
  });
}
