import { test, expect } from '@playwright/test';
import { demoLogin } from './helpers';

test.describe('Configuración page', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/admin/configuracion');
    await page.waitForSelector('h1');
  });

  test('page title is Configuración', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Configuración');
  });

  test('renders 4 tabs', async ({ page }) => {
    await expect(page.locator('.tabs button')).toHaveCount(4);
    await expect(page.locator('button', { hasText: 'Cuenta' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Ambiente DGII' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'CORS y Seguridad' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Auditoría' })).toBeVisible();
  });

  test('Cuenta tab loads with form fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    const saveBtn = page.getByRole('button', { name: 'Guardar cambios' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
  });

  test('Ambiente DGII tab switches content', async ({ page }) => {
    await page.locator('button', { hasText: 'Ambiente DGII' }).click();
    await expect(page.locator('text=URL recepción e-CF')).toBeVisible();
    await expect(page.locator('text=Timeout de recepción')).toBeVisible();
  });

  test('CORS y Seguridad tab shows toggles', async ({ page }) => {
    await page.locator('button', { hasText: 'CORS y Seguridad' }).click();
    await expect(page.locator('text=Forzar HTTPS')).toBeVisible();
    await expect(page.locator('text=Rate limiting por API Key')).toBeVisible();
    const saveBtn = page.getByRole('button', { name: 'Guardar' });
    await expect(saveBtn).toBeEnabled();
  });

  test('Auditoría tab renders table or empty state', async ({ page }) => {
    await page.locator('button', { hasText: 'Auditoría' }).click();
    // Either has table rows or empty state message
    const hasTable = await page.locator('.tbl').count() > 0;
    const hasEmpty = await page.locator('text=No hay entradas de auditoría').count() > 0;
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('Guardar shows feedback on click', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: 'Guardar cambios' });
    await saveBtn.click();
    // Should show saving state or toast feedback
    await expect(
      page.locator('text=Guardando').or(page.locator('text=Cambios guardados').or(page.locator('.toast')))
    ).toBeVisible({ timeout: 8000 });
  });
});
