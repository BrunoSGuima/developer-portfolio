import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.0–2.2 A/AA plus axe's best practices: the Step 10 baseline is zero violations. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

export async function expectNoA11yViolations(page: Page, context: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (violation) =>
      `${violation.impact ?? 'unknown'} ${violation.id}: ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n'),
  );
  expect(report, `axe violations on ${context}`).toEqual([]);
}
