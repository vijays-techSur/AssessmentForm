import { Page } from '@playwright/test';

/**
 * Navigate to the identity form and fill in respondent details.
 * Waits for section 1 to be visible (confirms session created).
 */
export async function loginAsRespondent(
  page: Page,
  opts: { email: string; name: string; teamType: string }
): Promise<void> {
  await page.goto('/');
  await page.getByLabel(/email/i).fill(opts.email);
  await page.getByLabel(/name/i).fill(opts.name);
  await page.getByLabel(/team type/i).selectOption(opts.teamType);
  await page.getByRole('button', { name: /start|continue|begin/i }).click();
  // Wait for assessment section to load
  await page.waitForSelector('[data-testid="section-screen"], [data-testid="assessment-wizard"]', { timeout: 10_000 });
}

/**
 * Navigate to /dashboard/login and authenticate as System Owner.
 */
export async function loginAsSystemOwner(
  page: Page,
  email = 'admin@assessmentform.internal'
): Promise<void> {
  await page.goto('/dashboard/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('button', { name: /login|sign in|access dashboard/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 10_000 });
}
