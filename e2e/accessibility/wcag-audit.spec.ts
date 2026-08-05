import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsRespondent } from '../helpers/auth';
import { loginAsSystemOwner } from '../helpers/auth';

test.describe('Accessibility: WCAG 2.1 AA Audit', () => {

  test('WCAG-01: Landing page (identity form) has no critical WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-testid="skip-link"]') // Skip any known acceptable exceptions
      .analyze();
    // Filter to critical violations only (impact: critical, serious)
    const criticalViolations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    if (criticalViolations.length > 0) {
      console.log('WCAG violations found:', JSON.stringify(criticalViolations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map(n => n.html).slice(0, 2),
      })), null, 2));
    }
    expect(criticalViolations).toHaveLength(0);
  });

  test('WCAG-02: Assessment section screen has no critical WCAG 2.1 AA violations', async ({ page }) => {
    await loginAsRespondent(page, {
      email: `wcag-a11y-${Date.now()}@example.com`,
      name: 'A11y Test User',
      teamType: 'program_project',
    });
    // Wait for first section to fully load
    await page.waitForSelector('[data-testid="section-screen"], form', { timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const criticalViolations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations).toHaveLength(0);
  });

  test('WCAG-03: Dashboard response list has no critical WCAG 2.1 AA violations', async ({ page }) => {
    await loginAsSystemOwner(page);
    await page.waitForSelector('table, [data-testid="response-table"]', { timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const criticalViolations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations).toHaveLength(0);
  });

  test('WCAG-04: Progress bar has ARIA labels for screen reader accessibility', async ({ page }) => {
    await loginAsRespondent(page, {
      email: `wcag-progress-${Date.now()}@example.com`,
      name: 'Progress A11y',
      teamType: 'program_project',
    });
    // Progress bar must have aria-label or aria-labelledby
    const progressBar = page.locator('[role="progressbar"], [aria-label*="section"], [data-testid="progress-bar"]').first();
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    const ariaLabel = await progressBar.getAttribute('aria-label');
    const ariaLabelledby = await progressBar.getAttribute('aria-labelledby');
    expect(ariaLabel || ariaLabelledby).toBeTruthy();
  });

  test('WCAG-05: Likert scale keyboard navigation (arrow keys) works as per WCAG 2.1 AA', async ({ page }) => {
    await loginAsRespondent(page, {
      email: `wcag-likert-${Date.now()}@example.com`,
      name: 'Likert A11y',
      teamType: 'program_project',
    });
    // Find Likert radio group
    const likertRadios = page.locator('[data-testid="likert-question"] input[type="radio"], [data-question-type="likert"] input[type="radio"]');
    if (await likertRadios.count() > 0) {
      await likertRadios.first().focus();
      await page.keyboard.press('ArrowRight');
      // Second radio should now be focused/checked
      const secondRadio = likertRadios.nth(1);
      const isChecked = await secondRadio.isChecked();
      const isFocused = await secondRadio.evaluate(el => el === document.activeElement);
      expect(isChecked || isFocused).toBeTruthy();
    }
  });

});
