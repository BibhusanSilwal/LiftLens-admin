'use client';

import { toast } from 'sonner';

const UNDO_MS = 5000;
const pending = new Map();
let listening = false;

function flushAll() {
  for (const [id, job] of pending) {
    clearTimeout(job.timer);
    pending.delete(id);
    job.commit({ keepalive: true });
  }
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // Closing or reloading the tab commits pending actions now instead of dropping them.
  window.addEventListener('pagehide', flushAll);
}

/**
 * Undo toast for reversible, non-financial removals (DESIGN.md §8).
 *
 * The caller hides the item at once; the real request (`commit`) is only sent after the toast
 * closes (5 s), so "Undo" just cancels it. If the request fails, `onUndo` restores the item and
 * the error is shown. Anything financial or irreversible keeps `useConfirm()` instead.
 *
 * @param {{ message: string, description?: string, undoLabel?: string,
 *           commit: (opts: {keepalive?: boolean}) => Promise<unknown>,
 *           onUndo: () => void, onCommitted?: (result: unknown) => void }} options
 */
export function removeWithUndo({ message, description, undoLabel = 'Undo', commit, onUndo, onCommitted }) {
  listen();
  const id = Math.random().toString(36).slice(2);
  const run = async (opts = {}) => {
    try {
      const result = await commit(opts);
      onCommitted?.(result);
    } catch (error) {
      onUndo();
      toast.error(error.message || 'Request failed');
    }
  };
  const timer = setTimeout(() => {
    pending.delete(id);
    run();
  }, UNDO_MS);
  pending.set(id, { timer, commit: run });

  toast.success(message, {
    id,
    description,
    duration: UNDO_MS,
    action: {
      label: undoLabel,
      onClick: () => {
        const job = pending.get(id);
        if (!job) return;
        clearTimeout(job.timer);
        pending.delete(id);
        onUndo();
      },
    },
  });
}
