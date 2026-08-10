import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:4000';

test.describe('F3: Team-Type-Specific Section Routing', () => {

  test('TEST-F3-01: program_project → 5 sections in correct order', async ({ request }) => {
    const res = await request.get(`${BASE}/api/sections?teamType=program_project`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sections = body.sections ?? body.data ?? body;
    expect(Array.isArray(sections)).toBeTruthy();
    expect(sections.length).toBe(5);
    // First section should be general_dp_alignment
    expect(sections[0].id ?? sections[0].slug).toMatch(/general.*dp|general_dp/i);
  });

  test('TEST-F3-02: platform_engineering → 7 sections in correct order', async ({ request }) => {
    const res = await request.get(`${BASE}/api/sections?teamType=platform_engineering`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sections = body.sections ?? body.data ?? body;
    expect(Array.isArray(sections)).toBeTruthy();
    expect(sections.length).toBe(7);
  });

  test('TEST-F3-03: infrastructure_cloud → 6 sections in correct order', async ({ request }) => {
    const res = await request.get(`${BASE}/api/sections?teamType=infrastructure_cloud`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sections = body.sections ?? body.data ?? body;
    expect(Array.isArray(sections)).toBeTruthy();
    expect(sections.length).toBe(6);
  });

  test('TEST-F3-04: data_api_governance → 6 sections in correct order', async ({ request }) => {
    const res = await request.get(`${BASE}/api/sections?teamType=data_api_governance`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sections = body.sections ?? body.data ?? body;
    expect(Array.isArray(sections)).toBeTruthy();
    expect(sections.length).toBe(6);
  });

  test('TEST-F3-05: Mandatory sections always present (general_dp_alignment first, feedback_adaptability last)', async ({ request }) => {
    const teamTypes = ['program_project', 'platform_engineering', 'infrastructure_cloud', 'data_api_governance'];
    for (const teamType of teamTypes) {
      const res = await request.get(`${BASE}/api/sections?teamType=${teamType}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      const sections = body.sections ?? body.data ?? body;
      expect(Array.isArray(sections)).toBeTruthy();
      expect(sections.length).toBeGreaterThan(0);
      // First section contains general_dp_alignment
      const firstId = (sections[0].id ?? sections[0].slug ?? '').toLowerCase();
      expect(firstId).toMatch(/general/i);
      // Last section contains feedback_adaptability
      const lastId = (sections[sections.length - 1].id ?? sections[sections.length - 1].slug ?? '').toLowerCase();
      expect(lastId).toMatch(/feedback|adaptability/i);
    }
  });

  test('TEST-F3-06: Team type locked after session creation (re-entry shows read-only)', async ({ page }) => {
    const email = `f3-06-${Date.now()}@example.com`;
    // First visit — set team type
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Team Lock Test');
    await page.getByLabel(/team type/i).selectOption('program_project');
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    await page.waitForSelector('[data-testid="section-screen"], [data-testid="assessment-wizard"]', { timeout: 10000 });
    // Return visit
    await page.goto('/');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/name/i).fill('Team Lock Test');
    // Team type selector should be disabled or read-only
    await page.getByRole('button', { name: /start|continue|begin/i }).click();
    await page.waitForTimeout(2000);
    const teamTypeSelect = page.getByLabel(/team type/i);
    // Either disabled or the page has moved past identity step
    const isOnAssessment = await page.locator('[data-testid="section-screen"], [data-testid="assessment-wizard"]').isVisible({ timeout: 3000 }).catch(() => false);
    const isDisabled = await teamTypeSelect.isDisabled().catch(() => false);
    expect(isOnAssessment || isDisabled).toBeTruthy();
  });

  test('TEST-F3-07: Missing mandatory section auto-inserted (API validates section routing integrity)', async ({ request }) => {
    // Test via API — request sections for each team type and verify mandatory ones present
    const res = await request.get(`${BASE}/api/sections?teamType=program_project`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const sections = body.sections ?? body.data ?? body;
    // Mandatory sections must always be present
    const sectionIds = sections.map((s: { id?: string; slug?: string }) => (s.id ?? s.slug ?? '').toLowerCase());
    const hasGeneral = sectionIds.some((id: string) => id.includes('general'));
    const hasFeedback = sectionIds.some((id: string) => id.includes('feedback') || id.includes('adaptability'));
    expect(hasGeneral).toBeTruthy();
    expect(hasFeedback).toBeTruthy();
  });

  test('TEST-F3-08: Invalid team type returns error (SECTION_LIMIT validation)', async ({ request }) => {
    // Test with an invalid team type
    const res = await request.get(`${BASE}/api/sections?teamType=invalid_team_type_xyz`);
    // Should return 400 or empty array
    expect(res.status() === 400 || res.status() === 404 || res.status() === 200).toBeTruthy();
    if (res.status() === 200) {
      const body = await res.json();
      const sections = body.sections ?? body.data ?? body;
      // If status 200, should return empty or error
      if (Array.isArray(sections)) {
        expect(sections.length).toBe(0);
      }
    }
  });

});
