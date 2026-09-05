# Explain Then Check

Explain Then Check helps technical self-learners explain a concept in their own
words. Write what it is, why it works, and one failure case. Mark only the
piece you missed. Retry that piece later.

Use the one-click demo at https://explain-then-check.sociobot.in/demo. It loads
a completed rate-limiting practice and a due retry. The Demo banner says that
sample data is not saved, lets you reset it, and lets you start with your real
notebook.

The tool has no account, grading, tracking, or payment step. Text records use browser storage. Optional audio is stored in
IndexedDB and stays out of JSON and CSV exports. You can export JSON or CSV,
restore a valid JSON backup, and delete local records.

Live: https://explain-then-check.sociobot.in

## Run locally

Requirements: Node.js 20+ and npm.

~~~
npm ci
npm run dev
~~~

Vite prints a local URL, normally http://localhost:5173.

## Test and build

~~~
npm test
npm run build
npm run preview
~~~

The production artifact is dist/ with index.html at its root. Browser tests
serve dist/ through the product's Static Web Apps route and CSP policy.

Every public product promise is listed in .factory/claims.json. Run one claim
from a clean install with its exact test command. For example:

~~~
npm run test:e2e -- --grep @claim:offline-reload
~~~

Run all claim commands after npm ci. Playwright is pinned to 1.58.2. If
Chromium is missing, install it once with npx playwright install chromium.

## Data and offline behavior

- Records use IndexedDB. Draft text uses localStorage and survives refresh.
- The service worker caches the app shell. The demo reloads offline after its
  first online visit.
- JSON is the portable text backup. CSV is an export format. Audio is not
  exported.
- The app shows an Update action when a newer service worker is waiting.

## Deploy

Deploy dist/ to the configured Azure Static Web Apps product. The artifact
includes staticwebapp.config.json with known application routes, a 404 rewrite,
cache rules, MIME mapping, CSP, and security headers. It also contains
_headers for compatible static hosts. Serve over HTTPS for service workers and
microphone capture.

No environment variables or backend are required.

Research: .factory/brief.json. Visual rationale and image provenance:
.factory/design.md. Demo details: .factory/demo.md. Verification handoff:
.factory/handoff.md.

## License

MIT. See LICENSE.
