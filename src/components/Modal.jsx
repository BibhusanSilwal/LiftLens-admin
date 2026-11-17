'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { useT } from './I18nProvider';

/** Dark modal used by the gym management pages. Closes on Escape and backdrop click. */
export function Modal({ title, description, onClose, children, footer, size = 'max-w-lg' }) {
  const t = useT();
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`w-full ${size} rounded-2xl border border-white/10 bg-[#151515] p-5 sm:p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/5" aria-label={t('Close')}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function FormField({ label, hint, error, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-gray-400">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-300">{error}</span>}
    </label>
  );
}

export const inputClass = 'mt-1 w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50';

export function SubmitButton({ busy, children, ...props }) {
  const t = useT();
  return <Button type="submit" disabled={busy} className="bg-orange-500 text-black hover:bg-orange-400" {...props}>{busy ? t('Saving…') : children}</Button>;
}

export function ErrorNote({ message }) {
  return message ? <p className="mt-4 rounded-lg bg-red-950/40 p-3 text-sm text-red-300">{message}</p> : null;
}

/**
 * Date/time field for the dark UI: no "dd/mm/yyyy, --:--" placeholder while empty, the whole box opens
 * the picker, and an optional value can be cleared.
 */
export function DateTimeInput({ value, onChange, type = 'datetime-local', required, clearable = !required, className = '', ...props }) {
  const t = useT();
  const empty = !value;
  return (
    <div className="relative">
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        data-empty={empty}
        onClick={(event) => { try { event.currentTarget.showPicker?.(); } catch { /* not supported */ } }}
        className={`${inputClass} cursor-pointer ${clearable && !empty ? 'pr-16' : ''} ${className}`}
        {...props}
      />
      {clearable && !empty && (
        <button type="button" onClick={() => onChange({ target: { value: '', type, checked: false } })} className="absolute right-9 top-1/2 mt-0.5 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white" aria-label={t('Clear')}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
