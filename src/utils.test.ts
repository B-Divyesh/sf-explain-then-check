import { describe, expect, it } from 'vitest';
import type { ExportBundle } from './types';
import { csvCell, dueDate, escapeHtml, exportCsv, isDue, relativeDue, validImport } from './utils';

describe('practice utilities', () => {
  it('escapes learner-authored text before templating', () => {
    expect(escapeHtml('<script>"hello" & goodbye</script>')).toBe('&lt;script&gt;&quot;hello&quot; &amp; goodbye&lt;/script&gt;');
  });

  it('calculates due dates and clear labels', () => {
    const now = new Date('2026-08-27T12:00:00Z');
    expect(isDue('2026-08-27T09:00:00Z', now)).toBe(true);
    expect(relativeDue('2026-08-28T09:00:00Z', now)).toBe('Due tomorrow');
    expect(dueDate(1, now)).toContain('2026-08-28');
  });

  it('quotes CSV cells and exports attempts and omissions', () => {
    expect(csvCell('one, "two"')).toBe('"one, ""two"""');
    const bundle: ExportBundle = {
      product: 'explain-then-check', version: 1, exportedAt: '2026-08-27T00:00:00Z', note: '',
      concepts: [{ id: 'c1', title: 'Caching', createdAt: '2026-08-27T00:00:00Z', updatedAt: '2026-08-27T00:00:00Z' }],
      attempts: [{ id: 'a1', conceptId: 'c1', kind: 'full', createdAt: '2026-08-27T00:00:00Z', what: 'A fast copy', why: '', failure: '' }],
      omissions: [{ id: 'o1', conceptId: 'c1', sourceAttemptId: 'a1', text: 'Eviction', part: 'failure', createdAt: '2026-08-27T00:00:00Z', dueAt: '2026-08-28T00:00:00Z', status: 'pending', retryCount: 0 }]
    };
    expect(exportCsv(bundle)).toContain('"Caching"');
    expect(exportCsv(bundle)).toContain('"Eviction"');
    expect(validImport(bundle)).toBe(true);
    expect(validImport({ product: 'something-else' })).toBe(false);
  });
});
