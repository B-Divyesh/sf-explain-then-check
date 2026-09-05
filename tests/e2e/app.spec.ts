import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

async function startUpdateServer(): Promise<{ origin: string; publishUpdate: () => void; close: () => Promise<void> }> {
  const dist = resolve(process.cwd(), 'dist');
  let updated = false;
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const relativePath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    const file = resolve(dist, '.' + relativePath);
    if (!file.startsWith(dist + '/')) { response.writeHead(403).end(); return; }
    try {
      const info = await stat(file);
      if (info.isDirectory()) { response.writeHead(404).end(); return; }
      let body = await readFile(file);
      if (pathname === '/sw.js' && updated) body = Buffer.concat([body, Buffer.from('\n// update-test-v2')]);
      const type = pathname.endsWith('.js') ? 'application/javascript' : pathname.endsWith('.css') ? 'text/css' : pathname.endsWith('.webmanifest') ? 'application/manifest+json' : pathname.endsWith('.html') || pathname.endsWith('/') ? 'text/html' : 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start update test server.');
  return {
    origin: 'http://127.0.0.1:' + address.port,
    publishUpdate: () => { updated = true; },
    close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done()))
  };
}

async function openDemo(page: Page): Promise<void> {
  await page.goto('/demo');
  await expect(page.getByLabel('Demo mode')).toContainText('sample data, nothing is saved');
  await expect(page.locator('.concept-row strong', { hasText: 'Rate limiting' })).toBeVisible();
}

async function openSamplePractice(page: Page): Promise<void> {
  await openDemo(page);
  await page.getByRole('button', { name: 'Explain again' }).click();
  await expect(page).toHaveURL(/\/demo\/practice\//);
  await expect(page.getByRole('heading', { name: 'Rate limiting' })).toBeVisible();
}

async function openSampleRetry(page: Page): Promise<void> {
  await openDemo(page);
  await page.getByRole('button', { name: 'Retry piece' }).click();
  await expect(page).toHaveURL(/\/demo\/retry\//);
  await expect(page.getByRole('heading', { name: 'Explain this missing piece' })).toBeVisible();
}

async function addAudioAttempt(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolveDb, rejectDb) => {
      const opening = indexedDB.open('demo:explain-then-check');
      opening.onsuccess = () => resolveDb(opening.result);
      opening.onerror = () => rejectDb(opening.error);
    });
    await new Promise<void>((resolveDone, rejectDone) => {
      const transaction = database.transaction('attempts', 'readwrite');
      transaction.objectStore('attempts').put({
        id: 'audio-export-fixture',
        conceptId: 'sample-rate-limiting',
        kind: 'full',
        createdAt: new Date().toISOString(),
        what: 'A local audio fixture.',
        why: '',
        failure: '',
        audio: new Blob(['audio bytes'], { type: 'audio/webm' })
      });
      transaction.oncomplete = () => resolveDone();
      transaction.onerror = () => rejectDone(transaction.error);
    });
    database.close();
  });
}

test('@claim:demo-isolation loads sample output, resets it, and keeps real data separate', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page.getByLabel('Demo mode')).toContainText('sample data, nothing is saved');
  await expect(page.locator('.concept-row strong', { hasText: 'Rate limiting' })).toBeVisible();
  await page.goto('/');
  await page.getByLabel('Concept or mechanism').fill('Real notebook record');
  await page.getByRole('button', { name: 'Begin explanation' }).click();
  await expect(page.getByRole('heading', { name: 'Real notebook record' })).toBeVisible();
  await page.getByRole('link', { name: 'Demo' }).click();
  await expect(page.getByLabel('Demo mode')).toBeVisible();
  await expect(page.locator('.concept-row strong', { hasText: 'Rate limiting' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('How burst capacity changes a token bucket without removing the average limit')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page.getByText('Real notebook record', { exact: true })).toBeVisible();
  await expect(page.getByText('Rate limiting', { exact: true })).toHaveCount(0);
});

test('@claim:private-local keeps a complete demo practice on the same origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await openSampleRetry(page);
  await page.getByLabel('Explain it now, in your own words').fill('A bucket spends tokens and refills them over time.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  await page.getByRole('button', { name: 'Yes, clearer' }).click();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:no-account opens a complete sample practice without a sign-in step', async ({ page }) => {
  await openSampleRetry(page);
  await page.getByLabel('Explain it now, in your own words').fill('This retry opens without an account.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  await expect(page.getByRole('button', { name: 'Yes, clearer' })).toBeVisible();
  await expect(page.getByText(/sign in|create account/i)).toHaveCount(0);
});

test('@claim:no-tracking makes no third-party request during demo use', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('button', { name: 'Retry piece' }).click();
  await page.getByLabel('Explain it now, in your own words').fill('No tracking request is needed for a retry.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  const origin = new URL(page.url()).origin;
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
});

test('@claim:browser-storage persists a demo record across a reload', async ({ page }) => {
  await openDemo(page);
  await page.getByLabel('Concept or mechanism').fill('Browser-only record');
  await page.getByRole('button', { name: 'Begin explanation' }).click();
  await page.goto('/demo');
  await expect(page.getByText('Browser-only record', { exact: true })).toBeVisible();
});

test('@claim:three-cues presents what, why, and failure prompts', async ({ page }) => {
  await openSamplePractice(page);
  await expect(page.getByLabel('What is it, in plain language?')).toBeVisible();
  await expect(page.getByLabel('What makes it work?')).toBeVisible();
  await expect(page.getByLabel('Where does it fail or trade something off?')).toBeVisible();
});

test('@claim:ninety-second-timer completes after 90 seconds', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T12:00:00Z') });
  await openSamplePractice(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.fastForward(90_000);
  await expect(page.locator('#timer-value')).toHaveText('Done');
});

test('@claim:self-assessment lets the learner decide whether a retry is clearer', async ({ page }) => {
  await openSampleRetry(page);
  await page.getByLabel('Explain it now, in your own words').fill('The bucket can carry a limited burst before it rejects requests.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  await expect(page.getByRole('heading', { name: 'Did this attempt feel clearer?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yes, clearer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Not yet—return tomorrow' })).toBeVisible();
});

test('@claim:audio-excluded-from-export excludes an audio record from JSON output', async ({ page }) => {
  await openDemo(page);
  await addAudioAttempt(page);
  await page.reload();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadEvent;
  const file = await download.path();
  expect(file).not.toBeNull();
  const text = await readFile(file as string, 'utf8');
  expect(JSON.parse(text).attempts.some((attempt: Record<string, unknown>) => Object.hasOwn(attempt, 'audio'))).toBe(false);
});

test('@claim:json-export downloads the populated demo as a portable backup', async ({ page }) => {
  await openDemo(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const file = await (await downloadEvent).path();
  const backup = JSON.parse(await readFile(file as string, 'utf8'));
  expect(backup.product).toBe('explain-then-check');
  expect(backup.concepts[0].title).toBe('Rate limiting');
  expect(backup.omissions).toHaveLength(1);
});

test('@claim:csv-export downloads a row for each populated demo record', async ({ page }) => {
  await openDemo(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await (await downloadEvent).path();
  const rows = (await readFile(file as string, 'utf8')).trim().split('\n');
  expect(rows[0]).toContain('record_type');
  expect(rows.length).toBe(5);
  expect(rows.some((row) => row.includes('Rate limiting'))).toBe(true);
});

test('@claim:json-restore replaces demo data with a valid backup', async ({ page }) => {
  await openDemo(page);
  const backup = {
    product: 'explain-then-check', version: 1, exportedAt: new Date().toISOString(), note: '',
    concepts: [{ id: 'restored', title: 'Restored concept', createdAt: '2026-09-05T00:00:00Z', updatedAt: '2026-09-05T00:00:00Z' }],
    attempts: [], omissions: []
  };
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-json').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('Restored concept', { exact: true })).toBeVisible();
  await expect(page.getByText('Rate limiting', { exact: true })).toHaveCount(0);
});

test('@claim:delete-data removes all demo records after confirmation', async ({ page }) => {
  await openDemo(page);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete all data' }).click();
  await expect(page.getByText('Your desk is clear.')).toBeVisible();
  await expect(page.getByText('No pieces waiting.')).toBeVisible();
});

test('@claim:draft-refresh restores an unfinished explanation after reload', async ({ page }) => {
  await openSamplePractice(page);
  await page.getByLabel('What is it, in plain language?').fill('A saved local draft.');
  await page.reload();
  await expect(page.getByLabel('What is it, in plain language?')).toHaveValue('A saved local draft.');
});

test('@claim:offline-reload works offline after the demo first loads', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await openDemo(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Explain a concept in your own words' })).toBeVisible();
    await expect(page.getByLabel('Demo mode')).toBeVisible();
    await expect(page.locator('#network-state')).toContainText('Offline');
  } finally {
    await context.close();
  }
});

test('@claim:app-shell-cache stores the shell after the first visit', async ({ page }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cachedShell = await page.evaluate(async () => {
    const keys = await caches.keys();
    return Promise.all(keys.map(async (key) => Boolean(await caches.open(key).then((cache) => cache.match('/')))));
  });
  expect(cachedShell.some(Boolean)).toBe(true);
});

test('@claim:self-marked-omissions schedules no retry when no gap is entered', async ({ page }) => {
  await openDemo(page);
  await page.getByLabel('Concept or mechanism').fill('Circuit breaker');
  await page.getByRole('button', { name: 'Begin explanation' }).click();
  await page.getByLabel('What is it, in plain language?').fill('A guard that stops calls after repeated failures.');
  await page.getByLabel('What makes it work?').fill('It changes state after failures and later allows a probe.');
  await page.getByLabel('Where does it fail or trade something off?').fill('A wrong threshold can block healthy work.');
  await page.getByRole('button', { name: /Check my explanation/ }).click();
  await page.getByRole('button', { name: 'Schedule missing pieces' }).click();
  await expect(page.getByText('Explanation saved. Nothing scheduled.')).toBeVisible();
  const circuitBreaker = page.locator('.concept-row', { hasText: 'Circuit breaker' });
  await expect(circuitBreaker).toBeVisible();
  await expect(circuitBreaker).not.toContainText('to retry');
});

test('@claim:focused-retry opens only the marked missing piece', async ({ page }) => {
  await openSampleRetry(page);
  await expect(page.getByText('How burst capacity changes a token bucket without removing the average limit')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explain this missing piece' })).toBeVisible();
  await expect(page.getByLabel('What is it, in plain language?')).toHaveCount(0);
});

test('@claim:free-no-paywall completes a sample retry without payment', async ({ page }) => {
  await openSampleRetry(page);
  await page.getByLabel('Explain it now, in your own words').fill('A free sample retry does not need a payment step.');
  await page.getByRole('button', { name: /Reflect on this attempt/ }).click();
  await page.getByRole('button', { name: 'Yes, clearer' }).click();
  await expect(page.getByText('Piece closed as clearer.')).toBeVisible();
  await expect(page.getByText(/payment|upgrade|subscribe/i)).toHaveCount(0);
});

test('handles route metadata, focus changes, the designed 404, and legal metadata', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Explain again' }).click();
  await expect(page).toHaveTitle('Practice — Explain Then Check');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('practice-title');
  const missing = await page.goto('/missing-review-route');
  expect(missing?.status()).toBe(404);
  await expect(page).toHaveTitle('Page not found — Explain Then Check');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/privacy/');
  await expect(page).toHaveTitle('Privacy — Explain Then Check');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://explain-then-check.sociobot.in/privacy/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /explain-then-check-social/);
});

test('has no CSP console errors through the normal practice path and passes key accessibility checks', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await openSamplePractice(page);
  await page.getByRole('button', { name: 'Start timer' }).click();
  await page.getByLabel('What is it, in plain language?').fill('A limit on request rates.');
  await page.getByLabel('What makes it work?').fill('It caps demand before a service overloads.');
  await page.getByLabel('Where does it fail or trade something off?').fill('A bad policy can reject valid traffic.');
  await page.getByRole('button', { name: /Check my explanation/ }).click();
  await expect(page.getByRole('heading', { name: 'What went missing?' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const severe = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(severe).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('@claim:pwa-update offers and applies an update when a new service worker is waiting', async ({ browser }) => {
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
    const refreshed = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
    await page.getByRole('button', { name: 'Update' }).click();
    await refreshed;
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return !registration.waiting && Boolean(navigator.serviceWorker.controller);
    })).toBe(true);
  } finally {
    await context.close();
    await server.close();
  }
});
