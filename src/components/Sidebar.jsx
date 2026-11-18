'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, BarChart3, Bell, Building2, ClipboardList, DoorOpen, Home, Layers, LogOut, Megaphone, QrCode, Settings, ShoppingCart, Tag, UserCog, Users, UsersRound, Wallet, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCapabilities } from '../app/dashboard/CapabilityProvider';
import { useT } from './I18nProvider';

export const PLATFORM_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Activity },
  { href: '/dashboard/users', label: 'User management', icon: UserCog },
  { href: '/dashboard/gyms', label: 'Gym management', icon: Building2 },
  { href: '/dashboard/notifications', label: 'Notification management', icon: Bell },
  { href: '/dashboard/user-analytics', label: 'User analytics', icon: BarChart3 },
];

// Gym side, ordered by how often the front desk reaches for them.
export const GYM_SECTIONS = [
  {
    title: 'Front desk',
    items: [
      { href: '/dashboard/today', label: 'Today', icon: Home, capability: 'today.view' },
      { href: '/dashboard/check-in', label: 'Check-in', icon: QrCode, capability: 'attendance.manage' },
      { href: '/dashboard/members', label: 'Members', icon: Users, capability: 'members.view' },
      { href: '/dashboard/pos', label: 'Point of sale', icon: ShoppingCart, capability: 'pos.sell' },
      { href: '/dashboard/payments', label: 'Payments', icon: Wallet, capability: 'payments.record' },
    ],
  },
  {
    title: 'Members',
    items: [
      { href: '/dashboard/attendance', label: 'Attendance', icon: DoorOpen, capability: 'members.view' },
      { href: '/dashboard/notices', label: 'Notices', icon: Megaphone, capability: 'members.view' },
      { href: '/dashboard/plans', label: 'Plans', icon: Layers, capability: 'plans.manage' },
      { href: '/dashboard/promotions', label: 'Promotions', icon: Tag, capability: 'payments.record' },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/dashboard/reports', label: 'Revenue', icon: ClipboardList, capability: 'revenue.view' },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, capability: 'analytics.view' },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/dashboard/staff', label: 'Staff management', icon: UsersRound, capability: 'staff.manage' },
      { href: '/dashboard/settings/join-codes', label: 'Join QR', icon: QrCode, capability: 'join_codes.manage' },
      { href: '/dashboard/settings', label: 'Gym settings', icon: Settings, capability: 'gym.settings', exact: true },
    ],
  },
];

function NavLink({ item, pathname, onClose, t }) {
  const { href, label, icon: Icon, exact } = item;
  const active = href === '/dashboard' || exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClose}
      aria-current={active ? 'page' : undefined}
      className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition', active ? 'bg-orange-500/15 text-orange-400' : 'text-gray-400 hover:bg-white/5 hover:text-white')}
    >
      <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{t(label)}</span>
    </Link>
  );
}

/** The nav the signed-in user may see (shared with the command menu). */
export function navSections(platform, can) {
  return platform
    ? [{ title: 'Platform admin', items: PLATFORM_ITEMS }]
    : GYM_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => can(item.capability)) })).filter((section) => section.items.length);
}

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, loading, role, activeGym, user } = useCapabilities();
  const t = useT();
  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); router.replace('/login'); };
  const platform = role === 'platform_admin';
  const accountName = platform ? (user?.full_name || t('Platform admin')) : (activeGym?.name || user?.full_name || '');
  const sections = navSections(platform, can);

  return <>
    <div onClick={onClose} className={cn('fixed inset-0 z-30 bg-black/60 md:hidden', isOpen ? 'block' : 'hidden')} />
    <aside className={cn('fixed left-0 top-0 z-40 flex h-dvh w-64 flex-col border-r border-white/10 bg-[#0d0d0d] transition-transform md:translate-x-0', isOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-5"><img src="/logo.png" alt="LiftLens" className="h-12 w-auto object-contain" /><button onClick={onClose} className="md:hidden" aria-label={t('Close menu')}><X className="h-5 w-5" /></button></div>
      <nav className="sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-4 pl-5 pr-3">
        {!loading && sections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-3 text-[11px] uppercase tracking-widest text-gray-500">{t(section.title)}</div>
            <div className="space-y-1">{section.items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} onClose={onClose} t={t} />)}</div>
          </div>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-semibold text-orange-300" aria-hidden="true">{accountName.trim().charAt(0).toUpperCase() || '?'}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" title={accountName}>{accountName}</p>
          {user?.email && <p className="truncate text-xs text-gray-500" title={user.email}>{user.email}</p>}
        </div>
        <div className="group relative shrink-0">
          <button type="button" onClick={logout} aria-label={t('Log out')} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-500/15 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">
            <LogOut className="h-4 w-4" />
          </button>
          <span role="tooltip" className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{t('Log out')}</span>
        </div>
      </div>
    </aside>
  </>;
}
