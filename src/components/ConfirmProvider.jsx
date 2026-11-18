'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useT } from './I18nProvider';

const ConfirmContext = createContext(null);

/**
 * In-app replacement for window.confirm, styled like the user-management dialogs.
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete notice?', message: '…', confirmLabel: 'Delete' }))) return;
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const t = useT();

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setRequest(typeof options === 'string' ? { message: options } : options);
  }), []);

  const settle = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
  };

  const danger = request?.tone !== 'neutral';
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open) settle(false); }}>
        <DialogContent className="border-gray-800 bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-white">{request?.title || t('Are you sure?')}</DialogTitle>
            {request?.message && <DialogDescription className="text-gray-400">{request.message}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="text-white" onClick={() => settle(false)}>{request?.cancelLabel || t('Cancel')}</Button>
            <Button autoFocus className={danger ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-orange-500 text-black hover:bg-orange-400'} onClick={() => settle(true)}>
              {request?.confirmLabel || t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}
