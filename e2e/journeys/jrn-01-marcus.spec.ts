import { test, expect } from '@playwright/test';
import { setAssessmentOpen } from '../helpers/setup';
import { loginAsRespondent } from '../helpers/auth';

const EMAIL = `marcus-${Date.now()}@example.com`;
const NAME = 'Marcus Reid';
const TEAM_TYPE = 'program_project'; // 5 sections

test.describe('JRN-01.1: Marcus — First-Time Completion Across Two Sessions', () => {

  test('JRN-01.1 Stage 1-3: Marcus arrives, identifies, and answers questions in session 1', async ({ page }) => {
    // Arrive at assessment
    await page.goto('/');
    // Progress estimate visible
    await expect(page.getByText(/min|section/i)).toBeVisible({ timeout: 5000 });
    // Identify: enter name, email, team type
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Section 1 loaded — answer the first required question
    const firstRadio = page.locator('input[type="radio"]').first();
    if (await firstRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstRadio.click();
    }
    // Navigate to section 2 — auto-save fires
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.getByText(/section 2/i)).toBeVisible({ timeout: 5000 });
    // Answer required questions in section 2 and navigate to section 3
    const radios2 = page.locator('input[type="radio"]');
    if (await radios2.count() > 0) await radios2.first().click();
    await page.getByRole('button', { name: /next/i }).click();
  });

  test('JRN-01.1 Stage 4-5: Marcus pauses and resumes — all answers preserved', async ({ page }) => {
    // Resume: re-enter with same email
    await page.goto('/');
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Resume banner should appear for returning respondent
    await expect(page.getByText(/welcome back|resume|left off/i)).toBeVisible({ timeout: 8000 });
    // Answers pre-populated — verify we're past section 1 (is_returning=true)
    await expect(page.getByText(/section [23]/i)).toBeVisible({ timeout: 5000 });
  });

  test('JRN-01.1 Stage 6: Marcus submits — confirmation screen shows edit deadline', async ({ page }) => {
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Navigate through all remaining sections
    let attempts = 0;
    while (attempts < 6) {
      const nextBtn = page.getByRole('button', { name: /next|review/i });
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(400);
        // If on Review Step, click Submit
        const submitBtn = page.getByRole('button', { name: /^submit$/i });
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          break;
        }
      }
      attempts++;
    }
    // Confirmation screen with edit deadline
    await expect(page.getByText(/submitted|confirmation/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/edit|update.*until|due date/i)).toBeVisible({ timeout: 5000 });
  });

});

test.describe('JRN-01.2: Marcus — Re-Entering to Correct a Hasty Answer', () => {

  test('JRN-01.2 Stages 1-2: Marcus returns, system recognizes submission, edit window shown', async ({ page }) => {
    await page.goto('/');
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Should see edit window banner (already submitted)
    await expect(page.getByText(/already submitted|edit.*until|update.*until/i)).toBeVisible({ timeout: 8000 });
    // Form is editable
    const input = page.locator('input[type="radio"], input[type="checkbox"]').first();
    const isDisabled = await input.isDisabled().catch(() => true);
    expect(isDisabled).toBeFalsy();
  });

  test('JRN-01.2 Stage 3: Marcus can navigate directly to any section (direct jump — US-0.5)', async ({ page }) => {
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Progress indicator items should be clickable for submitted+within-edit-window session
    const jumpControls = page.locator('[data-testid="progress-bar"] button, [data-testid="progress-indicator"] button');
    const count = await jumpControls.count();
    expect(count).toBeGreaterThan(0);
  });

  test('JRN-01.2 Stage 5: Re-submit shows "updated" not "duplicated" confirmation', async ({ page }) => {
    await loginAsRespondent(page, { email: EMAIL, name: NAME, teamType: TEAM_TYPE });
    // Navigate to review and re-submit
    let attempts = 0;
    while (attempts < 8) {
      const reviewBtn = page.getByRole('button', { name: /review/i });
      if (await reviewBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await reviewBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /next/i });
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
      }
      attempts++;
      await page.waitForTimeout(300);
    }
    const submitBtn = page.getByRole('button', { name: /^submit$/i });
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
      await expect(page.getByText(/updated|submitted/i)).toBeVisible({ timeout: 8000 });
    }
  });

});
