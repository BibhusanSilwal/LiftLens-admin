'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCapabilities } from '../app/dashboard/CapabilityProvider';
import { useT } from './I18nProvider';

const LINKS = [
  ['/dashboard/pos', 'Sell', 'pos.sell'],
  ['/dashboard/pos/sales', 'Sales & cash-up', 'pos.sell'],
  ['/dashboard/pos/products', 'Products & stock', 'pos.products.manage'],
];

export function PosNav() {
  const pathname = usePathname();
  const { can } = useCapabilities();
  const t = useT();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-white/10" aria-label={t('Point of sale')}>
      {LINKS.filter(([, , cap]) => can(cap)).map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${pathname === href ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
          {t(label)}
        </Link>
      ))}
    </nav>
  );
}
