// §9 PWA requirements: "failed capture submits are retried from a
// localStorage queue." Writes require connectivity in v1 (no sync-conflict
// engineering) — this only covers the capture flow losing network mid-tap,
// not general offline editing.

const QUEUE_KEY = "scoutbase:offline-capture-queue";

interface QueuedCapture {
  id: string;
  text: string;
  queuedAt: string;
}

function readQueue(): QueuedCapture[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedCapture[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedCapture[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueCapture(text: string) {
  const queue = readQueue();
  queue.push({ id: crypto.randomUUID(), text, queuedAt: new Date().toISOString() });
  writeQueue(queue);
}

export function getQueueLength(): number {
  return readQueue().length;
}

/**
 * Retries every queued capture through `submit`. Items that fail again stay
 * queued; items that succeed are removed. Safe to call repeatedly (e.g. on
 * every `online` event) — it's a no-op when the queue is empty.
 */
export async function flushOfflineQueue(submit: (text: string) => Promise<boolean>): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;

  const stillQueued: QueuedCapture[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      const ok = await submit(item.text);
      if (ok) flushed++;
      else stillQueued.push(item);
    } catch {
      stillQueued.push(item);
    }
  }

  writeQueue(stillQueued);
  return flushed;
}
