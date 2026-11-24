'use client';

import { toast } from 'sonner';

const UNDO_MS = 5000;
const pending = new Map();
let listening = false;

function flushAll() {
  for (const job of [...pending.values()]) job.commit({ keepalive: true });
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
 * The caller hides the item at once; the real request (`commit`) is only sent when the toast
 * closes by itself or is dismissed, so "Undo" just cancels it. The commit follows the toast's own
 * timer, which pauses while the pointer is on the toast and while the tab is hidden; a separate
 * timer would delete the item while "Undo" is still on screen, and the click would then do
 * nothing. If the request fails, `onUndo` restores the item and the error is shown. Anything
 * financial or irreversible keeps `useConfirm()` instead.
 *
 * @param {{ message: string, description?: string, undoLabel?: string,
 *           commit: (opts: {keepalive?: boolean}) => Promise<unknown>,
 *           onUndo: () => void, onCommitted?: (result: unknown) => void }} options
 */
export function removeWithUndo({ message, description, undoLabel = 'Undo', commit, onUndo, onCommitted }) {
  listen();
  const id = Math.random().toString(36).slice(2);
  let settled = false; // exactly one of commit / undo ever runs

  const send = async (opts = {}) => {
    if (settled) return;
    settled = true;
    pending.delete(id);
    try {
      const result = await commit(opts);
      onCommitted?.(result);
    } catch (error) {
      onUndo();
      toast.error(error.message || 'Request failed');
    }
  };
  const undo = () => {
    if (settled) return;
    settled = true;
    pending.delete(id);
    onUndo();
  };
  pending.set(id, { commit: send });

  toast.success(message, {
    id,
    description,
    duration: UNDO_MS,
    action: { label: undoLabel, onClick: undo },
    onAutoClose: () => send(),
    // Swiped away, closed, or replaced: the user let it go, so it is removed.
    onDismiss: () => send(),
  });
}
