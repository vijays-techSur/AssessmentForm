import { test, expect } from '@playwright/test';
import { loginAsRespondent } from './helpers/auth';

const RESPONDENT = {
  email: `f0-test-${Date.now()}@example.com`,
  name: 'F0 Test User',
  teamType: 'program_project',
};

test.describe('F0: Multi-Step Assessment Workflow', () => {

  test('TEST-F0-01: Next button advances to next section without page reload', async ({ page }) => {
    await loginAsRespondent(page, RESPONDENT);
    const url = page.url();
    await page.getByRole('button', { name: /next/i }).click();
    // SPA: URL should not trigger a full reload — still on same base route
    await expect(page).toHaveURL(new RegExp(new URL(url).pathname.split('/')[1] || 'assessment'), { timeout: 5000 });
    // Section index incremented — progress indicator updates
    await expect(page.getByText(/section 2/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F0-02: Previous button returns to prior section without validation', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-02-${Date.now()}@example.com` });
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/section 2/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /previous|back/i }).click();
    await expect(page.getByText(/section 1/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F0-03: Previous button hidden or disabled on first section', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-03-${Date.now()}@example.com` });
    // On section 1, Previous should be absent or disabled
    const prevBtn = page.getByRole('button', { name: /previous|back/i });
    const isHidden = await prevBtn.isHidden().catch(() => true);
    const isDisabled = await prevBtn.isDisabled().catch(() => true);
    expect(isHidden || isDisabled).toBeTruthy();
  });

  test('TEST-F0-04: Next button becomes Review on last section', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-04-${Date.now()}@example.com` });
    // Navigate through all sections for program_project (5 sections)
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(500);
    }
    // Last section: button should say Review or Go to Review
    await expect(page.getByRole('button', { name: /review|submit/i })).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F0-05: Progress indicator shows current section and total count', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-05-${Date.now()}@example.com` });
    // Progress indicator visible with section count
    await expect(page.getByText(/section \d+ of \d+/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/section 2 of/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F0-06: Completed sections visually distinguished in progress indicator', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-06-${Date.now()}@example.com` });
    await page.getByRole('button', { name: /next/i }).click();
    // First section should now show a completed state (aria-current or different class)
    // Accept either aria-label containing "completed" or a visual indicator element
    const completedIndicators = page.locator('[aria-label*="completed"], [data-completed="true"], .completed, [data-testid*="completed"]');
    await expect(completedIndicators.first()).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F0-07: Review Step shows all answers in read-only format', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-07-${Date.now()}@example.com` });
    // Navigate to last section
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: /review/i }).click();
    // Review step should show read-only content with Edit links
    await expect(page.getByRole('link', { name: /edit/i }).first()).toBeVisible({ timeout: 5000 });
    // No enabled text inputs (read-only)
    const enabledInputs = page.locator('input:not([disabled]):not([readonly]):not([type="submit"])');
    const count = await enabledInputs.count();
    expect(count).toBe(0);
  });

  test('TEST-F0-08: Edit link from Review returns to section in edit mode', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-08-${Date.now()}@example.com` });
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /next/i }).click();
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: /review/i }).click();
    await page.getByRole('link', { name: /edit/i }).first().click();
    // Should render section in editable mode (inputs present)
    await expect(page.locator('input, textarea').first()).toBeVisible({ timeout: 5000 });
    const firstInput = page.locator('input, textarea').first();
    const isDisabled = await firstInput.isDisabled();
    expect(isDisabled).toBeFalsy();
  });

  test('TEST-F0-09: Next on unanswered required question shows inline error', async ({ page }) => {
    await loginAsRespondent(page, { ...RESPONDENT, email: `f0-09-${Date.now()}@example.com` });
    // Click Next without answering any required question
    await page.getByRole('button', { name: /next/i }).click();
    // Inline error should appear
    await expect(page.getByText(/required|please answer|answer all required/i)).toBeVisible({ timeout: 5000 });
    // Navigation is blocked — still on section 1
    await expect(page.getByText(/section 1 of/i)).toBeVisible({ timeout: 3000 });
  });

  test('TEST-F0-10: Direct section jump available only for submitted sessions within edit window', async ({ page }) => {
    // New respondent — section jump NOT available
    const email = `f0-10-new-${Date.now()}@example.com`;
    await loginAsRespondent(page, { ...RESPONDENT, email });
    // Progress indicator items should NOT be clickable links
    const jumpLinks = page.locator('[data-testid="progress-bar"] a, [data-testid="progress-indicator"] button[data-jump="true"]');
    const jumpCount = await jumpLinks.count();
    expect(jumpCount).toBe(0);
  });

});
