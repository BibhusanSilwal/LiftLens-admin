'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { SkeletonRows } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { apiFetch } from '../../lib/api';
import { formatDate, formatMoney, gymFetch, useGymId } from '../../lib/gym-api';
import { StandingBadge } from '../../../components/StandingBadge';
import { useCapabilities } from '../CapabilityProvider';

const TABS = [
  ['', 'All'],
  ['active', 'Active'],
  ['expiring', 'Expiring ≤ 7 days'],
  ['pending', 'Awaiting payment'],
  ['frozen', 'Frozen'],
  ['expired', 'Expired'],
  ['none', 'No plan'],
];

function AddMemberModal({ gymId, onClose, onAdded }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await apiFetch(`/api/users/gym/members?gym_id=${gymId}`, { method: 'POST', body: JSON.stringify({ email: email.trim(), status: 'active' }) });
      toast.success(t('Member added. Sell them a plan from their profile.'));
      onAdded();
    } catch (e) {
      setError(e.message === 'User not found' ? t('No LiftLens account uses this email. Ask them to install the app, or let them scan your join QR code.') : e.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={t('Add member')} description={t("Add someone who already has a LiftLens account. New people can also join by scanning your gym's QR code.")} onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label={t("Member's email")}><input type="email" required autoFocus className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
        <ErrorNote message={error} />
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Add member')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

/** One-click shortcut to the most likely next step for this member. */
function RowAction({ member, canSell, t }) {
  if (!canSell) return null;
  const href = (action) => `/dashboard/members/${member.user_id}?action=${action}`;
  const due = member.subscription?.balance_due?.amount_minor > 0;
  const [action, label] = member.standing === 'pending' || (due && member.standing !== 'expired')
    ? ['pay', 'Take payment']
    : ['none', 'expired', 'cancelled'].includes(member.standing) || !member.subscription
      ? ['sell', 'Assign plan']
      : member.standing === 'expiring' ? ['sell', 'Renew'] : [null, null];
  if (!action) return null;
  return <Link href={href(action)} className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-orange-500/40 px-3 text-xs font-medium text-orange-300 hover:bg-orange-500/10">{t(label)}</Link>;
}

function MembersView() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get('status') || '';
  const planId = params.get('plan') || '';
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(params.get('add') === '1');
  const [version, setVersion] = useState(0);
  const load = () => { setData(null); setVersion((v) => v + 1); };

  const setParam = (key, value) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('add');
    setData(null);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`);
  };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    const query = new URLSearchParams({ page_size: '200' });
    if (status) query.set('status', status);
    if (planId) query.set('plan_id', planId);
    if (submittedSearch) query.set('search', submittedSearch);
    gymFetch(gymId, `/members?${query}`)
      .then((result) => { if (!cancelled) { setData(result); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [gymId, status, planId, submittedSearch, version]);
  useEffect(() => {
    if (!gymId) return;
    gymFetch(gymId, '/plans').then(setPlans).catch(() => {});
  }, [gymId]);

  // Keep the tab counts from the last response while a new filter loads.
  const [lastCounts, setLastCounts] = useState({});
  if (data?.counts && data.counts !== lastCounts) setLastCounts(data.counts);
  const counts = data?.counts || lastCounts;
  const canSell = can('payments.record');
  const total = useMemo(() => Object.values(counts).reduce((sum, n) => sum + n, 0), [counts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-orange-400">{t('Gym directory')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Members')}</h1><p className="mt-1 text-sm text-gray-400">{t('{count} members', { count: total })}</p></div>
        {can('members.manage') && <Button onClick={() => setShowAdd(true)} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('Add member')}</Button>}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map(([value, label]) => (
          <button key={value || 'all'} onClick={() => setParam('status', value)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${status === value ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-white/10 text-gray-400 hover:text-white'}`}>
            {t(label)}<span className="ml-1.5 text-xs text-gray-500">{value ? counts[value] || 0 : total}</span>
          </button>
        ))}
      </div>

      <Card className="border-white/10 bg-[#151515] p-4">
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={(e) => { e.preventDefault(); if (search.trim() !== submittedSearch) setData(null); setSubmittedSearch(search.trim()); }}>
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search name, email or phone')} className="w-full rounded-lg border border-white/10 bg-[#0d0d0d] py-2.5 pl-10 pr-3 text-sm" /></div>
          <select value={planId} onChange={(e) => setParam('plan', e.target.value)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2.5 text-sm"><option value="">{t('All plans')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
          <Button type="submit" variant="outline">{t('Search')}</Button>
        </form>
      </Card>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-4">{t('Member')}</th><th className="px-5 py-4">{t('Plan')}</th><th className="px-5 py-4">{t('Status')}</th><th className="px-5 py-4">{t('Ends')}</th><th className="px-5 py-4">{t('Days left')}</th><th className="px-5 py-4">{t('Balance due')}</th><th className="px-5 py-4">{t('Last visit')}</th><th className="px-5 py-4" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={6} cols={8} />
                : !data.results.length ? <tr><td className="px-5 py-8 text-center text-gray-500" colSpan="8">{t('No members match these filters.')}</td></tr>
                : data.results.map((member) => {
                  const sub = member.subscription;
                  return (
                    <tr key={member.user_id} className="hover:bg-white/[.03]">
                      <td className="px-5 py-4">
                        <Link className="font-medium hover:text-orange-400" href={`/dashboard/members/${member.user_id}`}>{member.full_name}</Link>
                        {!member.profile_complete && <AlertTriangle className="ml-2 inline h-3.5 w-3.5 text-orange-400" aria-label={t('Missing phone or emergency contact')} />}
                        <p className="text-xs text-gray-500">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-300">{sub?.plan?.name || '—'}</td>
                      <td className="px-5 py-4"><StandingBadge standing={member.standing} /></td>
                      <td className="px-5 py-4 text-gray-400">{sub ? formatDate(sub.end_date) : '—'}</td>
                      <td className={`px-5 py-4 ${member.standing === 'expiring' ? 'font-medium text-orange-300' : 'text-gray-300'}`}>{sub && ['active', 'expiring', 'frozen'].includes(member.standing) ? sub.days_remaining : '—'}</td>
                      <td className="px-5 py-4">{sub && sub.balance_due.amount_minor > 0 ? <span className="text-yellow-300">{formatMoney(sub.balance_due)}</span> : <span className="text-gray-600">—</span>}</td>
                      <td className="px-5 py-4 text-gray-400">{member.last_visit ? formatDate(member.last_visit) : t('Never')}</td>
                      <td className="px-5 py-4 text-right"><RowAction member={member} canSell={canSell} t={t} /></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
      {showAdd && <AddMemberModal gymId={gymId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

export default function MembersPage() {
  return <Suspense fallback={<div className="space-y-3"><div className="skeleton h-9 w-48" /><div className="skeleton h-64 w-full" /></div>}><MembersView /></Suspense>;
}
