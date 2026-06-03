import { Page } from '@playwright/test';

/** Log in via demo mode (no real credentials required). */
export async function demoLogin(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar en modo demo' }).click();
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
