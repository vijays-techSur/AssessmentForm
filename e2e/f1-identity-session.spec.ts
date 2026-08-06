import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('F1: Respondent Identity & Session Management', () => {

  test('TEST-F1-01: Invalid email format returns 400 INVALID_EMAIL_FORMAT + inline error', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Inline error should appear
    await expect(page.getByText(/invalid.*email|email.*invalid|valid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F1-02: Name shorter than 2 characters returns 400 INVALID_NAME', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(`f1-02-${Date.now()}@example.com`);
    await page.getByLabel(/name/i).fill('A');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Inline error about name
    await expect(page.getByText(/name.*invalid|invalid.*name|at least 2|name must be/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F1-03: System owner email in respondent flow returns 403 SYSTEM_OWNER_CANNOT_RESPOND', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('admin@assessmentform.internal');
    await page.getByLabel(/name/i).fill('Admin User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Should show an error about system owner cannot respond
    await expect(page.getByText(/system owner|cannot respond|admin.*not allowed|403/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F1-04: New session created with is_returning=false defaults', async ({ request }) => {
    const email = `f1-04-${Date.now()}@example.com`;
    const res = await request.post(`${BASE}/api/sessions`, {
      data: { email, name: 'F1 Test User', team_type: 'program_project' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.is_returning ?? body.isReturning).toBeFalsy();
    expect(body.token).toBeTruthy();
    expect(body.session_id ?? body.sessionId).toBeTruthy();
  });

  test('TEST-F1-05: Returning respondent shows Resume Banner ("Welcome back")', async ({ page }) => {
    const email = `f1-05-${Date.now()}@example.com`;
    // First visit
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Returning User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    await page.waitForSelector('[data-testid="section-screen"], [data-testid="assessment-wizard"]', { timeout: 10000 });
    // Navigate to section 2
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(1000);
    // Second visit with same email
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Returning User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Resume banner should appear
    await expect(page.getByText(/welcome back|resume|left off|returning/i)).toBeVisible({ timeout: 8000 });
  });

  test('TEST-F1-06: Returning session opens at last saved section_index', async ({ page }) => {
    const email = `f1-06-${Date.now()}@example.com`;
    // First visit — navigate to section 2
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Resume Test User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    await page.waitForSelector('[data-testid="section-screen"], [data-testid="assessment-wizard"]', { timeout: 10000 });
    // Click next to advance
    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForTimeout(1000);
    // Return visit
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Resume Test User');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Should be at section 2 or higher
    await expect(page.getByText(/section [2-9]/i)).toBeVisible({ timeout: 8000 });
  });

  test('TEST-F1-07: session_id stored in localStorage', async ({ page }) => {
    await page.goto('/');
    const email = `f1-07-${Date.now()}@example.com`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('LocalStorage Test');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    await page.waitForSelector('[data-testid="section-screen"], [data-testid="assessment-wizard"]', { timeout: 10000 });
    // Check localStorage for session_id
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('session_id') ?? localStorage.getItem('sessionId');
    });
    expect(sessionId).toBeTruthy();
  });

  test('TEST-F1-08: Same email POST /api/sessions returns existing session (upsert, no duplicate)', async ({ request }) => {
    const email = `f1-08-${Date.now()}@example.com`;
    // First call
    const res1 = await request.post(`${BASE}/api/sessions`, {
      data: { email, name: 'Upsert Test', team_type: 'program_project' },
    });
    const body1 = await res1.json();
    const sessionId1 = body1.session_id ?? body1.sessionId;

    // Second call with same email
    const res2 = await request.post(`${BASE}/api/sessions`, {
      data: { email, name: 'Upsert Test', team_type: 'program_project' },
    });
    const body2 = await res2.json();
    const sessionId2 = body2.session_id ?? body2.sessionId;

    // Should return the same session
    expect(sessionId1).toBe(sessionId2);
    expect(body2.is_returning ?? body2.isReturning).toBeTruthy();
  });

});
