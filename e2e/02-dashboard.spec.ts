import { test, expect } from '@playwright/test';
import { hasE2EAdminCredentials, loginAsAdmin } from './helpers';

test.describe('Dashboard', () => {
  test.skip(!hasE2EAdminCredentials, 'Se requieren credenciales Supabase de E2E');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows 4 KPI cards', async ({ page }) => {
    await expect(page.locator('.kpi')).toHaveCount(4);
  });

  test('KPI labels are present', async ({ page }) => {
    await expect(page.locator('text=Clientes activos')).toBeVisible();
    await expect(page.locator('text=e-CF en plataforma')).toBeVisible();
    await expect(page.locator('text=Ingresos del mes')).toBeVisible();
    await expect(page.locator('text=Tasa rechazo DGII')).toBeVisible();
  });

  test('does not show hardcoded delta values (+6, +12.4%)', async ({ page }) => {
    await expect(page.locator('text=+12.4%')).not.toBeVisible();
    await expect(page.locator('text=+8.1%')).not.toBeVisible();
    await expect(page.locator('text=-0.3pp')).not.toBeVisible();
  });

  test('shows current date in page subtitle', async ({ page }) => {
    const today = new Date();
    const year = today.getFullYear().toString();
    await expect(page.locator('.page-head p')).toContainText(year);
  });

  test('Nuevo Cliente button navigates to clientes', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await expect(page).toHaveURL('/admin/clientes');
  });

  test('Estado servicios DGII card renders', async ({ page }) => {
    await expect(page.locator('text=Estado servicios DGII')).toBeVisible();
  });
});
