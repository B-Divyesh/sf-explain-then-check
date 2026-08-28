import type { ExplanationPart, ExportBundle } from './types';

export const PART_LABELS: Record<ExplanationPart, string> = {
  what: 'What it is',
  why: 'Why it works',
  failure: 'A failure case or trade-off'
};

export function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character] as string);
}

export function dueDate(offsetDays: number, from = new Date()): string {
  // “Today” is an explicit request to retry now, not at a later default hour.
  if (offsetDays === 0) return from.toISOString();
  const due = new Date(from);
  due.setDate(due.getDate() + offsetDays);
  due.setHours(9, 0, 0, 0);
  return due.toISOString();
}

export function isDue(iso: string, now = new Date()): boolean {
  return new Date(iso).getTime() <= now.getTime();
}

export function relativeDue(iso: string, now = new Date()): string {
  const target = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

export function csvCell(value: string | number | boolean | undefined): string {
  const text = value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv(bundle: ExportBundle): string {
  const header = ['record_type', 'concept', 'date', 'part', 'prompt_or_explanation', 'status', 'clearer'];
  const concepts = new Map(bundle.concepts.map((concept) => [concept.id, concept.title]));
  const rows: Array<Array<string | boolean | undefined>> = [];
  for (const attempt of bundle.attempts) {
    const parts: Array<[ExplanationPart, string]> = [['what', attempt.what], ['why', attempt.why], ['failure', attempt.failure]];
    for (const [part, text] of parts) {
      if (text) rows.push(['attempt', concepts.get(attempt.conceptId) ?? '', attempt.createdAt, part, text, attempt.kind, attempt.clearer]);
    }
  }
  for (const omission of bundle.omissions) {
    rows.push(['omission', concepts.get(omission.conceptId) ?? '', omission.createdAt, omission.part, omission.text, omission.status, omission.status === 'clearer']);
  }
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function validImport(value: unknown): value is ExportBundle {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ExportBundle>;
  const isText = (candidate: unknown): candidate is string => typeof candidate === 'string';
  const conceptsValid = Array.isArray(item.concepts) && item.concepts.every((concept) =>
    concept && isText(concept.id) && isText(concept.title) && isText(concept.createdAt) && isText(concept.updatedAt));
  const attemptsValid = Array.isArray(item.attempts) && item.attempts.every((attempt) =>
    attempt && isText(attempt.id) && isText(attempt.conceptId) && isText(attempt.createdAt) &&
    ['full', 'retry'].includes(attempt.kind) && isText(attempt.what) && isText(attempt.why) && isText(attempt.failure));
  const omissionsValid = Array.isArray(item.omissions) && item.omissions.every((omission) =>
    omission && isText(omission.id) && isText(omission.conceptId) && isText(omission.sourceAttemptId) &&
    isText(omission.text) && ['what', 'why', 'failure'].includes(omission.part) && isText(omission.createdAt) &&
    isText(omission.dueAt) && ['pending', 'clearer'].includes(omission.status) && typeof omission.retryCount === 'number');
  return item.product === 'explain-then-check' && item.version === 1 && conceptsValid && attemptsValid && omissionsValid;
}
