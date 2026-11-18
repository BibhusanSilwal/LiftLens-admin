'use client';

import { Menu, Search } from 'lucide-react';
import { useCapabilities } from '../app/dashboard/CapabilityProvider';
import { LanguageSwitcher, useT } from './I18nProvider';
import { openCommandMenu } from './CommandMenu';
import { Kbd, useModKey } from './Kbd';

export function Header({ onMenuClick }) {
  const { role, activeGym, loading } = useCapabilities();
  const t = useT();
  const mod = useModKey();
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
        {!loading && role && (
          <button
            type="button"
            onClick={openCommandMenu}
            aria-label={t('Search')}
            title={t('Search pages, actions or members')}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Search')}</span>
            <span className="hidden gap-1 sm:flex"><Kbd>{mod}</Kbd><Kbd>K</Kbd></span>
          </button>
        )}
        {gymSide && <LanguageSwitcher />}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-black">{initial}</div>
      </div>
    </header>
  );
}
