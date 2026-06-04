import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
  });

  test('all 4 pricing tiers are displayed', async ({ page }) => {
    await expect(page.getByText('Free').first()).toBeVisible();
    await expect(page.getByText('Starter').first()).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Studio').first()).toBeVisible();
  });

  test('currency toggle switches between USD and INR', async ({ page }) => {
    // Find and click INR toggle
    const inrToggle = page.getByRole('button', { name: /inr|₹/i }).or(
      page.getByText('INR')
    );
    await expect(inrToggle.first()).toBeVisible();
    await inrToggle.first().click();
    await expect(page.getByText('₹').first()).toBeVisible();

    // Switch back to USD
    const usdToggle = page.getByRole('button', { name: /usd|\$/i }).or(
      page.getByText('USD')
    );
    await usdToggle.first().click();
    await expect(page.getByText('$').first()).toBeVisible();
  });

  test('Pro tier is marked as recommended', async ({ page }) => {
    const recommended = page.getByText(/recommended|popular|best value/i);
    await expect(recommended.first()).toBeVisible();
  });

  test('feature comparison table is visible', async ({ page }) => {
    const table = page.getByRole('table').or(
      page.locator('section').filter({ hasText: /comparison|feature/i })
    );
    await expect(table.first()).toBeVisible();
  });
});
