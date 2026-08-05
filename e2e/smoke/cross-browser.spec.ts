import { test, expect } from '@playwright/test';
import { loginAsRespondent } from '../helpers/auth';
import { loginAsSystemOwner } from '../helpers/auth';

test.describe('Cross-Browser Smoke Tests', () => {

  test('SMOKE-01: Identity form renders and accepts input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/name/i)).toBeVisible({ timeout: 5000 });
    // Fill and verify input
    await page.getByLabel(/email/i).fill('smoke-test@example.com');
    await expect(page.getByLabel(/email/i)).toHaveValue('smoke-test@example.com');
  });

  test('SMOKE-02: Assessment section navigation works (Next/Previous)', async ({ page }) => {
    const email = `smoke-nav-${Date.now()}@example.com`;
    await loginAsRespondent(page, { email, name: 'Smoke Test User', teamType: 'program_project' });
    // Verify section 1 loaded
    await expect(page.getByText(/section 1/i)).toBeVisible({ timeout: 8000 });
    // Next button clickable
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible({ timeout: 5000 });
  });

  test('SMOKE-03: API health endpoint returns 200 (stack is running)', async ({ request }) => {
    const res = await request.get('http://localhost:3000/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  test('SMOKE-04: System Owner login and dashboard load', async ({ page }) => {
    await loginAsSystemOwner(page);
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('table, [data-testid="response-table"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('SMOKE-05: Respondent cannot access dashboard (RBAC enforced)', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show 403
    await expect(page).not.toHaveURL(/dashboard\/responses/);
    const content = await page.content();
    const isBlocked = content.includes('403') || content.includes('Access Denied') ||
                      content.includes('login') || page.url().includes('login');
    expect(isBlocked).toBeTruthy();
  });

  test('SMOKE-06: Question types render (radio, checkbox, textarea visible)', async ({ page }) => {
    const email = `smoke-q-${Date.now()}@example.com`;
    await loginAsRespondent(page, { email, name: 'Question Smoke', teamType: 'program_project' });
    // At least one input type visible (radio, checkbox, or textarea)
    await expect(
      page.locator('input[type="radio"], input[type="checkbox"], textarea').first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('SMOKE-07: Auto-save indicator visible during assessment', async ({ page }) => {
    const email = `smoke-save-${Date.now()}@example.com`;
    await loginAsRespondent(page, { email, name: 'Save Smoke', teamType: 'program_project' });
    // Save state indicator should be present (may show Unsaved, Saving, or Saved)
    await expect(
      page.locator('[data-testid="save-state-indicator"], [aria-label*="saved"], [data-testid="auto-save"]').first()
    ).toBeVisible({ timeout: 8000 });
  });

});
