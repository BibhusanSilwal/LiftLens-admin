'use client';

import { Menu } from 'lucide-react';
import { useCapabilities } from '../app/dashboard/CapabilityProvider';
import { LanguageSwitcher, useT } from './I18nProvider';

export function Header({ onMenuClick }) {
  const { role, activeGym, loading } = useCapabilities();
  const t = useT();
  const gymSide = !loading && role && role !== 'platform_admin';
  const initial = (activeGym?.name || (role === 'platform_admin' ? 'Admin' : 'G')).trim().charAt(0).toUpperCase();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-800 bg-black/95 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-gray-800 hover:text-white md:hidden"
          aria-label={t('Open menu')}
        >
          <Menu className="h-5 w-5" />
        </button>
        {gymSide && activeGym?.name && <p className="truncate text-sm text-gray-400">{activeGym.name}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {gymSide && <LanguageSwitcher />}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-black">{initial}</div>
      </div>
    </header>
  );
}
