import { test, expect } from '@playwright/test';
import { demoLogin } from './helpers';

test.describe('Clientes list', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/admin/clientes');
    await page.waitForSelector('h1');
  });

  test('page title is Clientes', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Clientes');
  });

  test('shows empresa count in subtitle', async ({ page }) => {
    await expect(page.locator('.page-head p')).toContainText('empresas registradas');
  });

  test('Exportar CSV button is visible and clickable', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Exportar CSV' });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('Nuevo Cliente button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await expect(page.locator('.modal-box, [class*="modal"]')).toBeVisible({ timeout: 5000 });
  });

  test('search filter narrows results', async ({ page }) => {
    const searchInput = page.locator('.search-inline input');
    await searchInput.fill('zzz_nonexistent_company');
    await expect(page.locator('text=0 resultados')).toBeVisible({ timeout: 3000 });
  });

  test('plan filter works', async ({ page }) => {
    // Select Pro filter
    const selects = page.locator('select');
    await selects.first().selectOption('Pro');
    // Table should update
    await page.waitForTimeout(200);
    const rows = page.locator('.tbl tbody tr');
    const count = await rows.count();
    // All visible rows should have Pro plan pill
    if (count > 0) {
      await expect(rows.first().locator('text=Pro')).toBeVisible();
    }
  });

  test('clicking a row navigates to client detail', async ({ page }) => {
    const firstRow = page.locator('.tbl tbody tr.clickable').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/admin\/clientes\/.+/);
    }
  });
});

test.describe('Cliente detail', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/admin/clientes');
    await page.waitForSelector('.tbl tbody tr.clickable');
    await page.locator('.tbl tbody tr.clickable').first().click();
    await page.waitForURL(/\/admin\/clientes\/.+/);
    await page.waitForSelector('h1');
  });

  test('shows API Key section', async ({ page }) => {
    await expect(page.locator('text=API Key')).toBeVisible();
  });

  test('show/hide API key toggle works', async ({ page }) => {
    const eyeBtn = page.locator('.apikey-box button').first();
    await eyeBtn.click();
    // After clicking show, key should be revealed (no masking bullets)
    const codeEl = page.locator('.apikey-box code');
    const text = await codeEl.textContent();
    expect(text).not.toContain('••••••••••••••••');
  });

  test('Cambiar Plan button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Cambiar Plan' }).click();
    await expect(page.locator('.modal-box, [class*="modal"]')).toBeVisible({ timeout: 5000 });
  });

  test('Crear Secuencia tab button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Secuencias e-NCF' }).click();
    await page.getByRole('button', { name: 'Crear Secuencia' }).click();
    await expect(page.locator('.modal-box, [class*="modal"]')).toBeVisible({ timeout: 5000 });
  });

  test('back breadcrumb returns to clientes list', async ({ page }) => {
    await page.locator('text=Volver a Clientes').click();
    await expect(page).toHaveURL('/admin/clientes');
  });
});
