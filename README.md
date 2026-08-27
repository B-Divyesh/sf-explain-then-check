# Explain Then Check

Explain Then Check is a local-first practice tool for technical self-learners who can recognize a topic but want to know whether they can explain it. A practice has three cues—what it is, why it works, and a failure case—followed by a learner-led check. Only the pieces the learner marks missing are scheduled for a focused retry.

There is no answer grading, generated lecture, account, or classroom. Data and optional audio stay in the browser. Text records can be exported as JSON or CSV, restored from JSON, or deleted.

Live: <https://explain-then-check.sociobot.in>

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Test and build

```sh
npm test          # unit + Playwright end-to-end, accessibility, mobile, offline
npm run build     # exact production build; output is dist/
npm run preview   # serve the built app on http://127.0.0.1:4173
```

Playwright is pinned to 1.58.2. If its Chromium binary is not already present, run `npx playwright install chromium` once.

`npm run assets` regenerates the committed WebP and PNG derivatives from the retained hero source. It is not needed for a normal build.

## Deploy

Upload the contents of `dist/` to any static host. `index.html`, `privacy/index.html`, and `terms/index.html` are emitted at their respective roots. Serve files over HTTPS so microphone capture and service-worker installation are available. No environment variables or backend are required.

## Data and offline behavior

- Concepts, attempts, omissions, retry outcomes, and recordings use IndexedDB.
- In-progress text drafts use localStorage and survive a refresh.
- JSON export/import is the complete portable text format. CSV is a readable analysis format. Audio remains device-only and is not exported.
- The service worker precaches the built shell and applies network-first navigation plus cache-first static assets.

Product research is in [`.factory/brief.json`](.factory/brief.json), visual rationale and image provenance in [`.factory/design.md`](.factory/design.md), and verification details in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
