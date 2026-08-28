import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

async function startUpdateServer(): Promise<{ origin: string; publishUpdate: () => void; close: () => Promise<void> }> {
  const dist = resolve(process.cwd(), 'dist');
  let updated = false;
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const relativePath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = resolve(dist, `.${relativePath}`);
    if (!file.startsWith(`${dist}/`)) { response.writeHead(403).end(); return; }
    try {
      const info = await stat(file);
      if (info.isDirectory()) { response.writeHead(404).end(); return; }
      let body = await readFile(file);
      if (pathname === '/sw.js' && updated) body = Buffer.concat([body, Buffer.from('\n// update-test-v2')]);
      const type = pathname.endsWith('.js') ? 'application/javascript' : pathname.endsWith('.css') ? 'text/css' : pathname.endsWith('.webmanifest') ? 'application/manifest+json' : pathname.endsWith('.html') || pathname.endsWith('/') ? 'text/html' : 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start update test server.');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    publishUpdate: () => { updated = true; },
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  };
}

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

test('offers and applies an update when a new service worker is waiting', async ({ browser }) => {
  const server = await startUpdateServer();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(server.origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

    server.publishUpdate();
    await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
    await expect(page.getByText('A fresh version is ready.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update' })).toBeVisible();

    const refreshed = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
    await page.getByRole('button', { name: 'Update' }).click();
    await refreshed;
    await page.waitForLoadState('domcontentloaded');
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return !registration.waiting && Boolean(navigator.serviceWorker.controller);
    })).toBe(true);
  } finally {
    await context.close();
    await server.close();
  }
});

test('keeps desktop home and legal links at the 44px target minimum', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const dimensions = await page.locator('.brand, .site-footer a').evaluateAll((links) => links.map((link) => {
    const { width, height } = link.getBoundingClientRect();
    return { width, height };
  }));
  expect(dimensions).toHaveLength(3);
  for (const { width, height } of dimensions) {
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});

test('ships static-host cache, manifest, and hardening policies', async () => {
  const headers = await readFile(resolve(process.cwd(), 'public/_headers'), 'utf8');
  expect(headers).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable');
  expect(headers).toContain('/manifest.webmanifest\n  Cache-Control: public, max-age=86400, must-revalidate\n  Content-Type: application/manifest+json; charset=utf-8');
  expect(headers).toContain('/sw.js\n  Cache-Control: no-cache, no-store, must-revalidate');
  expect(headers).toContain("Content-Security-Policy: default-src 'self'");
  expect(headers).toContain('Permissions-Policy: camera=(), geolocation=(), microphone=(self), payment=(), usb=()');
  expect(headers).toContain('X-Frame-Options: DENY');
});

test('ships the Azure Static Web Apps response-policy configuration in the deployment artifact', async () => {
  const configuration = JSON.parse(await readFile(resolve(process.cwd(), 'dist/staticwebapp.config.json'), 'utf8')) as {
    globalHeaders: Record<string, string>;
    mimeTypes: Record<string, string>;
    navigationFallback: { rewrite: string; exclude: string[] };
    routes: Array<{ route: string; headers: Record<string, string> }>;
  };
  const headersFor = (route: string) => configuration.routes.find((rule) => rule.route === route)?.headers;

  expect(configuration.navigationFallback).toEqual(expect.objectContaining({
    rewrite: '/index.html',
    exclude: expect.arrayContaining(['/assets/*', '/sw.js', '/manifest.webmanifest'])
  }));
  expect(configuration.globalHeaders).toMatchObject({
    'Content-Security-Policy': expect.stringContaining("default-src 'self'"),
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  expect(configuration.mimeTypes['.webmanifest']).toBe('application/manifest+json; charset=utf-8');
  expect(headersFor('/assets/*')?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
  expect(headersFor('/sw.js')?.['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
  expect(headersFor('/manifest.webmanifest')?.['Cache-Control']).toBe('public, max-age=86400, must-revalidate');
  expect(headersFor('/*')?.['Cache-Control']).toBe('no-cache, must-revalidate');
});

test('serves privacy and terms at their direct paths', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByText('no analytics, advertising')).toBeVisible();
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1, name: 'Terms' })).toBeVisible();
  await expect(page.getByText('No automated grading')).toBeVisible();
});
