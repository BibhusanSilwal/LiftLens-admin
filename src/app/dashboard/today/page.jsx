'use client';

import Link from 'next/link';
import { CalendarClock, CreditCard, DoorOpen, ListChecks, Megaphone, QrCode, ShoppingCart, Snowflake, UserPlus, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Skeleton, SkeletonLines } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { errorMessage, useApiData } from '../../lib/use-gym-data';
import { formatMoney } from '../../lib/gym-api';
import { useCapabilities } from '../CapabilityProvider';

const cards = [
  ['members_now', 'In the gym now', DoorOpen, 'text-green-400', '/dashboard/check-in'],
  ['active_members', 'Active members', Users, 'text-emerald-400', '/dashboard/members?status=active'],
  ['expiring_soon', 'Expiring in 7 days', CalendarClock, 'text-orange-400', '/dashboard/members?status=expiring'],
  ['pending_subscriptions', 'Awaiting payment', CreditCard, 'text-yellow-400', '/dashboard/members?status=pending'],
  ['frozen_due', 'Frozen, back within 7 days', Snowflake, 'text-cyan-400', '/dashboard/members?status=frozen'],
];

export default function TodayPage() {
  const { can } = useCapabilities();
  const t = useT();
  // Live: check-ins and expiring memberships are acted on straight away.
  const { data, error: loadError } = useApiData('/api/today', { live: true });
  const error = errorMessage(loadError);

  const actions = [
    can('attendance.manage') && ['/dashboard/check-in', 'Open check-in screen', QrCode],
    can('pos.sell') && ['/dashboard/pos', 'Sell at the desk', ShoppingCart],
    can('members.manage') && ['/dashboard/members?add=1', 'Add member', UserPlus],
    ['/dashboard/members?status=expiring', 'Follow up on renewals', ListChecks],
    can('payments.record') && ['/dashboard/members?status=pending', 'Collect payments', Wallet],
    can('notices.manage') && ['/dashboard/notices', 'Post a notice', Megaphone],
    can('plans.manage') && ['/dashboard/plans', 'Manage plans', CreditCard],
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div><p className="text-sm text-orange-400">{data?.gym?.name || t('Gym operations')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Today')}</h1><p className="mt-2 text-gray-400">{t('A quick view of what needs attention on the floor.')}</p></div>
      {error && <p className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map(([key, label, Icon, color, href]) => (
          <Link key={key} href={href}>
            <Card className="h-full border-white/10 bg-[#151515] transition hover:border-orange-500/50"><CardContent className="p-4 sm:p-5"><Icon className={`h-5 w-5 ${color}`} /><p className="mt-4 text-sm text-gray-400 sm:mt-5">{t(label)}</p>{data ? <p className="mt-1 text-3xl font-semibold">{data[key] ?? 0}</p> : <Skeleton className="mt-2 h-8 w-14" />}</CardContent></Card>
          </Link>
        ))}
      </div>
      {can('payments.record') && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/dashboard/payments"><Card className="h-full border-white/10 bg-[#151515] transition hover:border-orange-500/50"><CardContent className="p-5"><p className="text-sm text-gray-400">{t('Received today')}</p>{data ? <><p className="mt-1 text-2xl font-semibold">{formatMoney(data.revenue_today)}</p><p className="text-xs text-gray-500">{t('{count} payment(s)', { count: data.payments_today })}</p></> : <><Skeleton className="mt-2 h-7 w-32" /><Skeleton className="mt-2 h-3 w-20" /></>}</CardContent></Card></Link>
          <Card className="border-white/10 bg-[#151515]"><CardContent className="p-5"><p className="text-sm text-gray-400">{t('Visits today')}</p>{data ? <p className="mt-1 text-2xl font-semibold">{data.visits_today ?? 0}</p> : <Skeleton className="mt-2 h-7 w-12" />}</CardContent></Card>
          <Card className="border-white/10 bg-[#151515]"><CardContent className="p-5"><p className="text-sm text-gray-400">{t('New members today')}</p>{data ? <p className="mt-1 text-2xl font-semibold">{data.new_members_today}</p> : <Skeleton className="mt-2 h-7 w-12" />}</CardContent></Card>
        </div>
      )}
      <Card className="border-white/10 bg-[#151515]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-medium">{t('Live notices')} <span className="ml-1 text-gray-500">{data?.active_notices ?? ''}</span></h2><Link href="/dashboard/notices" className="text-sm text-orange-400 hover:underline">{t('Manage →')}</Link></div>
          {!data ? <SkeletonLines lines={2} className="mt-3" /> : data.notices?.length ? <ul className="mt-3 space-y-2 text-sm">{data.notices.map((notice) => <li key={notice.id} className="text-gray-300">{notice.pinned ? '📌 ' : ''}{notice.title}</li>)}</ul> : <p className="mt-2 text-sm text-gray-400">{t('No notices are showing in the app right now.')}</p>}
        </CardContent>
      </Card>
      <section><h2 className="mb-3 text-lg font-medium">{t('Quick actions')}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{actions.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#151515] p-4 text-sm font-medium hover:border-orange-500/60"><Icon className="h-5 w-5 shrink-0 text-orange-400" />{t(label)}</Link>)}</div></section>
    </div>
  );
}
