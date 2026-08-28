import './style.css';
import { data, openDatabase } from './db';
import type { Attempt, Concept, ExplanationPart, Omission } from './types';
import { dueDate, escapeHtml, exportCsv, formatDate, isDue, makeId, PART_LABELS, relativeDue, validImport } from './utils';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('The application root is missing.');
const app: HTMLDivElement = appRoot;

let concepts: Concept[] = [];
let attempts: Attempt[] = [];
let omissions: Omission[] = [];
let activeAudio: Blob | undefined;
let recorder: MediaRecorder | undefined;
let recordingStream: MediaStream | undefined;
let timerInterval: number | undefined;
let timerStartedAt: number | undefined;
let checkStage = false;
let omissionRows = 1;
let retryReflectStage = false;
let toastTimeout: number | undefined;
let updateReady = false;
let updateRegistration: ServiceWorkerRegistration | undefined;

const live = document.createElement('div');
live.className = 'sr-only';
live.setAttribute('aria-live', 'polite');
live.setAttribute('aria-atomic', 'true');
document.body.append(live);

function announce(message: string): void {
  live.textContent = '';
  window.setTimeout(() => { live.textContent = message; }, 30);
}

function navLink(href: string, label: string, current = false): string {
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
}

function shell(content: string, page = 'app'): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" data-nav aria-label="Explain Then Check home">
        <svg aria-hidden="true" viewBox="0 0 48 48"><path d="M7 9h34v25H24l-10 8v-8H7V9Z"/><circle cx="34" cy="27" r="4"/></svg>
        <span>Explain<br>Then Check</span>
      </a>
      <nav aria-label="Primary">
        ${navLink('/', 'Practice', page === 'app')}
        ${navLink('/privacy/', 'Privacy', page === 'privacy')}
      </nav>
      <span class="network-state" id="network-state" role="status">${navigator.onLine ? 'Saved locally' : 'Offline · saved locally'}</span>
    </header>
    ${content}
    <footer class="site-footer">
      <p>Your practice stays in this browser. No account, grading, or tracking.</p>
      <div>${navLink('/privacy/', 'Privacy')} ${navLink('/terms/', 'Terms')}</div>
      <p class="art-credit">Original generated study-garden artwork.</p>
    </footer>
    <div id="toast-region" class="toast-region" aria-live="polite"></div>`;
}

function navigate(path: string): void {
  history.pushState({}, '', path);
  checkStage = false;
  retryReflectStage = false;
  activeAudio = undefined;
  cleanupRuntime();
  void render();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function practicePath(id: string): string { return `/#/practice/${encodeURIComponent(id)}`; }
function retryPath(id: string): string { return `/#/retry/${encodeURIComponent(id)}`; }

function setupNav(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.origin === location.origin) {
        event.preventDefault();
        navigate(link.pathname);
      }
    });
  });
}

function cleanupRuntime(): void {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = undefined;
  timerStartedAt = undefined;
  if (recorder?.state === 'recording') recorder.stop();
  recordingStream?.getTracks().forEach((track) => track.stop());
  recorder = undefined;
  recordingStream = undefined;
}

async function refreshData(): Promise<void> {
  [concepts, attempts, omissions] = await Promise.all([data.concepts(), data.attempts(), data.omissions()]);
  concepts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  omissions.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function hero(): string {
  return `<section class="hero" aria-labelledby="home-title">
    <div class="hero-copy">
      <p class="eyebrow">Recognition is not explanation.</p>
      <h1 id="home-title">Say what you know.<br><em>Find what went missing.</em></h1>
      <p class="hero-lede">A private 90-second practice: explain the what, why, and failure case—then return only to the pieces you missed.</p>
      <a class="button button-coral" href="#new-concept">Choose a concept <span aria-hidden="true">↓</span></a>
      <p class="assurance"><span aria-hidden="true">◌</span> No AI grading. Your judgment leads.</p>
    </div>
    <figure>
      <img src="/art/study-garden.webp" width="1200" height="800" alt="A moonlit paper garden where floating blank notes approach a monumental listening ear." fetchpriority="high" decoding="async">
      <figcaption>Explain into the open. Return to the gap.</figcaption>
    </figure>
  </section>`;
}

function homeScreen(): string {
  const pending = omissions.filter((item) => item.status === 'pending');
  const due = pending.filter((item) => isDue(item.dueAt));
  const later = pending.filter((item) => !isDue(item.dueAt));
  const recent = attempts.slice(0, 3);
  const conceptOptions = concepts.map((concept) => {
    const openCount = pending.filter((item) => item.conceptId === concept.id).length;
    return `<li class="concept-row">
      <div><strong>${escapeHtml(concept.title)}</strong><span>${concept.lastPracticedAt ? `Last practiced ${formatDate(concept.lastPracticedAt)}` : 'Not practiced yet'}${openCount ? ` · ${openCount} piece${openCount === 1 ? '' : 's'} to retry` : ''}</span></div>
      <button class="text-button" data-practice="${concept.id}">Explain again <span aria-hidden="true">→</span></button>
    </li>`;
  }).join('');
  const retryItems = [...due, ...later].map((item) => {
    const concept = concepts.find((entry) => entry.id === item.conceptId);
    return `<li class="retry-slip ${isDue(item.dueAt) ? 'is-due' : ''}">
      <div class="retry-marker" aria-hidden="true"></div>
      <div><p class="slip-meta">${escapeHtml(concept?.title ?? 'Unknown concept')} · ${escapeHtml(PART_LABELS[item.part])}</p><strong>${escapeHtml(item.text)}</strong><span>${relativeDue(item.dueAt)} · tried ${item.retryCount} time${item.retryCount === 1 ? '' : 's'}</span></div>
      <button class="button button-small" data-retry="${item.id}">${isDue(item.dueAt) ? 'Retry piece' : 'Practice early'}</button>
      <button class="icon-button" data-delete-omission="${item.id}" aria-label="Remove retry: ${escapeHtml(item.text)}">×</button>
    </li>`;
  }).join('');
  const recentItems = recent.map((attempt) => {
    const concept = concepts.find((entry) => entry.id === attempt.conceptId);
    return `<li><span>${attempt.kind === 'retry' ? 'Piece retried' : 'Full explanation'}</span><strong>${escapeHtml(concept?.title ?? 'Deleted concept')}</strong><time datetime="${attempt.createdAt}">${formatDate(attempt.createdAt)}</time></li>`;
  }).join('');

  return shell(`<main id="main">
    ${hero()}
    <section class="practice-desk" id="new-concept" aria-labelledby="desk-title">
      <div class="section-heading"><div><p class="eyebrow dark">Your practice desk</p><h2 id="desk-title">What will you explain?</h2></div><p>Pick something narrow enough to explain in a minute or two.</p></div>
      <form id="concept-form" class="concept-form">
        <label for="concept-title">Concept or mechanism</label>
        <div><input id="concept-title" name="title" maxlength="100" required autocomplete="off" placeholder="e.g. Consistent hashing"><button class="button" type="submit">Begin explanation</button></div>
        <p class="field-hint">A protocol, grammar rule, design decision, or anything you want to understand—not just recognize.</p>
        <p class="form-error" id="concept-error" role="alert"></p>
      </form>
      ${concepts.length ? `<div class="saved-concepts"><h3>Or return to a concept</h3><ul>${conceptOptions}</ul></div>` : `<div class="empty-note"><span aria-hidden="true">✦</span><div><strong>Your desk is clear.</strong><p>Add one concept above. Nothing is uploaded or shared.</p></div></div>`}
    </section>
    <section class="return-section" aria-labelledby="return-title">
      <div class="section-heading"><div><p class="eyebrow dark">The return path</p><h2 id="return-title">Small pieces, when they’re due.</h2></div><p>${pending.length ? `${due.length} due now · ${later.length} coming later` : 'Only what you mark missing appears here.'}</p></div>
      ${pending.length ? `<ul class="retry-list">${retryItems}</ul>` : `<div class="empty-return"><div class="empty-orbit" aria-hidden="true"><i></i></div><div><h3>No pieces waiting.</h3><p>Finish an explanation and mark any gap you notice. That exact piece—not the whole topic—will return here.</p></div></div>`}
    </section>
    <section class="local-section" aria-labelledby="local-title">
      <div><p class="eyebrow dark">Local notebook</p><h2 id="local-title">You own the record.</h2><p>Export a portable copy, restore one later, or erase everything. Audio stays on this device and is left out of exports.</p></div>
      <div class="data-actions">
        <button class="button button-outline" id="export-json">Export JSON</button>
        <button class="button button-outline" id="export-csv">Export CSV</button>
        <label class="button button-outline" for="import-json">Import JSON</label><input class="sr-only" id="import-json" type="file" accept="application/json,.json">
        <button class="text-button danger" id="delete-all">Delete all data</button>
      </div>
      ${recent.length ? `<div class="recent"><h3>Recent practice</h3><ul>${recentItems}</ul></div>` : ''}
    </section>
  </main>`, 'app');
}

function progress(step: 1 | 2 | 3): string {
  return `<ol class="progress" aria-label="Practice progress">
    <li class="${step >= 1 ? 'active' : ''}" ${step === 1 ? 'aria-current="step"' : ''}><span>1</span> Explain</li>
    <li class="${step >= 2 ? 'active' : ''}" ${step === 2 ? 'aria-current="step"' : ''}><span>2</span> Check yourself</li>
    <li class="${step >= 3 ? 'active' : ''}" ${step === 3 ? 'aria-current="step"' : ''}><span>3</span> Return</li>
  </ol>`;
}

function audioControls(): string {
  return `<div class="audio-controls">
    <button type="button" class="button button-outline record-button" id="record-audio"><span class="record-dot" aria-hidden="true"></span> Record instead</button>
    <button type="button" class="button button-outline" id="stop-audio" hidden>Stop recording</button>
    <span id="audio-status">Audio never leaves this device.</span>
    <audio id="audio-preview" controls hidden></audio>
  </div>`;
}

function practiceScreen(concept: Concept): string {
  const saved = loadDraft(concept.id);
  const step = checkStage ? 2 : 1;
  const rows = Array.from({ length: omissionRows }, (_, index) => omissionMarkup(index)).join('');

  return shell(`<main id="main" class="session-main">
@@CONTENT@@
  </main>`, 'app').replace('@@CONTENT@@', `
    <div class="session-top"><button class="text-button back-button" id="back-home"><span aria-hidden="true">←</span> Practice desk</button>${progress(step)}</div>
    <section class="session-header" aria-labelledby="practice-title"><p class="eyebrow dark">Explain without peeking</p><h1 id="practice-title">${escapeHtml(concept.title)}</h1><p>This is a rehearsal, not a test. Say what you currently understand; you’ll choose the gaps.</p></section>
    ${checkStage ? `<form id="check-form" class="paper check-paper">
      <div class="paper-number">02</div><div><p class="eyebrow dark">Check yourself</p><h2>What went missing?</h2><p>Read your explanation once. Name only the smallest pieces worth another attempt.</p></div>
      <div class="explanation-review">
        <article><h3>What it is</h3><p>${escapeHtml(saved.what || 'Recorded in audio')}</p></article>
        <article><h3>Why it works</h3><p>${escapeHtml(saved.why || 'Recorded in audio')}</p></article>
        <article><h3>Failure case</h3><p>${escapeHtml(saved.failure || 'Recorded in audio')}</p></article>
      </div>
      <div id="omission-list" class="omission-list">${rows}</div>
      <button type="button" class="text-button" id="add-omission">+ Add another missing piece</button>
      <div class="paper-actions"><button class="button button-outline" type="button" id="edit-explanation">Edit explanation</button><button class="button" type="submit">Schedule missing pieces</button></div>
      <p class="field-hint">If nothing meaningful is missing, leave the fields blank and finish. You are the judge—this app does not verify correctness.</p>
    </form>` : `<form id="explain-form" class="paper">
      <div class="paper-number">01</div><div><p class="eyebrow dark">Your own words</p><h2>Build the explanation.</h2><p>Keep it compact. One or two sentences under each cue is enough.</p></div>
      <div class="timer-block"><div class="timer-ring" id="timer-ring" style="--progress:0"><span id="timer-value">1:30</span></div><div><strong>90-second focus</strong><p>Optional. The page won’t lock when time is up.</p><button type="button" class="text-button" id="start-timer">Start timer</button></div></div>
      <div class="prompt-field"><label for="what"><span>What</span> What is it, in plain language?</label><textarea id="what" name="what" rows="4" maxlength="1200" placeholder="Start with the essential definition…">${escapeHtml(saved.what)}</textarea></div>
      <div class="prompt-field"><label for="why"><span>Why</span> What makes it work?</label><textarea id="why" name="why" rows="4" maxlength="1200" placeholder="Describe the mechanism or causal chain…">${escapeHtml(saved.why)}</textarea></div>
      <div class="prompt-field"><label for="failure"><span>Edge</span> Where does it fail or trade something off?</label><textarea id="failure" name="failure" rows="4" maxlength="1200" placeholder="Name a boundary, cost, or counterexample…">${escapeHtml(saved.failure)}</textarea></div>
      <div class="or-divider"><span>or speak through all three cues</span></div>${audioControls()}
      <p class="form-error" id="explain-error" role="alert"></p>
      <div class="paper-actions"><button class="button" type="submit">Check my explanation <span aria-hidden="true">→</span></button></div>
    </form>`}`);
}

function omissionMarkup(index: number): string {
  return `<div class="omission-row">
    <label for="omission-${index}">Missing piece ${index + 1}</label>
    <textarea id="omission-${index}" data-omission rows="2" maxlength="300" placeholder="The smallest thing you skipped or blurred…"></textarea>
    <div class="omission-options"><label>It belongs under <select data-part><option value="what">What it is</option><option value="why">Why it works</option><option value="failure">Failure case</option></select></label><label>Bring it back <select data-delay><option value="0">today</option><option value="1" selected>tomorrow</option><option value="3">in 3 days</option><option value="7">in 1 week</option></select></label></div>
  </div>`;
}

function retryScreen(omission: Omission, concept: Concept): string {
  const source = attempts.find((attempt) => attempt.id === omission.sourceAttemptId);
  const answer = loadRetryDraft(omission.id);
  return shell(`<main id="main" class="session-main">
    <div class="session-top"><button class="text-button back-button" id="back-home"><span aria-hidden="true">←</span> Return path</button>${progress(retryReflectStage ? 3 : 1)}</div>
    <section class="session-header compact" aria-labelledby="retry-title"><p class="eyebrow dark">${escapeHtml(concept.title)} · ${escapeHtml(PART_LABELS[omission.part])}</p><h1 id="retry-title">Explain just this piece.</h1><p>Smaller is deliberate: retrieve the gap, not the entire topic.</p></section>
    <section class="paper retry-paper">
      <div class="paper-number">↺</div>
      <div class="retry-prompt"><p class="eyebrow dark">You marked this missing</p><blockquote>${escapeHtml(omission.text)}</blockquote><span>${relativeDue(omission.dueAt)} · retry ${omission.retryCount + 1}</span></div>
      ${retryReflectStage ? `<div class="retry-reflect"><p class="eyebrow dark">Your new explanation</p><p class="answer-copy">${escapeHtml(answer || 'Recorded in audio')}</p>${source ? `<details><summary>See the original ${escapeHtml(PART_LABELS[omission.part].toLowerCase())}</summary><p>${escapeHtml(source[omission.part])}</p></details>` : ''}<h2>Did this attempt feel clearer?</h2><p>No score—just your honest signal for whether to close this piece or return tomorrow.</p><div class="choice-actions"><button class="button button-success" id="mark-clearer">Yes, clearer</button><button class="button button-outline" id="mark-again">Not yet—return tomorrow</button></div></div>` : `<form id="retry-form"><label for="retry-answer">Explain it now, in your own words</label><textarea id="retry-answer" rows="7" maxlength="1200" placeholder="Retrieve before you look anything up…">${escapeHtml(answer)}</textarea><div class="or-divider"><span>or record your explanation</span></div>${audioControls()}<p class="form-error" id="retry-error" role="alert"></p><div class="paper-actions"><button class="button" type="submit">Reflect on this attempt <span aria-hidden="true">→</span></button></div></form>`}
    </section>
  </main>`, 'app');
}

function legalScreen(kind: 'privacy' | 'terms'): string {
  const privacy = `<main id="main" class="legal"><p class="eyebrow dark">Plain-language policy</p><h1>Privacy</h1><p class="legal-lede">Your explanations belong to you. Explain Then Check works without an account or server.</p><h2>What stays on your device</h2><p>Concepts, explanations, missing pieces, retry history, and audio recordings are stored in your browser’s IndexedDB. They are not sent to us. Your browser or operating system may remove local data according to its storage settings.</p><h2>What we collect</h2><p>The app contains no analytics, advertising, tracking pixels, remote fonts, or third-party runtime scripts. The hosting provider may keep standard short-lived request logs for security and reliability.</p><h2>Your controls</h2><p>From the practice desk you can export text data as JSON or CSV, import a JSON backup, and delete all local data. Audio is intentionally excluded from export; use your browser controls if you need to preserve it separately.</p><h2>Permissions and offline use</h2><p>Microphone access is requested only when you choose “Record instead.” You may deny it and type. A service worker caches the app shell so the tool can work offline.</p><p>Effective 27 August 2026. Questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p></main>`;
  const terms = `<main id="main" class="legal"><p class="eyebrow dark">Use agreement</p><h1>Terms</h1><p class="legal-lede">Explain Then Check is a free self-reflection tool, not an authority on whether an explanation is correct.</p><h2>Using the app</h2><p>You may use the app for lawful personal learning. You are responsible for checking important technical, medical, legal, financial, or safety-critical information against reliable sources.</p><h2>No automated grading</h2><p>The app records your own explanations and judgments. “Clearer” means clearer to you; it is not a correctness certificate.</p><h2>Local data and availability</h2><p>Data is held by your browser. Export a backup if it matters to you. The service is provided “as is” without guarantees of uninterrupted availability or data recovery.</p><h2>License</h2><p>The application source is offered under the MIT License. These terms are governed by applicable law.</p><p>Effective 27 August 2026.</p></main>`;
  return shell(kind === 'privacy' ? privacy : terms, kind);
}

function loadDraft(id: string): { what: string; why: string; failure: string } {
  try { return JSON.parse(localStorage.getItem(`etc:draft:${id}`) ?? '') as { what: string; why: string; failure: string }; }
  catch { return { what: '', why: '', failure: '' }; }
}

function saveDraft(id: string, draft: { what: string; why: string; failure: string }): void {
  localStorage.setItem(`etc:draft:${id}`, JSON.stringify(draft));
}

function loadRetryDraft(id: string): string { return localStorage.getItem(`etc:retry:${id}`) ?? ''; }

function route(): { name: 'home' | 'practice' | 'retry' | 'privacy' | 'terms'; id?: string } {
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy') return { name: 'privacy' };
  if (path === '/terms') return { name: 'terms' };
  const appPath = location.hash.startsWith('#/') ? location.hash.slice(1) : path;
  const practice = appPath.match(/^\/practice\/([^/]+)$/);
  if (practice) return { name: 'practice', id: decodeURIComponent(practice[1]) };
  const retry = appPath.match(/^\/retry\/([^/]+)$/);
  if (retry) return { name: 'retry', id: decodeURIComponent(retry[1]) };
  return { name: 'home' };
}

async function render(): Promise<void> {
  try {
    await refreshData();
    const current = route();
    if (current.name === 'privacy' || current.name === 'terms') app.innerHTML = legalScreen(current.name);
    else if (current.name === 'practice') {
      const concept = concepts.find((item) => item.id === current.id);
      if (!concept) { showToast('That concept is no longer in this notebook.'); navigate('/'); return; }
      app.innerHTML = practiceScreen(concept); setupPractice(concept);
    } else if (current.name === 'retry') {
      const omission = omissions.find((item) => item.id === current.id);
      const concept = concepts.find((item) => item.id === omission?.conceptId);
      if (!omission || !concept) { showToast('That retry is no longer available.'); navigate('/'); return; }
      app.innerHTML = retryScreen(omission, concept); setupRetry(omission, concept);
    } else { app.innerHTML = homeScreen(); setupHome(); }
    setupNav();
    updateNetworkState();
    showUpdatePrompt();
  } catch (error) {
    app.innerHTML = shell(`<main id="main" class="error-page"><p class="eyebrow dark">The notebook would not open</p><h1>Your local storage is unavailable.</h1><p>${escapeHtml(error instanceof Error ? error.message : 'The browser blocked its local database.')}</p><p>Check private-browsing or storage settings, then reload. No remote copy exists.</p><button class="button" id="reload-app">Try again</button></main>`);
    document.querySelector<HTMLButtonElement>('#reload-app')?.addEventListener('click', () => location.reload());
    showUpdatePrompt();
  }
}

function setupHome(): void {
  document.querySelector<HTMLFormElement>('#concept-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#concept-title');
    const error = document.querySelector<HTMLElement>('#concept-error');
    const title = input?.value.trim() ?? '';
    if (!title) { if (error) error.textContent = 'Name a concept before you begin.'; input?.focus(); return; }
    const existing = concepts.find((concept) => concept.title.toLowerCase() === title.toLowerCase());
    const concept: Concept = existing ?? { id: makeId('concept'), title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await data.putConcept(concept);
    navigate(practicePath(concept.id));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-practice]').forEach((button) => button.addEventListener('click', () => navigate(practicePath(button.dataset.practice ?? ''))));
  document.querySelectorAll<HTMLButtonElement>('[data-retry]').forEach((button) => button.addEventListener('click', () => navigate(retryPath(button.dataset.retry ?? ''))));
  document.querySelectorAll<HTMLButtonElement>('[data-delete-omission]').forEach((button) => button.addEventListener('click', async () => {
    const item = omissions.find((entry) => entry.id === button.dataset.deleteOmission);
    if (!item) return;
    await data.deleteOmission(item.id); await refreshData(); app.innerHTML = homeScreen(); setupHome(); setupNav();
    showToast('Retry removed.', 'Undo', async () => { await data.putOmission(item); await render(); announce('Retry restored.'); });
  }));
  document.querySelector('#export-json')?.addEventListener('click', async () => download('explain-then-check.json', JSON.stringify(await data.export(), null, 2), 'application/json'));
  document.querySelector('#export-csv')?.addEventListener('click', async () => download('explain-then-check.csv', exportCsv(await data.export()), 'text/csv'));
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', importData);
  document.querySelector('#delete-all')?.addEventListener('click', deleteEverything);
}

function setupPractice(concept: Concept): void {
  document.querySelector('#back-home')?.addEventListener('click', () => navigate('/'));
  if (checkStage) {
    document.querySelector('#add-omission')?.addEventListener('click', () => {
      document.querySelector('#omission-list')?.insertAdjacentHTML('beforeend', omissionMarkup(omissionRows));
      omissionRows += 1;
      document.querySelector<HTMLTextAreaElement>(`#omission-${omissionRows - 1}`)?.focus();
    });
    document.querySelector('#edit-explanation')?.addEventListener('click', () => { checkStage = false; void render(); });
    document.querySelector<HTMLFormElement>('#check-form')?.addEventListener('submit', (event) => finishExplanation(event, concept));
    return;
  }
  const form = document.querySelector<HTMLFormElement>('#explain-form');
  const update = () => saveDraft(concept.id, {
    what: form?.what.value ?? '', why: form?.why.value ?? '', failure: form?.failure.value ?? ''
  });
  form?.addEventListener('input', update);
  form?.addEventListener('submit', (event) => {
    event.preventDefault(); update();
    const draft = loadDraft(concept.id);
    const completeText = draft.what.trim() && draft.why.trim() && draft.failure.trim();
    if (!completeText && !activeAudio) {
      const error = document.querySelector<HTMLElement>('#explain-error');
      if (error) error.textContent = 'Complete all three written cues, or record one explanation that covers them.';
      (document.querySelector('textarea:placeholder-shown') as HTMLTextAreaElement | null)?.focus(); return;
    }
    checkStage = true; omissionRows = 1; void render();
  });
  document.querySelector('#start-timer')?.addEventListener('click', startTimer);
  setupAudio();
}

async function finishExplanation(event: SubmitEvent, concept: Concept): Promise<void> {
  event.preventDefault();
  const draft = loadDraft(concept.id);
  const now = new Date().toISOString();
  const attempt: Attempt = { id: makeId('attempt'), conceptId: concept.id, kind: 'full', createdAt: now, ...draft, audio: activeAudio };
  await data.putAttempt(attempt);
  const rows = [...document.querySelectorAll<HTMLElement>('.omission-row')];
  let count = 0;
  for (const row of rows) {
    const text = row.querySelector<HTMLTextAreaElement>('[data-omission]')?.value.trim() ?? '';
    if (!text) continue;
    const part = (row.querySelector<HTMLSelectElement>('[data-part]')?.value ?? 'what') as ExplanationPart;
    const delay = Number(row.querySelector<HTMLSelectElement>('[data-delay]')?.value ?? 1);
    await data.putOmission({ id: makeId('omission'), conceptId: concept.id, sourceAttemptId: attempt.id, text, part, createdAt: now, dueAt: dueDate(delay), status: 'pending', retryCount: 0 });
    count += 1;
  }
  await data.putConcept({ ...concept, updatedAt: now, lastPracticedAt: now });
  localStorage.removeItem(`etc:draft:${concept.id}`);
  checkStage = false; activeAudio = undefined; navigate('/');
  window.setTimeout(() => showToast(count ? `${count} missing piece${count === 1 ? '' : 's'} scheduled.` : 'Explanation saved. Nothing scheduled.'), 50);
}

function setupRetry(omission: Omission, concept: Concept): void {
  document.querySelector('#back-home')?.addEventListener('click', () => navigate('/'));
  if (retryReflectStage) {
    document.querySelector('#mark-clearer')?.addEventListener('click', () => finishRetry(omission, concept, true));
    document.querySelector('#mark-again')?.addEventListener('click', () => finishRetry(omission, concept, false));
    return;
  }
  const input = document.querySelector<HTMLTextAreaElement>('#retry-answer');
  input?.addEventListener('input', () => localStorage.setItem(`etc:retry:${omission.id}`, input.value));
  document.querySelector<HTMLFormElement>('#retry-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = input?.value.trim() ?? '';
    if (!answer && !activeAudio) { const error = document.querySelector<HTMLElement>('#retry-error'); if (error) error.textContent = 'Write or record your explanation before reflecting.'; input?.focus(); return; }
    retryReflectStage = true; void render();
  });
  setupAudio();
}

async function finishRetry(omission: Omission, concept: Concept, clearer: boolean): Promise<void> {
  const answer = loadRetryDraft(omission.id);
  const now = new Date().toISOString();
  await data.putAttempt({ id: makeId('attempt'), conceptId: concept.id, kind: 'retry', createdAt: now, what: omission.part === 'what' ? answer : '', why: omission.part === 'why' ? answer : '', failure: omission.part === 'failure' ? answer : '', omissionId: omission.id, clearer, audio: activeAudio });
  await data.putOmission({ ...omission, status: clearer ? 'clearer' : 'pending', completedAt: clearer ? now : undefined, dueAt: clearer ? omission.dueAt : dueDate(1), retryCount: omission.retryCount + 1 });
  await data.putConcept({ ...concept, updatedAt: now, lastPracticedAt: now });
  localStorage.removeItem(`etc:retry:${omission.id}`); retryReflectStage = false; activeAudio = undefined;
  navigate('/'); window.setTimeout(() => showToast(clearer ? 'Piece closed as clearer.' : 'Piece scheduled for tomorrow.'), 50);
}

function startTimer(): void {
  if (timerStartedAt) return;
  timerStartedAt = Date.now();
  const button = document.querySelector<HTMLButtonElement>('#start-timer'); if (button) { button.textContent = 'Timer running'; button.disabled = true; }
  const tick = () => {
    const elapsed = Math.floor((Date.now() - (timerStartedAt ?? Date.now())) / 1000);
    const remaining = Math.max(0, 90 - elapsed);
    const value = document.querySelector('#timer-value'); if (value) value.textContent = remaining ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Done';
    const ring = document.querySelector<HTMLElement>('#timer-ring'); if (ring) ring.style.setProperty('--progress', `${Math.min(100, elapsed / 90 * 100)}`);
    if (!remaining && timerInterval) { window.clearInterval(timerInterval); timerInterval = undefined; announce('Ninety seconds are up. Continue if useful.'); }
  };
  tick(); timerInterval = window.setInterval(tick, 1000);
}

function setupAudio(): void {
  const record = document.querySelector<HTMLButtonElement>('#record-audio');
  const stop = document.querySelector<HTMLButtonElement>('#stop-audio');
  const status = document.querySelector<HTMLElement>('#audio-status');
  record?.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { if (status) status.textContent = 'Audio recording is not supported here. You can type instead.'; return; }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      recorder = new MediaRecorder(recordingStream);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        activeAudio = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
        recordingStream?.getTracks().forEach((track) => track.stop());
        const preview = document.querySelector<HTMLAudioElement>('#audio-preview');
        if (preview) { preview.src = URL.createObjectURL(activeAudio); preview.hidden = false; }
        if (status) status.textContent = 'Recorded locally. Play it back before checking.';
        if (record) record.hidden = false; if (stop) stop.hidden = true;
      };
      recorder.start(); record.hidden = true; if (stop) stop.hidden = false; if (status) status.textContent = 'Recording… speak through all three cues.';
      announce('Recording started.');
    } catch { if (status) status.textContent = 'Microphone access was not available. Allow it in browser settings, or type instead.'; }
  });
  stop?.addEventListener('click', () => { if (recorder?.state === 'recording') { recorder.stop(); announce('Recording stopped.'); } });
}

async function importData(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0]; if (!file) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (!validImport(parsed)) throw new Error('This is not an Explain Then Check version 1 backup.');
    if (!confirm(`Replace this notebook with ${parsed.concepts.length} concept${parsed.concepts.length === 1 ? '' : 's'} from the backup?`)) return;
    await data.replace(parsed); await render(); showToast('Backup imported.');
  } catch (error) { showToast(error instanceof Error ? error.message : 'The backup could not be read.'); }
  input.value = '';
}

async function deleteEverything(): Promise<void> {
  const total = concepts.length + attempts.length + omissions.length;
  if (!confirm(`Delete all local practice data (${total} record${total === 1 ? '' : 's'})? This cannot be undone.`)) return;
  await data.clear();
  Object.keys(localStorage).filter((key) => key.startsWith('etc:')).forEach((key) => localStorage.removeItem(key));
  await render(); showToast('All local practice data deleted.');
}

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  announce(`${name} exported.`);
}

function showToast(message: string, action?: string, handler?: () => void): void {
  if (toastTimeout) window.clearTimeout(toastTimeout);
  const region = document.querySelector<HTMLElement>('#toast-region'); if (!region) return;
  region.innerHTML = `<div class="toast"><span>${escapeHtml(message)}</span>${action ? `<button>${escapeHtml(action)}</button>` : ''}</div>`;
  const button = region.querySelector('button'); if (button && handler) button.addEventListener('click', () => { handler(); region.innerHTML = ''; });
  toastTimeout = window.setTimeout(() => { region.innerHTML = ''; }, 6500);
}

function showUpdatePrompt(): void {
  if (!updateReady || !updateRegistration?.waiting) return;
  const region = document.querySelector<HTMLElement>('#toast-region');
  if (!region) return;
  region.innerHTML = '<div class="toast toast-update"><span>A fresh version is ready.</span><button type="button">Update</button></div>';
  region.querySelector('button')?.addEventListener('click', () => {
    updateReady = false;
    updateRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    region.innerHTML = '<div class="toast"><span>Updating your practice garden…</span></div>';
  });
}

function updateNetworkState(): void {
  const state = document.querySelector('#network-state');
  if (state) state.textContent = navigator.onLine ? 'Saved locally' : 'Offline · saved locally';
  document.body.classList.toggle('is-offline', !navigator.onLine);
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  const registration = await navigator.serviceWorker.register('/sw.js');
  const offerUpdate = () => { updateReady = true; updateRegistration = registration; showUpdatePrompt(); };
  if (registration.waiting) offerUpdate();
  registration.addEventListener('updatefound', () => {
    // Keep this worker reference: registration.installing becomes null once it moves to waiting.
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) offerUpdate();
    });
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !refreshing) { refreshing = true; location.reload(); } });
}

window.addEventListener('popstate', () => { cleanupRuntime(); checkStage = false; retryReflectStage = false; void render(); });
window.addEventListener('online', updateNetworkState);
window.addEventListener('offline', updateNetworkState);

void openDatabase().then(render);
void registerServiceWorker();
