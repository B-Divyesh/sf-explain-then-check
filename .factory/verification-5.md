# Explain Then Check verification 5 — FAIL

**Verification date:** 2026-09-05 UTC  
**Live URL:** <https://explain-then-check.sociobot.in>  
**Implementation candidate:** `26588a06987050341bdbb1c2d0856bb8c94c6869` (`fix: add isolated demo and verifiable claims`)  
**Documentation/test SHA reviewed:** `3d888f477a2ebaf8fed5c74d087788488c1f8cc0` (`docs: record live release mismatch`)  
**Verdict:** **FAIL — 1 P1 finding; 0 untested claims.**

The later commits after the implementation candidate change only `.factory/handoff.md` and one browser test. The live HTML references `main-CwRpv_Nj.js` and `main-BLKiScXC.css`; their SHA-256 values match the production build from this checkout exactly. This is therefore a live defect in the implementation candidate, not a stale deployment or a failed deployment wrapper.

## Job, audience, and first action

Before scrolling in fresh desktop and phone contexts, the page states the job as **“Explain a concept in your own words.”** It names **technical self-learners who recognize topics but want to explain them clearly**. The first primary action is **“Try it with sample data”**; it says it will show a completed practice and retry.

## Passed checks

- Clean setup: `npm ci` passed (72 packages; audit found 0 vulnerabilities).
- Quality gates: `npm test` passed (3 unit tests and 22 production-artifact Chromium tests); `npm run build` passed; `npm audit --audit-level=high` passed.
- Claims registry: 20 claims, 20 unique `@claim:` tests, no missing or extra tags. All 20 exact commands declared in `.factory/claims.json` were run from this clean checkout and passed, including `offline-reload`, `app-shell-cache`, and `pwa-update`.
- Live identity: built/live SHA-256 matched for `main-CwRpv_Nj.js` (`211d86683070b72fd83fb3da55ba4c3e2aa375c9230baa85dde2c8f2ec90115a`), `main-BLKiScXC.css` (`661bdbcaf7a2a55b33cc5f00e835d280a51a8844ade33cd6bbb9efdbc3703713`), and `sw.js` (`e5a8e083f6ff421e7ae1713badfc0c55401333191847672a8d2d84b03f215b17`).
- Fresh desktop and iPhone-sized browser checks: the `/demo` action immediately showed the completed Rate limiting practice and focused retry; the persistent banner read **“Demo — sample data, nothing is saved.”** Reset restored the sample, and Start for real returned to an empty real notebook. Requests stayed on the product origin; no console/page errors appeared.
- Normal/recovery paths: completed the sample retry and marked it clearer; reset restored it. Live invalid/recovery checks showed the whitespace error, enforced the 100-character concept boundary, rejected an incomplete three-cue explanation, then saved a completed no-omission explanation.
- Keyboard/accessibility: first Tab reached the visible `3px` iris skip-link focus ring. Route changes focused `#practice-title` / `#retry-title`. Live Axe Playwright checks found zero serious or critical violations. `verify-url.sh` passed on `/demo`: title, `lang=en`, one h1, main landmark, image alt, labeled buttons, and zero console errors.
- Phone: 390px-equivalent fresh context had 0px horizontal overflow. Reduced-motion styling was `1e-05s` transition duration.
- Routes: `/privacy/` and `/terms/` had their correct route titles and h1s. The deliberate unknown URL returned HTTP 404 with the designed Page not found page; this is expected, not a defect. Headers and manifest MIME remain present.
- Earlier findings: the one-click demo, claim registry, plain first screen, real routes/titles/focus/metadata/404, CSP console error, touch targets, response headers, and update-flow regression are resolved in source and the live normal flows. The prior offline/update finding is reopened below because the deployed service worker cannot finish installation.

## Finding

### F-01 — P1: Live service worker cannot install, so the offline and app-shell claims are false in production

The generated `sw.js` precaches `/staticwebapp.config.json`. The live Azure Static Web Apps host deliberately does not serve that deployment configuration file: `GET /staticwebapp.config.json` returns the designed HTTP 404. `cache.addAll()` rejects when that entry is fetched, so the worker is observed but does not retain a registration or take control.

Fresh live browser evidence after five seconds:

```json
{
  "workers": ["https://explain-then-check.sociobot.in/sw.js"],
  "registrations": [],
  "controller": false,
  "ready": false,
  "caches": ["etc-9457e2817ea8"],
  "cachedEntries": [],
  "staticwebappConfigStatus": 404
}
```

Consequently, the product cannot satisfy the public claims **“The demo works offline after its first visit”** and **“The app shell is cached after the first visit”** on the live product. The claim commands pass only because the repository's local `serve-dist.mjs` serves `dist/staticwebapp.config.json` as a normal file, unlike Azure. The same failed worker also prevents the live app from offering an update to a running installed version.

Repair the service-worker generation/precache list to exclude deployment-only configuration files (at minimum `staticwebapp.config.json`; review `_headers` too), then add a browser test which serves the production artifact with that file unavailable and confirms a controlled offline reload. Re-run the exact live check after deployment.

## Scope and evidence

This is a static local-first PWA. It has no backend tenant, persistence restart, health endpoint, rate limit, CLI, library, or desktop artifact; those checks do not apply. No product code was changed during this verification.

Evidence is retained under `/work/.evidence/live-verify-5/`, including desktop/phone screenshots, route-path results, the verify-url result, identity hashes, and PWA installation result.
