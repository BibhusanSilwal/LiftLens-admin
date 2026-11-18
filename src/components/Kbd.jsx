'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '../lib/utils';

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "⌘" on Apple devices, "Ctrl" elsewhere (and during server render). */
export function useModKey() {
  return useSyncExternalStore(subscribe, () => (isMac() ? '⌘' : 'Ctrl'), () => 'Ctrl');
}

/** A keyboard key hint, e.g. <Kbd>Ctrl</Kbd><Kbd>K</Kbd>. */
export function Kbd({ children, className }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/15 bg-white/5 px-1.5 font-sans text-[11px] font-medium text-gray-400', className)}>
      {children}
    </kbd>
  );
}
