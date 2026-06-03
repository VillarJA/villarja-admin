import { test, expect } from '@playwright/test';
import { demoLogin, clearAuth } from './helpers';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
  });

  test('renders login form without pre-filled email', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue('');
  });

  test('login aside shows product list (not hardcoded stats)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.la-product').first()).toBeVisible();
    await expect(page.locator('text=FluxyMed')).toBeVisible();
    await expect(page.locator('text=FluxyGo')).toBeVisible();
    // Must NOT show hardcoded stats
    await expect(page.locator('text=1.2M')).not.toBeVisible();
    await expect(page.locator('text=99.4%')).not.toBeVisible();
  });

  test('login aside title says Portal de Administración', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.la-mid h2')).toHaveText('Portal de Administración');
  });

  test('demo login bypasses credentials and reaches dashboard', async ({ page }) => {
    await demoLogin(page);
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('h1')).toHaveText('Dashboard');
  });

  test('shows error on bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'bad@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: 'Entrar al portal' }).click();
    await expect(page.locator('.note.warn')).toBeVisible({ timeout: 10000 });
  });

  test('authenticated user is redirected away from /login', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/admin/dashboard');
  });
});
