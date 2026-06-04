import { test, expect } from '@playwright/test';
import { mockAuthState } from './helpers/auth';

test.describe('Upload Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthState(page);
    await page.goto('/upload', { waitUntil: 'domcontentloaded' });
  });

  test('upload page loads with drag-drop zone', async ({ page }) => {
    const dropZone = page.getByText(/drag.*drop|drop.*file|upload.*video/i).or(
      page.locator('[data-testid="drop-zone"]')
    );
    await expect(dropZone.first()).toBeVisible();
  });

  test('YouTube URL input field is present', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/youtube|url|paste/i).or(
      page.locator('input[type="url"]')
    );
    await expect(urlInput.first()).toBeVisible();
  });

  test('all 5 style presets are shown', async ({ page }) => {
    const presets = ['MrBeast', 'Hormozi', 'Podcast', 'Storytelling', 'Educational'];
    for (const preset of presets) {
      await expect(page.getByText(preset, { exact: false }).first()).toBeVisible();
    }
  });

  test('"Generate Shorts" button exists', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /generate|create|start/i });
    await expect(generateBtn.first()).toBeVisible();
  });
});
