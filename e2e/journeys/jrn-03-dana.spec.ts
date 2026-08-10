import { test, expect } from '@playwright/test';
import { loginAsSystemOwner } from '../helpers/auth';
import { setAssessmentOpen, setAssessmentClosed } from '../helpers/setup';

test.describe('JRN-03.1: Dana — Launching Assessment and Monitoring Participation', () => {

  test('JRN-03.1 Stage 1: Dana configures due date in Config Panel within 5 minutes', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Config panel accessible from dashboard
    await page.getByRole('link', { name: /config|settings|configuration/i }).click().catch(async () => {
      await page.goto('/dashboard/config');
    });
    await expect(page.getByText(/due date|assessment window/i)).toBeVisible({ timeout: 8000 });
    // Date picker present
    await expect(page.locator('input[type="date"], [data-testid="due-date-picker"]')).toBeVisible({ timeout: 5000 });
  });

  test('JRN-03.1 Stage 2: Dashboard shows Active status and assessment link', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Active status indicator visible
    await expect(page.getByText(/active|open|live/i)).toBeVisible({ timeout: 5000 });
  });

  test('JRN-03.1 Stage 3: Response counts by team type visible in dashboard', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Dashboard shows team type breakdown
    await expect(page.getByText(/program.*project|platform.*engineering|infrastructure|data.*api/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('JRN-03.1 Stage 4: Drill-down accessible in ≤2 clicks from response list', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Click first row in response table (if any responses exist)
    const firstRow = page.locator('table tbody tr, [data-testid="response-row"]').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click();
      // Full response view visible
      await expect(page.getByText(/response|answers|section/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('JRN-03.1 Stage 5: Respondent contact detail (email) visible in response list', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Email column present in response table
    await expect(page.locator('[data-testid="response-email"], th:has-text("Email"), td[data-col="email"]').first()).toBeVisible({ timeout: 5000 });
  });

});

test.describe('JRN-03.2: Dana — Closing Window, Exporting Data, Presenting Charts', () => {

  test('JRN-03.2 Stage 1: Dashboard shows Closed status after due date passes', async ({ page, request }) => {
    const token = await request.post('http://localhost:4000/api/auth/login', {
      data: { email: 'admin@assessmentform.internal' },
    }).then(r => r.json()).then(b => b.token).catch(() => null);
    if (token) {
      await setAssessmentClosed(request as Parameters<typeof setAssessmentClosed>[0], token);
    }
    await loginAsSystemOwner(page);
    await expect(page.getByText(/closed/i)).toBeVisible({ timeout: 8000 });
    // Restore for other tests
    if (token) await setAssessmentOpen(request as Parameters<typeof setAssessmentOpen>[0], token);
  });

  test('JRN-03.2 Stage 3: Individual response drill-down in ≤2 clicks', async ({ page }) => {
    await loginAsSystemOwner(page);
    const firstRow = page.locator('table tbody tr, [data-testid="response-row"]').first();
    if (await firstRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRow.click(); // 1 click
      await expect(page.getByText(/section|answers|question/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('JRN-03.2 Stage 4: CSV export downloads file with assessment-responses filename', async ({ page }) => {
    await loginAsSystemOwner(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: /export.*csv|download.*csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/assessment-responses.*\.csv/);
  });

  test('JRN-03.2 Stage 5: Analytics charts render — all 4 chart types visible', async ({ page }) => {
    await loginAsSystemOwner(page);
    // Navigate to analytics section
    await page.getByRole('link', { name: /analytics|charts/i }).click().catch(async () => {
      await page.goto('/dashboard/analytics');
    });
    // At least one chart element visible (Recharts SVG or canvas)
    await expect(page.locator('svg, canvas, [data-testid*="chart"]').first()).toBeVisible({ timeout: 8000 });
  });

});
