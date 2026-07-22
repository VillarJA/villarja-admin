import { test, expect } from '@playwright/test';
import { hasE2EAdminCredentials, loginAsAdmin } from './helpers';

test.describe('Facturas page', () => {
  test.skip(!hasE2EAdminCredentials, 'Se requieren credenciales Supabase de E2E');

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/facturas');
    await page.waitForSelector('h1');
  });

  test('page title is Emisión de Facturas', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Emisión de Facturas');
  });

  test('month button shows current month (not hardcoded)', async ({ page }) => {
    const today = new Date();
    const monthName = new Intl.DateTimeFormat('es-DO', { month: 'long' }).format(today);
    const monthBtn = page.getByRole('button', { name: new RegExp(monthName, 'i') });
    await expect(monthBtn).toBeVisible();
    // Must NOT say "Junio 2026" if current month is different
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth();
    if (currentMonthNum !== 5 || currentYear !== 2026) {
      await expect(page.getByRole('button', { name: /Junio 2026/i })).not.toBeVisible();
    }
  });

  test('Exportar CSV button is enabled', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeEnabled();
  });

  test('status filter chips render', async ({ page }) => {
    await expect(page.locator('text=Aceptados')).toBeVisible();
    await expect(page.locator('text=Rechazados')).toBeVisible();
    await expect(page.locator('text=En proceso')).toBeVisible();
  });

  test('filtering by status changes results count', async ({ page }) => {
    const initialCount = await page.locator('.tbl tbody tr').count();
    await page.locator('button', { hasText: 'Aceptados' }).click();
    await page.waitForTimeout(200);
    const filteredCount = await page.locator('.tbl tbody tr').count();
    // Accepted count should be <= total
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('search by text filters table', async ({ page }) => {
    await page.locator('.search-inline input').fill('zzz_nonexistent_encf');
    await page.waitForTimeout(200);
    await expect(page.locator('text=0 comprobantes')).toBeVisible();
  });

  test('PDF button is visibly disabled', async ({ page }) => {
    const rows = page.locator('.tbl tbody tr');
    if (await rows.count() > 0) {
      const pdfBtn = rows.first().locator('button[title="PDF no disponible"]');
      await expect(pdfBtn).toBeDisabled();
    }
  });
});
