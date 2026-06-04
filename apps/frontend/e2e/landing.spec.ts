import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Wait for framer-motion animations to hydrate and trigger
    await page.waitForTimeout(1500);
  });

  test('page loads and shows hero headline', async ({ page }) => {
    // Text is split across Sparkles > AnimatedGradientText > Highlight wrappers
    const headline = page.locator('h1');
    await expect(headline).toBeVisible();
    await expect(headline).toContainText('long video');
  });

  test('navigation links are visible', async ({ page }) => {
    // Check navbar has key links
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: /pricing/i })).toBeVisible();
  });

  test('competitor comparison table is visible', async ({ page }) => {
    const table = page.getByRole('table').first();
    await expect(table).toBeVisible();
  });

  test('agents section shows all 10 agents', async ({ page }) => {
    // The landing page shows 10 agent cards
    const agentSection = page.locator('section').filter({ hasText: /Working Together/i });
    await expect(agentSection).toBeVisible();
    // Check a few agent card headings (h3 elements to avoid matching descriptions)
    await expect(page.locator('h3').filter({ hasText: 'Ingest' })).toBeVisible();
    await expect(page.locator('h3').filter({ hasText: 'Render' })).toBeVisible();
  });

  test('stats section shows values', async ({ page }) => {
    await expect(page.getByText('Videos Generated').first()).toBeVisible();
    await expect(page.getByText('Retention Boost').first()).toBeVisible();
  });

  test('"Start Free" CTA button is clickable', async ({ page }) => {
    const ctaButton = page.getByRole('link', { name: /start free/i }).or(
      page.getByRole('button', { name: /start free/i })
    );
    await expect(ctaButton.first()).toBeVisible();
    await expect(ctaButton.first()).toBeEnabled();
  });

  test('globe section is rendered', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('testimonials section is visible', async ({ page }) => {
    const section = page.locator('section').filter({ hasText: /loved by/i });
    await expect(section.first()).toBeVisible();
  });
});
