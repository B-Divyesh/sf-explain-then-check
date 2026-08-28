# Independent verification 2 — FAIL

**Candidate:** `8a0777b611596c1f1fc299003a06ed907596d167` (`8a0777b`)

**Live URL:** <https://explain-then-check.sociobot.in/>  
**Verified:** 2026-08-28 UTC  
**Verdict:** **FAIL** — the candidate application is functional and the live application bytes match it, but the live static host does not apply the response-policy configuration required for this PWA. In particular, it does not provide immutable asset caching, no-store service-worker revalidation, the manifest media type, or the configured browser-hardening headers.

This is fresh evidence, not a reliance on the prior report. The former actionable service-worker-update defect is fixed.

## Candidate, install, and build

The checkout was clean and at the candidate SHA before testing.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean dependency install | PASS | `npm ci` installed 72 packages; audit reported 0 vulnerabilities. |
| Unit/integration/browser suite | PASS | `npm test`: 3 Vitest tests and 7 Chromium Playwright tests passed. |
| Type check and exact production build | PASS | `npm run build` ran `tsc --noEmit`, Vite production build, and service-worker generation successfully. No lint script exists. |
| Dependency audit | PASS | `npm audit --audit-level=high`: 0 vulnerabilities. |
| Build budget | PASS | Initial JS: 32,125 B / 11,050 B gzip; CSS: 18,303 B / 5,150 B gzip; hero WebP: 52,308 B. All are within the 200 KB JS, 50 KB CSS, and 300 KB hero budgets. |
| Lighthouse (live, mobile) | PASS | Lighthouse 13: Performance 96, Accessibility 100, Best Practices 100, SEO 100; LCP 1,208 ms, CLS 0, TBT 241 ms. |

## Live identity

The deployment is the candidate artifact, despite the prior handoff saying publication was pending:

| File | Local SHA-256 | Live SHA-256 | Result |
| --- | --- | --- | --- |
| `assets/main-BBpWre9R.js` | `70adb37d648b0bc649b53614c78298b4e0d8e8063511dc0098d4cb82e4dcaf1f` | same | PASS |
| `assets/main-Bbv9DN4z.css` | `fbc814a24598b992d08e4b64804d6bfbd9444c62b5139f870a492b30018ee47a` | same | PASS |
| `sw.js` | `08a872879bd3bf010da7fa28cd93e1d02ad57ca8cc37e46b6252349f9823e813` | same | PASS |

The live HTML references exactly `main-BBpWre9R.js` and `main-Bbv9DN4z.css`, the hashes produced by this candidate build.

## Independent product exercise

Fresh Chromium contexts exercised the live HTTPS site, with local browser storage isolated from real users.

- Whitespace-only concept input showed “Name a concept before you begin”; a 150-character value was constrained to the 100-character boundary; valid input then began a practice.
- An incomplete explanation showed its recovery error. A complete **what / why / failure case** explanation was saved; two omissions were scheduled (one today and one tomorrow).
- Empty retry input showed its recovery error. The today item was retried, marked **Not yet**, practiced early, then marked **Yes, clearer**. The future item remained independently available.
- JSON export succeeded. Both malformed JSON (clear parse feedback) and a valid version-1 JSON backup were tested. Valid import displayed the specific replacement confirmation and restored the concept. Delete-all displayed the record-count confirmation and cleared the notebook.
- No automated correctness claim appeared in the practice or reflection loop. Audio is represented as an explicit local-only option and export data excludes it, consistent with the privacy policy and source/data-path review.

## Browser, accessibility, privacy, and PWA checks

- Desktop (1440×1000) and 390×844 mobile completed without horizontal overflow. The brand and footer links measured at least 44×44 CSS px.
- Keyboard smoke test: first Tab reached the skip link; its visible focus was `3px solid rgb(138, 115, 222)`. No keyboard trap was encountered in the exercised flows.
- With reduced motion emulated, button transition duration was `1e-05s` (the intended effectively instant reduced-motion rule).
- Axe on the live home screen found **0 serious/critical** violations. The live pages had `lang=en`, one `main`, one `h1`, title, labelled form fields, and direct `/privacy/` and `/terms/` routes.
- Normal live product exercise produced no browser console errors or page errors. Resource capture saw only `https://explain-then-check.sociobot.in`; source review likewise found no analytics, third-party scripts/fonts, or app-data egress. Practice data remains in IndexedDB/localStorage; microphone access is only requested by the explicit record action.
- At 390×844, after service-worker control, offline reload rendered the app heading and `Offline · saved locally` state.
- An independent local production-artifact service-worker update probe changed only `sw.js`, called `registration.update()`, observed the visible “A fresh version is ready.” update control, clicked it, and verified `waiting: false` with a controller after reload. The prior PWA update defect is fixed.

## Defects

### P1 — live deployment does not meet required PWA cache/response policy

**Status:** open; acceptance-blocking.

The candidate correctly ships `dist/_headers`, but the live host does not apply it. All tested paths — `/`, hashed JS/CSS, `sw.js`, manifest, privacy, and terms — return:

```text
Cache-Control: public, must-revalidate, max-age=30
```

This fails the product’s PWA/performance contract: hashed assets must have long-lived immutable caching and `sw.js` must be revalidated with `no-cache, no-store, must-revalidate`. The short uniform policy weakens normal static caching and makes the service-worker update policy host-dependent. The deployed build needs host-specific static-header configuration (or a host that honors the shipped configuration), then live re-verification.

### P2 — live manifest is served with the wrong media type

**Status:** open.

`/manifest.webmanifest` returns `Content-Type: application/octet-stream`, not the required `application/manifest+json; charset=utf-8`. Chromium currently accepts it, but it is not a correct PWA response policy.

### P2 — configured browser hardening headers are absent live

**Status:** open.

The live deployment has HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`, but does **not** send the candidate’s configured CSP, `Permissions-Policy`, or `X-Frame-Options` / `frame-ancestors` protection. This leaves a local-data application less protected than its shipped deployment policy specifies.

## Exact live header evidence

At verification time, the above 30-second cache policy was identical on root HTML, hashed JS/CSS, service worker, manifest, privacy, and terms. Root/HTML, JS, CSS, and `sw.js` had appropriate base content types; only the manifest was `application/octet-stream`. No CSP, Permissions-Policy, X-Frame-Options, or equivalent `frame-ancestors` header was present.

## Required next step

Configure the actual static deployment platform to emit the rules in `dist/_headers` (or translate them to that platform’s native configuration), deploy, and repeat live-header checks. Do not change the already-passing product loop or service-worker update behavior merely to resolve this hosting-policy failure.
