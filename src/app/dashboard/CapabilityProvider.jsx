'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCapabilities } from '../lib/api';

// Route prefix -> required capability. Names match backend users/permissions.py.
// '*' means platform admins only. The most specific (longest) prefix wins.
export const ROUTE_CAPABILITIES = [
  ['/dashboard/users', '*'],
  ['/dashboard/notifications', '*'],
  ['/dashboard/user-analytics', '*'],
  ['/dashboard/exercise-analytics', '*'],
  ['/dashboard/exercises', '*'],
  ['/dashboard/food', '*'],
  ['/dashboard/gyms', '*'],
  ['/dashboard/today', 'today.view'],
  ['/dashboard/members', 'members.view'],
  ['/dashboard/check-in', 'attendance.manage'],
  ['/dashboard/attendance', 'members.view'],
  ['/dashboard/notices', 'members.view'],
  ['/dashboard/plans', 'plans.manage'],
  ['/dashboard/payments', 'payments.record'],
  ['/dashboard/promotions', 'payments.record'],
  ['/dashboard/pos', 'pos.sell'],
  ['/dashboard/pos/products', 'pos.products.manage'],
  ['/dashboard/analytics', 'analytics.view'],
  ['/dashboard/reports', 'revenue.view'],
  ['/dashboard/staff', 'staff.manage'],
  ['/dashboard/settings', 'gym.settings'],
  ['/dashboard/settings/join-codes', 'join_codes.manage'],
];

export function requiredCapability(pathname) {
  // The bare /dashboard overview handles its own redirect for gym users.
  if (pathname === '/dashboard' || pathname === '/dashboard/403') return null;
  const match = ROUTE_CAPABILITIES
    .filter(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match ? match[1] : null;
}

const CapabilityContext = createContext({ role: null, capabilities: [], loading: true, can: () => false });

function cookie(name) {
  const match = typeof document !== 'undefined' && document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export function CapabilityProvider({ children }) {
  const [state, setState] = useState({ role: null, capabilities: [], activeGym: null, loading: true, error: null });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    getCapabilities()
      .then((data) => {
        const firstGym = data.gyms?.[0];
        setState({
          ...data,
          role: data.role || firstGym?.role || null,
          gym_id: data.gym_id || firstGym?.gym_id || null,
          activeGym: data.activeGym || (firstGym ? { id: firstGym.gym_id, name: firstGym.gym_name } : null),
          capabilities: data.capabilities || [],
          loading: false,
          error: null,
        });
      })
      .catch((error) => {
        const role = cookie('is-admin') === 'true' ? 'platform_admin' : cookie('user-type') === 'gym' ? 'staff' : null;
        setState({ role, capabilities: role === 'platform_admin' ? ['*'] : ['members.view', 'today.view'], activeGym: null, loading: false, error });
      });
  }, []);

  const value = useMemo(() => ({
    ...state,
    can: (capability) => state.capabilities.includes('*') || state.capabilities.includes(capability),
  }), [state]);

  useEffect(() => {
    if (state.loading || !pathname.startsWith('/dashboard')) return;
    const rule = requiredCapability(pathname);
    if (rule && !value.can(rule)) router.replace('/dashboard/403');
  }, [pathname, router, state.loading, value]);

  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>;
}

export function useCapabilities() { return useContext(CapabilityContext); }

export function Forbidden() {
  return <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center"><h1 className="text-2xl font-semibold text-red-200">403 — Not permitted</h1><p className="mt-2 text-sm text-red-300">Your role does not have access to this area.</p></div>;
}
