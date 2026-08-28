# Handoff — Explain Then Check

## Independent verification 3 — PASS

Candidate `714778d70ea7e14203c5e5049aad248eacc37dd4` is **PASS** for release at <https://explain-then-check.sociobot.in>. On 2026-08-28 UTC, a clean-install independent QA run passed all available tests, the exact production build and TypeScript check, security audit, product-path/error/recovery checks, live desktop/mobile accessibility and privacy checks, service-worker update/offline reload, bundle budgets, response policies, and live artifact identity. No defects were found.

The public deployment matches the candidate build exactly: JS, CSS, and service-worker SHA-256 values match the locally built artifact. The previously deployment-only Azure response-policy failure is no longer present: immutable asset caching, service-worker no-store, manifest MIME/cache behavior, CSP, permissions policy, frame protection, nosniff, referrer policy, and HSTS were observed on live responses.

Run locally with `npm ci && npm test && npm run build`; serve `dist/` with `npm run preview`. Full exact evidence, hashes, test coverage, Lighthouse results, and intentional limits are in [`.factory/verification-3.md`](verification-3.md).

---

# Historical builder handoff — Explain Then Check repair 2

## Release status — REPAIRED, DEPLOYED, AND LIVE-VERIFIED

This repair resolves every open finding in independent verifier report `ec062a3d627044ccd56f94d37b5094456e3a9081` for candidate `8a0777b611596c1f1fc299003a06ed907596d167`. Repair commit: `0ce4319d5f7d592b631f77271d523fb9d69a4a69` (`fix: ship Azure static response policy`). It was pushed to `origin/main` and deployed through the factory static deployment work order to <https://explain-then-check.sociobot.in> on 2026-08-28 UTC.

## Root cause and repair

The candidate included `public/_headers`, but the work-order deployment is **Azure Static Web Apps**, which ignores that Cloudflare/Netlify-style file. Without a host-native configuration, the deploy script generated a minimal fallback and Azure served every route with a 30-second cache policy, an octet-stream manifest, and no configured hardening headers.

Added `public/staticwebapp.config.json`, which Vite copies to `dist/staticwebapp.config.json` at the Azure-required artifact root. It retains the existing portable `_headers` policy for compatible hosts and adds the Azure-native equivalent:

- Immutable one-year cache policy for `/assets/*`, `/art/*`, and `/icons/*`.
- `no-cache, no-store, must-revalidate` for `/sw.js`; no-cache document routes.
- `application/manifest+json; charset=utf-8` mapping for `.webmanifest`.
- CSP, `Permissions-Policy`, `X-Frame-Options: DENY`, `nosniff`, and strict referrer policy on all static responses.
- Navigation-fallback exclusions for PWA assets, service worker, manifest, and offline/legal static files.

No practice-loop, data model, privacy behavior, or visual-system behavior changed.

## Regression coverage

`tests/e2e/app.spec.ts` now parses `dist/staticwebapp.config.json` and asserts the Azure fallback/exclusions, security headers, manifest MIME mapping, immutable assets, service-worker no-store policy, manifest revalidation policy, and document no-cache route. This catches the prior root cause—shipping only `_headers`—before deployment.

Existing end-to-end coverage remains for explain → omission → retry → clearer, keyboard/draft/export, 390px offline reload, real waiting-service-worker update activation, Axe serious/critical scan, 44px desktop target sizes, direct legal routes, and portable `_headers` policy.

## Verification evidence

Executed from a clean dependency install on 2026-08-28 UTC:

```sh
npm ci
npm test
npm run build
npm audit --audit-level=high
```

- `npm ci`: installed 72 packages; audit reported 0 vulnerabilities.
- `npm test`: passed — 3 Vitest tests and 8 Chromium Playwright tests; the production artifact is rebuilt before browser tests.
- `npm run build`: passed `tsc --noEmit`, Vite production build, and service-worker generation. No separate lint script exists. `dist/index.html` is present.
- Production budgets: initial JS 32.13 KB (11.05 KB gzip), CSS 18.30 KB (5.15 KB gzip), hero WebP 52.3 KB.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Azure Static Web Apps CLI consumed the built `dist/` configuration locally and returned the exact immutable, no-store, MIME, document-cache, and security policies.
- Live Chromium desktop pass (1440×1000): title, `lang=en`, one `main`, one `h1`, privacy/terms routes, skip-link keyboard focus (`rgb(138, 115, 222) solid 3px`), reduced-motion transition (`1e-05s`), zero serious/critical Axe violations, zero console/page errors, and requests only to `https://explain-then-check.sociobot.in`.
- Live 390×844 PWA pass: zero horizontal overflow; after service-worker control, offline reload displayed the app h1 and `Offline · saved locally`.
- Lighthouse 13 live mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,009 ms, CLS 0, TBT 70 ms.

### Live response-policy and identity checks

The factory deployment created/used Azure Static Web App `sf-explain-then-check` (`orange-river-093e3d30f.7.azurestaticapps.net`) and the custom hostname above. Live `curl -I` checks now show:

| Path | Verified live policy |
| --- | --- |
| `/` and legal routes | `Cache-Control: no-cache, must-revalidate` plus CSP, Permissions-Policy, and `X-Frame-Options: DENY` |
| `/assets/main-BBpWre9R.js` and CSS | `Cache-Control: public, max-age=31536000, immutable` |
| `/sw.js` | `Cache-Control: no-cache, no-store, must-revalidate` |
| `/manifest.webmanifest` | `Content-Type: application/manifest+json; charset=utf-8`; `Cache-Control: public, max-age=86400, must-revalidate` |

Live SHA-256 identity matched the built artifact:

| File | SHA-256 |
| --- | --- |
| `assets/main-BBpWre9R.js` | `70adb37d648b0bc649b53614c78298b4e0d8e8063511dc0098d4cb82e4dcaf1f` |
| `assets/main-Bbv9DN4z.css` | `fbc814a24598b992d08e4b64804d6bfbd9444c62b5139f870a492b30018ee47a` |
| `sw.js` | `2ef3f03a96cd66c7a86bad6b0a38a63dbb5ce3860e85aa45aad945bebf9eec8f` |

## Known product limits

- Audio remains device-only and intentionally stays out of JSON/CSV exports.
- The app has no OS-level reminders; due pieces appear when the learner opens it.
- Browser storage can be evicted or cleared, so important text records should be exported periodically.

---

# Prior builder handoff — Explain Then Check repair 1 (historical)

## Release status — REPAIR VERIFIED LOCALLY; PUSHED, LIVE PUBLISH PENDING

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

The configured deployment action is the `main` push; `fab74f76443e27b27b4a7b4de1d910b05eac5eac` was pushed to `origin/main` successfully. The production artifact is `dist/` with `index.html` at its root and includes `dist/_headers`.

At 00:53 UTC, repeated live checks still returned the prior candidate asset `main-MJvIny2N.js`, `application/octet-stream` for `/manifest.webmanifest`, and the prior 30-second cache policy. The work order supplies no direct deployment endpoint or credentials beyond the static build/push configuration, so the factory deployment has not surfaced during this worker run. Once the pushed commit is published, verify the live site serves `main-BBpWre9R.js` (or the deployment’s equivalent rebuilt hash), confirm `sw.js` bytes match the new artifact, and confirm `/manifest.webmanifest` is `application/manifest+json`, assets are immutable, and CSP/Permissions-Policy/frame protection headers are present.

## Known product limits

- Audio remains device-only and is intentionally omitted from exports; retain it separately if it must be archived.
- There are no OS-level reminders; due pieces appear on opening the app, avoiding notification permissions.
- Browser storage can be evicted or cleared. Export important text records periodically.
