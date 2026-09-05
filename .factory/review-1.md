# Explain Then Check review 1 — FAIL

**Review date:** 2026-09-05 UTC
**Live URL:** <https://explain-then-check.sociobot.in>
**Implementation candidate reviewed:** `0ce4319d5f7d592b631f77271d523fb9d69a4a69` (`fix: ship Azure static response policy`)
**Documentation SHA at review:** `3979c8e99fb30a5e70c1b51e37edf035b77f2378` (`qa: record independent verification 3 pass`)
**Verdict:** **FAIL** — 5 findings, including 2 P1 findings, and 16 untested public claim families.

## Job, audience, and first action

The job is to help technical self-learners explain a concept in their own words, mark a missing part, and retry only that part later. The audience is people who recognise technical flashcards or topics but need deliberate explanation practice. On the live first screen, the first available action is **Choose a concept**, which scrolls to an empty concept form; there is no one-click sample action.

## What was reviewed

This was a no-code-change review. Fresh Chromium desktop (1440×1000) and phone (390×844) contexts visited the live HTTPS product. Browser storage was isolated to the reviewer context; no user data or external product state was changed.

The normal typed loop works in that isolated context: create a concept, complete what/why/failure case, mark a missing piece, schedule it for today, retry it, and choose a clearer outcome. Whitespace-only concepts show `Name a concept before you begin.`; a 101-character input is limited to 100 characters; incomplete explanations and empty retries produce clear recovery messages. A 390px service-worker-controlled context reloaded offline with the application heading and `Offline · saved locally` and had 0px horizontal overflow.

The requested sample exercise could not be run: `/demo` and `/?demo=1` both return the normal empty home screen, with no sample, demo label, reset control, or separate storage namespace.

## Declared command results

The documented prerequisites and commands were run from the clean checkout at the documentation SHA:

| Command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | Installed 72 packages; audit reported 0 vulnerabilities. |
| `npm test` | PASS | 3 Vitest tests and 8 Playwright Chromium tests passed. |
| `npm run build` | PASS | TypeScript check, Vite production build, and service-worker generation passed; `dist/index.html` exists. |
| `npm audit --audit-level=high` | PASS | 0 vulnerabilities. |

There is no `.factory/claims.json`, so there are no declared per-claim commands to run. That absence is itself finding F-02; it means the repository does not supply the required executable proof for its public promises.

The built payload is within the stated budgets: JS 32,125 B (11,017 B gzip), CSS 18,303 B (5,184 B gzip), and hero WebP 52,308 B.

## Live evidence

- Desktop and phone fresh loads: HTTP 200, `lang=en`, one `<main>`, one `<h1>`, visible 3px skip-link focus ring, no horizontal overflow, and no serious or critical Axe violations on the home screen.
- Fresh request capture saw only `https://explain-then-check.sociobot.in`; no third-party runtime request was observed.
- The live root names `main-BBpWre9R.js` and `main-Bbv9DN4z.css`. Their SHA-256 values, and `sw.js`, exactly match the local candidate build:

  | File | SHA-256 |
  | --- | --- |
  | `assets/main-BBpWre9R.js` | `70adb37d648b0bc649b53614c78298b4e0d8e8063511dc0098d4cb82e4dcaf1f` |
  | `assets/main-Bbv9DN4z.css` | `fbc814a24598b992d08e4b64804d6bfbd9444c62b5139f870a492b30018ee47a` |
  | `sw.js` | `2ef3f03a96cd66c7a86bad6b0a38a63dbb5ce3860e85aa45aad945bebf9eec8f` |
- Live response headers now correctly provide immutable hashed assets, `no-cache, no-store, must-revalidate` for `/sw.js`, the manifest JSON media type, CSP, Permissions-Policy, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, and HSTS.
- Direct `/privacy/` and `/terms/` pages render with the correct titles and one main/h1. Their canonical, Open Graph, and Twitter metadata are absent.

## Findings

### F-01 — P1: No one-click, isolated sample sandbox

The required demo is absent. No first-screen **Try it with sample data** action exists. Direct `/demo` and `/?demo=1` both return the normal empty practice desk (HTTP 200), without realistic populated output, a persistent `Demo — sample data, nothing is saved` label, **Reset demo**, **Start for real**, or a separate demo storage namespace. The reviewer therefore could not execute the required sample/reset/no-real-data checks.

Add a realistic `/demo` or `?demo=1` entry that is isolated from real storage, visibly labeled at all times, resettable, and covered in `.factory/demo.md`.

### F-02 — P1: Required claim registry and claim-level proof are missing

`.factory/claims.json` does not exist, and no test is tagged `@claim:<id>`. This leaves **16 distinct public claim families untested under the required claims contract**:

1. Private/no-upload practice data
2. A 90-second practice
3. No AI grading or correctness certificate
4. No account
5. No tracking
6. Browser/IndexedDB storage
7. Audio remains on-device and out of exports
8. JSON export
9. CSV export
10. JSON restore
11. Delete-all control
12. Draft survives refresh
13. Offline use after first visit
14. Service-worker precache/cache behavior
15. Only self-marked omissions are scheduled
16. Retrying the smallest marked piece rather than the whole topic

Some behaviors have general suite coverage, but the contract requires one observable demo-sandbox test and one declared command per public claim. Add the registry, tag each test, and remove or narrow any promise that cannot be proven.

### F-03 — P2: The first screen does not use the required plain job language or sample-first action

The H1, `Say what you know. Find what went missing.`, does not name the job in plain user terms. The page also uses decorative/mood copy such as `Recognition is not explanation` and `Explain into the open. Return to the gap.` The researched audience (technical self-learners) is not named in the first-screen sentence, and the only initial action leads to an empty form rather than the required sample. The required three short facts are not presented as such.

Use a short job-naming H1, name technical self-learners in the supporting sentence, make the sample the primary action, and state the privacy/offline/price facts plainly.

### F-04 — P2: Required route, 404, metadata, and route-change behavior are incomplete

There is no designed 404: `/does-not-exist-review-1` returns HTTP 200 and renders the home screen. `/demo` is also not a real demo route. Practice and retry use hash URLs such as `/#/practice/<id>`; after entering practice the document title remains `Explain Then Check — deliberate explanation practice`, focus is left on `<body>`, and the polite route announcement is empty. This does not meet the requirement for real deep links, route-specific titles, and h1 focus/announcement after route changes.

The home, privacy, and terms pages also lack a canonical link, Open Graph title/image, and Twitter card. Add the real routes and 404 response/design, then set metadata, title, focus, and live announcement on every route.

### F-05 — P2: Live CSP reports a console error during the normal practice path

The live `Content-Security-Policy` correctly disallows inline styles, but entering a valid concept renders `style="--progress:0"` on the timer ring. Chromium logs:

```text
Applying inline style violates the following Content Security Policy directive 'style-src 'self''.
```

The timer still changes after the explicit Start timer action, but this is a console error on an ordinary user flow and conflicts with the quality gate. Remove the inline style attribute (the stylesheet already supplies the default), or change the implementation so it remains CSP-compliant without weakening the policy. Add an end-to-end assertion that records console errors through the practice path under the deployed CSP.

## Earlier findings and current disposition

| Earlier report finding | Current disposition | Current evidence |
| --- | --- | --- |
| Actionable waiting-service-worker update (verification.md P1) | Resolved | `npm test` passes the real waiting-worker/update activation probe. |
| 44px desktop home/footer targets (verification.md P2) | Resolved | `npm test` passes its desktop target-size check. |
| Cache policy, manifest MIME, and browser headers missing live (verification.md / verification-2.md) | Resolved | Live headers now show immutable assets, no-store service worker, `application/manifest+json; charset=utf-8`, CSP, Permissions-Policy, and X-Frame-Options. |
| Documentation-only candidate/live mismatch concern | Resolved | Live JS, CSS, and service-worker hashes match the local implementation build exactly. |
| No prior minor finding about demo/claims/plain wording/site metadata/404 was recorded | New findings | F-01 through F-04 are observed in this review. |

## Scope notes

This static PWA has no backend tenant, health, restart, rate-limit, or CLI/desktop artifact to exercise. No product source was modified. The reports are the only repository changes in this review.

## Required next step

Do not declare release PASS. Implement the demo sandbox and claims registry first, then repair the first-screen, routing/metadata/404, and CSP issues. Re-run each declared claim command from a clean checkout and repeat the fresh live desktop/phone review. A PASS requires zero findings and zero untested claims.
