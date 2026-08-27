# Handoff — Explain Then Check v1

## Independent verification status — **FAIL**

Candidate `6b9945a8b20e642b38dfac330d1b3c70deef9752` was independently verified on 2026-08-27 against <https://explain-then-check.sociobot.in/>. The live JS, CSS, and service-worker bytes match this candidate exactly; the prior deployment-only concern is not present.

The release is nevertheless **FAIL** because an actual service-worker update produces a waiting installed worker but no in-app update toast/button. Users cannot trigger the available `SKIP_WAITING` path, violating the PWA update acceptance requirement. There are also P2 touch-target and deployment cache/manifest-header findings. Full command output, reproduction details, and severities are in `.factory/verification.md`.

## What shipped

- A complete local-first practice loop: create/revisit a concept, write under **what / why / failure case** cues or make a local audio recording, check the explanation yourself, mark multiple precise omissions, choose a retry date, and retry only one missing piece.
- Each retry records the new attempt and asks whether it felt clearer. “Clearer” closes the piece; “not yet” returns it tomorrow. The UI explicitly makes no correctness claim.
- An optional, non-blocking 90-second timer; keyboard-operable forms; auto-saved text drafts; due/upcoming queues; recent practice; retry removal with undo; and specific empty, error, denied-microphone, offline, and destructive-confirmation states.
- IndexedDB persistence with JSON/CSV export, JSON restore, and full deletion. Audio blobs remain local and are intentionally omitted from portable exports.
- An installable PWA with 192/512 maskable-capable icons, a versioned precache assembled from the production output, navigation fallback, cache-first assets, and an update toast.
- Direct `/privacy/` and `/terms/` pages, no analytics, no runtime third-party scripts/fonts, MIT license, sitemap, and robots policy.
- A product-specific surreal editorial system and original “impossible study garden” hero. The generated 1536×1024 source and prompt metadata are retained in `assets/src/`; the shipped WebP is 52 KB. Provenance and review criteria are in `.factory/design.md`.

## How to run and verify

```sh
npm ci
npm test
npm run build
npm run preview
```

- `npm test`: **pass** — 3 unit tests and 4 Chromium end-to-end tests. Browser coverage includes the full explain→mark→retry→clearer path, keyboard entry, draft persistence across reload, JSON export, a 390×844 layout overflow check, direct legal URLs, serious/critical Axe checks, and a real offline reload with `context.setOffline(true)`.
- `npm run build`: **pass** — produces `dist/index.html`; compiled initial assets are 31.65 KB JS (10.93 KB gzip) and 18.25 KB CSS (5.15 KB gzip).
- `npm audit --audit-level=high`: **pass**, 0 vulnerabilities.
- Lighthouse 12.8.2 mobile run against the production preview: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**. LCP 1.4 s, CLS 0, total blocking time 0 ms.
- Visual review performed at 1440×1000 and 390×844. The selected illustration was checked for unwanted text, logos, people, seams, and misleading UI.

## Known limits / next steps

- Audio is intentionally device-only and absent from exports; users who need a durable audio archive must retain it separately.
- There are no OS-level reminder notifications. Due pieces surface when the app opens, keeping v1 permission-light and offline.
- Browser storage can be evicted by the browser or cleared by the user. The UI and privacy page recommend exports for important records.
- The brief’s adoption targets cannot be measured without tracking. The data model records local retry counts and clearer outcomes, so a future opt-in, privacy-preserving aggregate could be added if evidence warrants it.
