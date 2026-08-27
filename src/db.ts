import type { Attempt, Concept, ExportBundle, Omission } from './types';

const DB_NAME = 'explain-then-check';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | undefined;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('The local database could not be read.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The local database could not be updated.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The local database update was cancelled.'));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, DB_VERSION);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      const concepts = db.createObjectStore('concepts', { keyPath: 'id' });
      concepts.createIndex('updatedAt', 'updatedAt');
      const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
      attempts.createIndex('conceptId', 'conceptId');
      const omissions = db.createObjectStore('omissions', { keyPath: 'id' });
      omissions.createIndex('conceptId', 'conceptId');
      omissions.createIndex('dueAt', 'dueAt');
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error ?? new Error('Local storage is unavailable.'));
  });
  return dbPromise;
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  return request(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>;
}

async function put<T>(store: string, item: T): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(store, 'readwrite');
  transaction.objectStore(store).put(item);
  await transactionDone(transaction);
}

export const data = {
  concepts: () => getAll<Concept>('concepts'),
  attempts: () => getAll<Attempt>('attempts'),
  omissions: () => getAll<Omission>('omissions'),
  putConcept: (concept: Concept) => put('concepts', concept),
  putAttempt: (attempt: Attempt) => put('attempts', attempt),
  putOmission: (omission: Omission) => put('omissions', omission),
  async deleteOmission(id: string): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction('omissions', 'readwrite');
    transaction.objectStore('omissions').delete(id);
    await transactionDone(transaction);
  },
  async export(): Promise<ExportBundle> {
    const [concepts, attemptsWithAudio, omissions] = await Promise.all([this.concepts(), this.attempts(), this.omissions()]);
    const attempts = attemptsWithAudio.map(({ audio: _audio, ...attempt }) => attempt);
    return {
      product: 'explain-then-check', version: 1, exportedAt: new Date().toISOString(),
      note: 'Audio recordings stay on this device and are not included in exports.', concepts, attempts, omissions
    };
  },
  async replace(bundle: ExportBundle): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction(['concepts', 'attempts', 'omissions'], 'readwrite');
    const conceptStore = transaction.objectStore('concepts');
    const attemptStore = transaction.objectStore('attempts');
    const omissionStore = transaction.objectStore('omissions');
    conceptStore.clear(); attemptStore.clear(); omissionStore.clear();
    bundle.concepts.forEach((item) => conceptStore.put(item));
    bundle.attempts.forEach((item) => attemptStore.put(item));
    bundle.omissions.forEach((item) => omissionStore.put(item));
    await transactionDone(transaction);
  },
  async clear(): Promise<void> {
    const db = await openDatabase();
    const transaction = db.transaction(['concepts', 'attempts', 'omissions'], 'readwrite');
    transaction.objectStore('concepts').clear();
    transaction.objectStore('attempts').clear();
    transaction.objectStore('omissions').clear();
    await transactionDone(transaction);
  }
};
