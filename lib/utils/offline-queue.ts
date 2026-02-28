/**
 * Offline queue — stores generated proofs in IndexedDB when the user
 * is offline and auto-submits them when connectivity returns.
 */

import { OFFLINE_DB_NAME, OFFLINE_STORE_NAME } from "./constants";

export interface QueuedVote {
  id: string;
  proof: unknown;
  publicInputs: string[];
  timestamp: number;
  submitted: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Queue a vote proof for later submission.
 */
export async function queueVote(
  proof: unknown,
  publicInputs: string[]
): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: QueuedVote = {
    id,
    proof,
    publicInputs,
    timestamp: Date.now(),
    submitted: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.add(entry);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all unsubmitted votes from the queue.
 */
export async function getPendingVotes(): Promise<QueuedVote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readonly");
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as QueuedVote[];
      resolve(all.filter((v) => !v.submitted));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark a queued vote as submitted.
 */
export async function markSubmitted(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as QueuedVote;
      if (entry) {
        entry.submitted = true;
        const putReq = store.put(entry);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Remove all submitted entries from the queue.
 */
export async function clearSubmitted(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as QueuedVote[];
      const deletes = all
        .filter((v) => v.submitted)
        .map(
          (v) =>
            new Promise<void>((res, rej) => {
              const del = store.delete(v.id);
              del.onsuccess = () => res();
              del.onerror = () => rej(del.error);
            })
        );
      Promise.all(deletes).then(() => resolve());
    };
    request.onerror = () => reject(request.error);
  });
}
