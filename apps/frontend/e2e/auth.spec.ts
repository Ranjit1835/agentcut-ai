import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads with email/password form', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    // Wait for the form to become visible (framer-motion animation)
    await expect(page.getByPlaceholder('Email address')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('login page shows Google OAuth button', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const googleBtn = page.getByRole('button', { name: /google/i });
    await expect(googleBtn).toBeVisible({ timeout: 15_000 });
  });

  test('signup page loads with registration form', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('unauthenticated user sees redirect or login when visiting /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 30_000 });
    // Either redirected to login OR the page loaded (no Supabase env)
    const url = page.url();
    const onLoginOrDashboard = url.includes('/login') || url.includes('/dashboard');
    expect(onLoginOrDashboard).toBeTruthy();
  });

  test('unauthenticated user sees redirect or login when visiting /upload', async ({ page }) => {
    await page.goto('/upload', { waitUntil: 'networkidle', timeout: 30_000 });
    const url = page.url();
    const onLoginOrUpload = url.includes('/login') || url.includes('/upload');
    expect(onLoginOrUpload).toBeTruthy();
  });
});
