import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('completes the explain, mark, retry, and clearer loop', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');

  await expect(page).toHaveTitle(/Explain Then Check/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('img:not([alt])')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Say what you know');

  await page.getByLabel('Concept or mechanism').fill('Consistent hashing');
  await page.getByRole('button', { name: 'Begin explanation' }).click();
  await expect(page).toHaveURL(/#\/practice\//);

  await page.getByLabel('What is it, in plain language?').fill('A ring maps keys and servers into the same space.');
  await page.getByLabel('What makes it work?').fill('A key moves only when its next clockwise server changes.');
  await page.getByLabel('Where does it fail or trade something off?').fill('Uneven placement can create hot spots.');
  await page.getByRole('button', { name: /Check my explanation/ }).click();

  await expect(page.getByRole('heading', { name: 'What went missing?' })).toBeVisible();
  await page.getByLabel('Missing piece 1').fill('Virtual nodes smooth uneven load');
  await page.getByLabel('It belongs under').selectOption('why');
  await page.getByLabel('Bring it back').selectOption('0');
  await page.getByRole('button', { name: 'Schedule missing pieces' }).click();

  await expect(page.getByText('Virtual nodes smooth uneven load')).toBeVisible();
  await page.getByRole('button', { name: 'Retry piece' }).click();
  await page.getByLabel('Explain it now, in your own words').fill('Many virtual positions make each physical server own several small ranges.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  await expect(page.getByRole('heading', { name: 'Did this attempt feel clearer?' })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, clearer' }).click();

  await expect(page.getByRole('heading', { name: 'No pieces waiting.' })).toBeVisible();
  await expect(page.getByText('Piece retried')).toBeVisible();
  expect(errors).toEqual([]);
});

test('supports keyboard entry, draft persistence, export, and serious accessibility checks', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Concept or mechanism').focus();
  await page.keyboard.type('TCP congestion control');
  await page.keyboard.press('Enter');
  await page.getByLabel('What is it, in plain language?').fill('A sender adjusts its rate from network feedback.');
  await page.reload();
  await expect(page.getByLabel('What is it, in plain language?')).toHaveValue('A sender adjusts its rate from network feedback.');

  await page.goto('/');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('explain-then-check.json');

  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(severe).toEqual([]);
});

test('works at 390px and reloads offline after installation', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.reload();
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Say what you know');
  await expect(page.locator('#network-state')).toContainText('Offline');
  await context.setOffline(false);
});

test('serves privacy and terms at their direct paths', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByText('no analytics, advertising')).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms' })).toBeVisible();
  await expect(page.getByText('No automated grading')).toBeVisible();
});
