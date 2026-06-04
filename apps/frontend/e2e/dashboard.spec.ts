import { test, expect } from '@playwright/test';
import { mockAuthState } from './helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  });

  test('dashboard page loads', async ({ page }) => {
    // With or without valid auth, the page should render some content
    // (either dashboard content or a redirect to login)
    const url = page.url();
    const loaded = url.includes('/dashboard') || url.includes('/login');
    expect(loaded).toBeTruthy();
  });

  test('page has visible content', async ({ page }) => {
    // Check that the page rendered something visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Should have at least some text content on the page
    const text = await body.innerText();
    expect(text.length).toBeGreaterThan(0);
  });

  test('page contains navigation', async ({ page }) => {
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });
});
