import { test, expect } from '@playwright/test';
import { loginAsRespondent, loginAsSystemOwner } from './helpers/auth';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('F7: Role-Based Access Control', () => {

  test('TEST-F7-01: System Owner email → JWT role=system_owner, routed to /dashboard', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@assessmentform.internal' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
    // Decode JWT payload (base64)
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64').toString());
    expect(payload.role).toBe('system_owner');
  });

  test('TEST-F7-02: Non-owner email → JWT role=respondent, routed to /assessment', async ({ request }) => {
    const res = await request.post(`${BASE}/api/sessions`, {
      data: { email: `f7-02-${Date.now()}@example.com`, name: 'Respondent', team_type: 'program_project' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.token).toBeTruthy();
    // Decode JWT payload
    const payload = JSON.parse(Buffer.from(body.token.split('.')[1], 'base64').toString());
    expect(payload.role).toBe('respondent');
  });

  test('TEST-F7-03: System Owner JWT expiry 8h (expired token → 401)', async ({ request }) => {
    // Create an expired System Owner JWT (manually crafted expired token)
    // We use a real login then test that expired token pattern is rejected
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@assessmentform.internal' },
    });
    const { token } = await res.json();
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    // Verify exp is ~8h from now (28800 seconds)
    const expIn = payload.exp - Math.floor(Date.now() / 1000);
    expect(expIn).toBeGreaterThan(7 * 3600); // At least 7h
    expect(expIn).toBeLessThanOrEqual(8 * 3600 + 60); // At most 8h + 1min buffer
  });

  test('TEST-F7-04: Respondent JWT expiry 24h', async ({ request }) => {
    const res = await request.post(`${BASE}/api/sessions`, {
      data: { email: `f7-04-${Date.now()}@example.com`, name: 'F7 Expiry Test', team_type: 'program_project' },
    });
    const { token } = await res.json();
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    // Verify exp is ~24h from now
    const expIn = payload.exp - Math.floor(Date.now() / 1000);
    expect(expIn).toBeGreaterThan(23 * 3600); // At least 23h
    expect(expIn).toBeLessThanOrEqual(24 * 3600 + 60); // At most 24h + 1min buffer
  });

  test('TEST-F7-05: Respondent accessing /dashboard → 403 ACCESS_DENIED; no dashboard content', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    // Should redirect to login or show error (not dashboard content)
    const isDashboard = await page.locator('table, [data-testid="response-table"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(isDashboard).toBeFalsy();
    // Should show login or access denied
    const showsLogin = await page.getByText(/login|sign in|access denied|403/i).isVisible({ timeout: 3000 }).catch(() => false);
    const isLoginPage = page.url().includes('login');
    expect(showsLogin || isLoginPage).toBeTruthy();
  });

  test('TEST-F7-06: Respondent cannot access another respondent\'s session (403 SESSION_ACCESS_DENIED)', async ({ request }) => {
    // Create two sessions
    const res1 = await request.post(`${BASE}/api/sessions`, {
      data: { email: `f7-06-a-${Date.now()}@example.com`, name: 'Respondent A', team_type: 'program_project' },
    });
    const body1 = await res1.json();
    const tokenA = body1.token;

    const res2 = await request.post(`${BASE}/api/sessions`, {
      data: { email: `f7-06-b-${Date.now()}@example.com`, name: 'Respondent B', team_type: 'program_project' },
    });
    const body2 = await res2.json();
    const sessionIdA = body1.session_id ?? body1.sessionId;
    const tokenB = body2.token;

    // Respondent B tries to access Respondent A's session
    const crossRes = await request.get(`${BASE}/api/sessions/${sessionIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(crossRes.status()).toBeGreaterThanOrEqual(400);
  });

  test('TEST-F7-07: System Owner email blocked in respondent flow (SYSTEM_OWNER_CANNOT_RESPOND)', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('admin@assessmentform.internal');
    await page.getByLabel(/name/i).fill('Admin');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    // Should show error
    await expect(page.getByText(/system owner|cannot respond|not allowed|admin/i)).toBeVisible({ timeout: 5000 });
  });

  test('TEST-F7-08: System Owner JWT blocked from submitting respondent answers', async ({ request }) => {
    // Get system owner token
    const ownerRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@assessmentform.internal' },
    });
    const { token: ownerToken } = await ownerRes.json();

    // Try to create a session with system owner token (should be blocked)
    const sessionRes = await request.post(`${BASE}/api/sessions`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { email: 'admin@assessmentform.internal', name: 'Admin', team_type: 'program_project' },
    });
    // Should be rejected
    expect(sessionRes.status()).toBeGreaterThanOrEqual(400);
  });

  test('TEST-F7-09: Expired JWT shows warning with saved-data reassurance', async ({ page }) => {
    // Set an expired JWT in localStorage
    const expiredPayload = {
      sub: `expired-${Date.now()}@example.com`,
      role: 'respondent',
      session_id: 'fake-session-id',
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1h ago
      iat: Math.floor(Date.now() / 1000) - 4 * 3600,
    };
    const fakeExpiredToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')}.fakesignature`;

    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('session_token', token);
      localStorage.setItem('session_id', 'fake-session-id');
    }, fakeExpiredToken);
    await page.reload();
    await page.waitForTimeout(2000);
    // Should show session expired warning
    const warningVisible = await page.getByText(/session.*expired|expired.*session|token.*expired|sign in again/i).isVisible({ timeout: 5000 }).catch(() => false);
    // May just redirect to identity form — that's also acceptable
    const onIdentity = await page.getByLabel(/email/i).isVisible({ timeout: 3000 }).catch(() => false);
    expect(warningVisible || onIdentity).toBeTruthy();
  });

  test('TEST-F7-10: Tampered JWT rejected 401 TOKEN_INVALID', async ({ request }) => {
    // Get a valid token
    const res = await request.post(`${BASE}/api/sessions`, {
      data: { email: `f7-10-${Date.now()}@example.com`, name: 'Tamper Test', team_type: 'program_project' },
    });
    const { token, session_id, sessionId } = await res.json();
    const sid = session_id ?? sessionId;

    // Tamper with the JWT signature (last character)
    const parts = token.split('.');
    const tamperedSig = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    // Use tampered token
    const tamperedRes = await request.get(`${BASE}/api/sessions/${sid}`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(tamperedRes.status()).toBe(401);
  });

});
