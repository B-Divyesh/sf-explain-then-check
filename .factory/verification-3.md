# Independent verification 3 — PASS

**Candidate:** `714778d70ea7e14203c5e5049aad248eacc37dd4` (`docs: record response policy repair verification`)  
**Public URL:** <https://explain-then-check.sociobot.in>  
**Verified:** 2026-08-28 UTC  
**Verdict:** **PASS — no release-blocking defects found.**

This was a fresh, independent verification from a clean checkout at the candidate commit. Product source was not modified. The only changes made by this verification are this report and the handoff status.

## Contract coverage

The supplied researched brief requires a local-first, non-grading practice loop: select a concept, explain what/why/failure case, identify omissions yourself, schedule only those omissions, retry them, and record whether the retry felt clearer. It also requires local audio by default, export/delete, no tracking, and offline PWA behavior.

The production build and live application meet that contract. The product does not claim correctness or automate grading. It keeps text/audio in browser storage, exports text (not audio), provides JSON/CSV export, JSON restore, and confirmed deletion.

## Clean install, tests, type check, build

Executed in `/work/repo` at the candidate:

```sh
npm ci
npm test
npm run build
npm audit --audit-level=high
```

Results:

- `npm ci`: passed; 72 packages installed; audit reported 0 vulnerabilities.
- `npm test`: passed — 3 Vitest unit tests and 8 Chromium Playwright tests. The browser suite includes the complete explain → omission → retry → clearer flow, draft recovery, export, 390px offline reload, real waiting-worker update activation, Axe serious/critical scan, target sizing, direct legal routes, and deployed response-policy artifact assertions.
- `npm run build`: passed — `tsc --noEmit`, Vite production build, and service-worker generation. There is no separate lint script in `package.json`; the TypeScript check is part of the exact build.
- `npm audit --audit-level=high`: passed; 0 vulnerabilities.
- `dist/` was produced with `index.html` at its root.

Production payloads are within the static-PWA budget: JS 32.13 KB / 11.05 KB gzip, CSS 18.30 KB / 5.15 KB gzip, and hero WebP 52.3 KB. No external font is shipped.

## Independent product exercise

Additional fresh Chromium checks against the built artifact covered:

- Normal case: **Rate limiting** entered as a concept; all what/why/failure fields completed; **Burst capacity** marked as a missing piece; scheduled for today; retried; then selected **Not yet—return tomorrow**. The retry changed from `Due today · tried 0 times` to `Due tomorrow · tried 1 time`.
- Boundaries and recovery: empty concept field received native required validation; whitespace-only title showed `Name a concept before you begin.`; submitting an incomplete explanation showed the explicit three-cue recovery message; an empty retry showed the explicit write-or-record recovery message.
- Invalid import: malformed JSON produced its parse error and a structurally wrong backup produced `This is not an Explain Then Check version 1 backup.`; neither replaced data.
- Data controls: an individual retry removal was restored through **Undo**; confirmed **Delete all data** returned to `Your desk is clear.`. The confirmation names the record count.
- Audio privacy/fallback: a denied microphone request displayed `Microphone access was not available… You can type instead.` and produced no HTTP request. Audio is stored in IndexedDB and omitted from export by code and product copy.
- Keyboard and visual accessibility: keyboard Tab reached the skip link with the designed `rgb(138, 115, 222) solid 3px` focus outline. Desktop footer/home controls meet the 44px target test. At 390×844 there was 0px horizontal overflow; body text was 16px. With reduced motion, the hero transition duration was `1e-05s`.
- Local PWA behavior: after service-worker control, offline reload at 390×844 rendered the application h1 and `Offline · saved locally`. The automated update test creates a genuinely waiting worker, exposes the **Update** toast, activates it, and reloads successfully.

No console errors or page errors occurred in either local browser exercise. Axe found no serious or critical violations.

## Privacy, network, response policy

Fresh request capture on both the built artifact and live site found no outbound HTTP(S) requests; all application assets stayed same-origin. Source and the privacy page declare no analytics, advertising, remote fonts, tracking pixels, or third-party runtime scripts. The live CSP restricts connection, script, style, worker, manifest, image, and media sources to the self origin (with only local `data:`/`blob:` image/media allowances).

Live `HEAD` checks confirmed the Azure-native policy is active:

| Resource | Observed live policy |
| --- | --- |
| `/`, `/privacy/`, `/terms/`, `/offline.html` | `Cache-Control: no-cache, must-revalidate` |
| hashed JS/CSS, `/art/study-garden.webp` | `Cache-Control: public, max-age=31536000, immutable` |
| `/sw.js` | `Cache-Control: no-cache, no-store, must-revalidate` |
| `/manifest.webmanifest` | `Content-Type: application/manifest+json; charset=utf-8`; `Cache-Control: public, max-age=86400, must-revalidate` |

Each sampled response also carried CSP, `Permissions-Policy: camera=(), geolocation=(), microphone=(self), payment=(), usb=()`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict referrer policy, and HSTS. This resolves the previously reported deployment-only response-policy failure.

## Live deployment identity and browser check

The live root references `assets/main-BBpWre9R.js` and `assets/main-Bbv9DN4z.css`, exactly the locally built artifact names. SHA-256 equality was verified:

| File | SHA-256 |
| --- | --- |
| `assets/main-BBpWre9R.js` | `70adb37d648b0bc649b53614c78298b4e0d8e8063511dc0098d4cb82e4dcaf1f` |
| `assets/main-Bbv9DN4z.css` | `fbc814a24598b992d08e4b64804d6bfbd9444c62b5139f870a492b30018ee47a` |
| `sw.js` | `2ef3f03a96cd66c7a86bad6b0a38a63dbb5ce3860e85aa45aad945bebf9eec8f` |

Live Chromium at 1440×1000 confirmed title, `lang=en`, exactly one `<main>` and `<h1>`, manifest link, direct `/privacy/` and `/terms/` rendering, zero console/page errors, zero serious/critical Axe findings, and no outbound requests. Live Chromium at 390×844 had 0px overflow, respected reduced motion, and successfully reloaded offline once service-worker controlled.

Live mobile Lighthouse 13.4.1: Performance **96**, Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.1 s**, CLS **0**, TBT **230 ms**.

## Defects

None found.

| Severity | Count | Notes |
| --- | ---: | --- |
| P0 / blocker | 0 | — |
| P1 / major | 0 | — |
| P2 / minor | 0 | — |
| P3 / polish | 0 | — |

## Remaining product limits (intentional)

- Audio remains device-only and is intentionally excluded from portable text exports.
- There are no OS-level reminder notifications; due pieces appear when the learner reopens the app.
- Browser-managed local storage can be cleared or evicted; users should export important text records.
