export type ExplanationPart = 'what' | 'why' | 'failure';

export interface Concept {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastPracticedAt?: string;
}

export interface Attempt {
  id: string;
  conceptId: string;
  kind: 'full' | 'retry';
  createdAt: string;
  what: string;
  why: string;
  failure: string;
  omissionId?: string;
  clearer?: boolean;
  audio?: Blob;
}

export interface Omission {
  id: string;
  conceptId: string;
  sourceAttemptId: string;
  text: string;
  part: ExplanationPart;
  createdAt: string;
  dueAt: string;
  status: 'pending' | 'clearer';
  completedAt?: string;
  retryCount: number;
}

export interface ExportBundle {
  product: 'explain-then-check';
  version: 1;
  exportedAt: string;
  note: string;
  concepts: Concept[];
  attempts: Omit<Attempt, 'audio'>[];
  omissions: Omission[];
}
