# Independent verification — FAIL

**Candidate:** `6b9945a8b20e642b38dfac330d1b3c70deef9752` (`6b9945a`)

**Live URL:** <https://explain-then-check.sociobot.in/>  
**Verification date:** 2026-08-27 UTC  
**Verdict:** **FAIL** — the real PWA update path does not present the required in-app update control. The live deployment itself is the candidate build, so this is a candidate defect rather than the previously reported deployment-only mismatch.

## Environment and quality gates

Started from a clean checkout at the candidate SHA; `git status --short` was clean before verification.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 72 packages installed; audit reported 0 vulnerabilities. |
| Unit and integration tests | PASS | `npm test`: 3 Vitest tests and 4 Chromium Playwright tests passed. |
| Type check / production build | PASS | `npm run build` runs `tsc --noEmit`, Vite build, and service-worker generation successfully. No separate lint script exists. |
| Dependency audit | PASS | `npm audit --audit-level=high`: 0 vulnerabilities. |
| Build budget | PASS | Initial JS 31,653 B (10,900 B gzip), CSS 18,249 B (5,180 B gzip); all well below the 200 KB / 50 KB budgets. Shipped hero WebP is 52,308 B. |
| Live build identity | PASS | Live `index.html` references `main-MJvIny2N.js` and `main-D5lTfyWN.css`, matching `dist`. SHA-256 matched for JS (`a0338207…4022e2`), CSS (`a0f53bd8…d2a741`), and `sw.js` (`c10fe229…50626c7`). |

## Independent product exercise

Using fresh Chromium contexts against the production build and the live HTTPS deployment:

- Created a concept; verified whitespace-only concept rejection and recovery.
- Verified incomplete explain-form rejection; completed **what**, **why**, and **failure/trade-off** explanations; marked a same-day omission; retried it; verified empty-retry rejection; selected “Not yet” and confirmed it moved to tomorrow; exercised removal and Undo.
- Verified JSON export filename and invalid JSON-backup error/recovery. The repository suite separately verifies draft persistence, clear-as-better completion, direct legal routes, audio-free export, and full offline flow.
- At 390×844, live offline reload succeeded after service-worker control: heading rendered and status read `Offline · saved locally`; no horizontal overflow. Reduced-motion computed transition duration was `1e-05s`.
- Keyboard smoke test: first Tab reaches the skip link; it and subsequent links have a visible `rgb(138, 115, 222) solid 3px` focus outline with 4 px offset. No console errors or page errors were observed in normal local or live exercise.
- Repository Axe check passed with zero serious/critical findings. Its scope is the home screen; semantic checks in the same suite confirm title, `lang=en`, one `main`, one `h1`, and image alt text.
- Browser resource capture from the live site saw only `https://explain-then-check.sociobot.in`; source review and capture found no analytics, CDN fonts/scripts, or app data egress. Concepts, attempts, omissions, audio blobs use browser storage only (IndexedDB/localStorage); microphone permission is requested only from the explicit record action.

## PWA update test (blocking)

I served the exact generated `dist/` in an in-memory local HTTP server, registered its service worker, then changed only the response by appending a comment and called `registration.update()`. This is a real service-worker update, not a source-only check.

Observed state after update:

```text
updatefound
active: activated
waiting: installed
controller: activated
toast: undefined
```

The new worker is waiting as expected, but the app never renders “A fresh version is ready.” or an Update button. In `src/main.ts`, the `statechange` callback reads `registration.installing` after installation; by then Chromium has moved it to `waiting`, so the optional chain yields `undefined` and `offerUpdate()` is not called. The user therefore cannot send the supplied `SKIP_WAITING` message. The deployed PWA remains on the prior version until its tabs are closed/reloaded by the browser.

## Defects

### P1 — PWA update is not actionable

**Status:** open; blocks acceptance.

The required update-available toast/button never appears for a waiting service worker, as reproduced above. This violates the PWA contract’s `skipWaiting + clientsClaim + in-app “update available” toast` requirement and leaves a running installed app without a user-directed upgrade path.

### P2 — Desktop touch targets below 44 px

**Status:** open.

At 1440 px, the branded home link is 136.98×40 px, and footer Privacy/Terms links are respectively 47.08×15 px and 38.30×15 px. These miss the stated 44×44 CSS-pixel minimum. (The visually hidden file input was excluded from the actionable target assessment.)

### P2 — Production cache and manifest response policies are not PWA-grade

**Status:** open.

On the live deployment, hashed JS/CSS, HTML, and `sw.js` all return `Cache-Control: public, must-revalidate, max-age=30`; hashed static assets lack the expected long-lived immutable policy. `/manifest.webmanifest` returns `Content-Type: application/octet-stream`, rather than a manifest JSON media type. The PWA works in Chromium today, but these deployment headers do not meet the stated cache/response-policy expectation.

### P3 — Missing browser hardening headers

**Status:** open.

The live site has HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`, but no Content-Security-Policy, Permissions-Policy, or frame-ancestors/X-Frame-Options header. This does not produce a runtime error, but is a reasonable hardening gap for a local-data product.

## Live-header evidence

The live root, JS, legal pages, service worker, and manifest return HTTPS 200 responses with HSTS, `nosniff`, and the referrer policy above. HTML and service worker were correct content types; the manifest was `application/octet-stream`. No CSP/Permissions-Policy/frame protection header was present.

## Recommended next verification

Fix the update listener by retaining the installing worker reference in the `updatefound` handler and checking that worker’s state. Rebuild and redeploy, then repeat the exact update probe until a waiting worker visibly produces the Update toast and clicking it activates the worker/reloads the client. Address the two P2 deployment/accessibility findings in the same release and rerun `npm test`, `npm run build`, live SHA comparison, offline reload, and update test.
