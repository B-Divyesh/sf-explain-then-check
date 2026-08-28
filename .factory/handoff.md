# Handoff — Explain Then Check repair 1

## Release status — READY FOR STATIC DEPLOY

This repair addresses every finding in independent verifier report `091e1c1d67bf9538325a50c568e0e74b62884b8c` for candidate `6b9945a8b20e642b38dfac330d1b3c70deef9752` without changing the researched brief or the local-first practice loop.

## Repairs made

- **P1 actionable PWA updates:** retained the installing worker captured by `updatefound`, so its eventual `installed` state is detected even after the registration moves it to `waiting`. A persistent “A fresh version is ready.” toast exposes an **Update** button, posts `SKIP_WAITING`, and reloads on `controllerchange`. The production build now derives its cache name from the precache manifest, so a new asset set uses a new cache.
- **P2 44px desktop targets:** the branded home link and both footer legal links now have at least 44×44 CSS-pixel hit areas at 1440px, while retaining the existing compact mobile treatment.
- **P2 response policy:** added the deployable `public/_headers` policy file (copied to `dist/_headers`) for immutable hashed/static assets, no-store service-worker revalidation, manifest JSON media type, and no-cache document routes.
- **P3 browser hardening:** the same host policy adds CSP, `Permissions-Policy` (only the app’s self-origin microphone capability remains enabled), `X-Frame-Options: DENY`, `nosniff`, and a strict referrer policy. The former inline error-page reload handler was converted to an event listener so it works under CSP.
- **Same-day retry correctness:** selecting “today” now makes a retry due immediately rather than at 09:00. This removes the early-day mismatch between the UI choice and its availability while preserving tomorrow/3-day/weekly scheduling.

## Exact verification evidence

Executed from a clean dependency install on 2026-08-28 UTC:

```sh
npm ci
npm test
npm run build
npm audit --audit-level=high
```

- `npm ci`: 72 packages installed; audit reported 0 vulnerabilities.
- `npm test`: **pass** — 3 Vitest unit tests and 7 Chromium Playwright tests.
  - The e2e update regression serves the built `dist/` from a local HTTP server, registers the worker, changes only the `sw.js` response, calls `registration.update()`, verifies the visible update toast/button, clicks it, and verifies the waiting worker activates after reload.
  - Browser checks cover the complete explain → omission → retry → clearer loop, immediate same-day retry, keyboard entry/draft recovery/export, direct legal routes, 390×844 offline reload via `context.setOffline(true)`, zero serious/critical Axe violations, desktop 44px target measurements, and the shipped static response/security policy rules.
- `npm run build`: **pass** — `dist/index.html` is present. Initial compiled JS is 32.13 KB (11.05 KB gzip); CSS is 18.30 KB (5.15 KB gzip); hero WebP remains 52.3 KB.
- `npm audit --audit-level=high`: **pass**, 0 vulnerabilities.
- Lighthouse 12.8.2 mobile against `npm run preview`: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**; LCP 1.1 s, CLS 0, total blocking time 0 ms.
- Local visual/browser review: desktop 1440×1000 and mobile 390×844 tests pass with no horizontal overflow; focus styles remain the designed 3px iris outline. No console/page errors were observed by the end-to-end product-path test.

## Deploy and live checks

Static deployment is triggered from `main`. The production artifact is `dist/` with `index.html` at its root and includes `dist/_headers`; deploy hosts must honor that standard static-host policy file. After the push, verify `https://explain-then-check.sociobot.in/` serves the new hashed JS/CSS and `sw.js` bytes, then confirm `/manifest.webmanifest` is `application/manifest+json`, assets are immutable, and CSP/Permissions-Policy/frame protection headers are present.

## Known product limits

- Audio remains device-only and is intentionally omitted from exports; retain it separately if it must be archived.
- There are no OS-level reminders; due pieces appear on opening the app, avoiding notification permissions.
- Browser storage can be evicted or cleared. Export important text records periodically.
