import { test, expect } from '@playwright/test';
import { hasE2EAdminCredentials, loginAsAdmin } from './helpers';

test.describe('Sidebar and Topbar', () => {
  test.skip(!hasE2EAdminCredentials, 'Se requieren credenciales Supabase de E2E');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('sidebar shows Admin Portal subtitle (not Facturación e-CF)', async ({ page }) => {
    await expect(page.locator('.side-brand-text span')).toHaveText('Admin Portal');
  });

  test('sidebar coming soon shows FluxyMed and FluxyGo', async ({ page }) => {
    await expect(page.locator('text=FluxyMed')).toBeVisible();
    await expect(page.locator('text=FluxyGo')).toBeVisible();
  });

  test('topbar does not show hardcoded admin@villarja.com', async ({ page }) => {
    await expect(page.locator('.av-meta span')).not.toHaveText('admin@villarja.com');
  });

  test('topbar shows the authenticated user email', async ({ page }) => {
    await expect(page.locator('.av-meta span')).toContainText(process.env.E2E_SUPABASE_EMAIL ?? '');
  });

  test('sidebar toggle collapses sidebar', async ({ page }) => {
    await page.locator('.topbar-toggle').click();
    await expect(page.locator('.sidebar.compact')).toBeVisible();
    // Toggle back
    await page.locator('.topbar-toggle').click();
    await expect(page.locator('.sidebar:not(.compact)')).toBeVisible();
  });

  test('dark mode toggle switches theme', async ({ page }) => {
    const moonBtn = page.locator('.icon-btn[title="Modo oscuro"]');
    await moonBtn.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    // Toggle back
    await page.locator('.icon-btn[title="Modo claro"]').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('all nav items navigate correctly', async ({ page }) => {
    const routes: [string, string][] = [
      ['Clientes', '/admin/clientes'],
      ['Emisión e-CF', '/admin/facturas'],
      ['Contingencia', '/admin/contingencia'],
      ['Planes', '/admin/planes'],
      ['Configuración', '/admin/configuracion'],
    ];
    for (const [label, url] of routes) {
      await page.locator('.side-item', { hasText: label }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test('logout button clears session and redirects to login', async ({ page }) => {
    await page.locator('.icon-btn[title="Cerrar sesión"]').click();
    await expect(page).toHaveURL('/login');
    const token = await page.evaluate(() => localStorage.getItem('vja_admin_token'));
    expect(token).toBeNull();
  });
});
