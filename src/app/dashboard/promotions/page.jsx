'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Gift, Pause, Play, Plus, Search, Tag, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { Skeleton, SkeletonCards, SkeletonLines, SkeletonRows } from '../../../components/Skeleton';
import { useConfirm } from '../../../components/ConfirmProvider';
import { useT } from '../../../components/I18nProvider';
import { formatDate, formatDateTime, formatMoney, fromMinor, gymFetch, PAYMENT_METHODS, postJson, toMinor, useGymId, useIdempotencyKey } from '../../lib/gym-api';
import { useCapabilities } from '../CapabilityProvider';

const STATE_STYLES = {
  live: 'bg-green-500/15 text-green-300',
  scheduled: 'bg-sky-500/15 text-sky-300',
  ended: 'bg-white/10 text-gray-400',
  used_up: 'bg-white/10 text-gray-400',
  inactive: 'bg-white/10 text-gray-400',
  active: 'bg-green-500/15 text-green-300',
  depleted: 'bg-white/10 text-gray-400',
  void: 'bg-red-500/15 text-red-300',
  pending: 'bg-yellow-500/15 text-yellow-300',
  rewarded: 'bg-green-500/15 text-green-300',
};
const STATE_LABELS = {
  live: 'Live', scheduled: 'Scheduled', ended: 'Ended', used_up: 'Used up', inactive: 'Paused', active: 'Active',
  depleted: 'Used up', void: 'Cancelled', pending: 'Waiting for first payment', rewarded: 'Rewarded', qualified: 'Qualified',
};

function Badge({ state }) {
  const t = useT();
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${STATE_STYLES[state] || ''}`}>{t(STATE_LABELS[state] || state)}</span>;
}

function describe(promo, t) {
  const what = promo.kind === 'percent' ? t('{value}% off', { value: promo.value })
    : promo.kind === 'fixed' ? t('{amount} off', { amount: formatMoney({ ...promo.min_amount, amount_minor: promo.value }) })
    : t('+{count} bonus days', { count: promo.value });
  const where = promo.applies_to === 'both' ? t('memberships & sales') : promo.applies_to === 'pos' ? t('front-desk sales') : t('memberships');
  return `${what} · ${where}`;
}

// ─── Promotions ─────────────────────────────────────────────

function PromotionForm({ gymId, plans, onClose, onSaved }) {
  const t = useT();
  const [v, setV] = useState({ name: '', code: '', automatic: false, kind: 'percent', value: '10', applies_to: 'memberships', plan_ids: [], min_amount: '', starts_at: '', ends_at: '', max_redemptions: '', per_member_limit: '1', new_members_only: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const togglePlan = (id) => setV((s) => ({ ...s, plan_ids: s.plan_ids.includes(id) ? s.plan_ids.filter((p) => p !== id) : [...s.plan_ids, id] }));

  const submit = async (event) => {
    event.preventDefault();
    const value = v.kind === 'fixed' ? toMinor(v.value) : Number(v.value);
    if (!Number.isFinite(value) || value < 1) return setError(t('Enter a valid discount.'));
    if (!v.automatic && !v.code.trim()) return setError(t('Enter a code, or make it automatic.'));
    setBusy(true); setError('');
    try {
      await postJson(gymId, '/promotions', {
        name: v.name.trim(), code: v.automatic ? '' : v.code.trim(), kind: v.kind, value, applies_to: v.kind === 'bonus_days' ? 'memberships' : v.applies_to,
        plan_ids: v.plan_ids, min_amount_minor: v.min_amount ? toMinor(v.min_amount) : 0,
        starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : null, ends_at: v.ends_at ? new Date(v.ends_at).toISOString() : null,
        max_redemptions: v.max_redemptions ? Number(v.max_redemptions) : null, per_member_limit: Number(v.per_member_limit || 0), new_members_only: v.new_members_only,
      });
      toast.success(t('Promotion created'));
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal title={t('New promotion')} description={t('A promo code staff type in at checkout, or an automatic discount that applies whenever the rules match. Only the single best discount is ever used.')} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('Name')} className="sm:col-span-2"><input required className={inputClass} value={v.name} onChange={set('name')} placeholder={t('e.g. Dashain offer')} /></FormField>
        <FormField label={t('Code')} hint={v.automatic ? t('Applied automatically, no code needed') : t('Letters and numbers, e.g. DASHAIN20')}><input disabled={v.automatic} className={`${inputClass} uppercase`} value={v.code} onChange={set('code')} /></FormField>
        <label className="flex items-center gap-2 self-center text-sm"><input type="checkbox" className="accent-orange-500" checked={v.automatic} onChange={set('automatic')} />{t('Automatic discount (no code)')}</label>
        <FormField label={t('Type')}><select className={inputClass} value={v.kind} onChange={set('kind')}><option value="percent">{t('Percent off')}</option><option value="fixed">{t('Amount off (NPR)')}</option><option value="bonus_days">{t('Bonus days (memberships)')}</option></select></FormField>
        <FormField label={v.kind === 'percent' ? t('Percent') : v.kind === 'fixed' ? t('Amount (NPR)') : t('Days added')}><input inputMode="decimal" className={inputClass} value={v.value} onChange={set('value')} /></FormField>
        {v.kind !== 'bonus_days' && <FormField label={t('Applies to')}><select className={inputClass} value={v.applies_to} onChange={set('applies_to')}><option value="memberships">{t('Memberships')}</option><option value="pos">{t('Front-desk sales')}</option><option value="both">{t('Both')}</option></select></FormField>}
        <FormField label={t('Minimum sale (NPR, optional)')}><input inputMode="decimal" className={inputClass} value={v.min_amount} onChange={set('min_amount')} /></FormField>
        {v.applies_to !== 'pos' && plans.length > 0 && (
          <div className="sm:col-span-2"><p className="mb-1 text-sm text-gray-400">{t('Only for these plans (none selected = all plans)')}</p><div className="flex flex-wrap gap-2">{plans.map((p) => <button type="button" key={p.id} onClick={() => togglePlan(p.id)} className={`rounded-full border px-3 py-1 text-sm ${v.plan_ids.includes(p.id) ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-white/10 text-gray-400'}`}>{p.name}</button>)}</div></div>
        )}
        <FormField label={t('Starts (optional)')}><DateTimeInput value={v.starts_at} onChange={set('starts_at')} /></FormField>
        <FormField label={t('Ends (optional)')}><DateTimeInput value={v.ends_at} onChange={set('ends_at')} /></FormField>
        <FormField label={t('Total uses (optional)')}><input type="number" min="1" className={inputClass} value={v.max_redemptions} onChange={set('max_redemptions')} /></FormField>
        <FormField label={t('Uses per member')} hint={t('0 = unlimited')}><input type="number" min="0" className={inputClass} value={v.per_member_limit} onChange={set('per_member_limit')} /></FormField>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-orange-500" checked={v.new_members_only} onChange={set('new_members_only')} />{t('New members only (first plan at this gym)')}</label>
        <div className="sm:col-span-2"><ErrorNote message={error} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Create')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function PromotionsTab({ gymId, canManage }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => { setData(null); setVersion((n) => n + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    Promise.all([gymFetch(gymId, '/promotions'), gymFetch(gymId, '/plans')])
      .then(([promos, planList]) => { if (!cancelled) { setData(promos); setPlans(planList); } })
      .catch((e) => toast.error(e.message));
    return () => { cancelled = true; };
  }, [gymId, version]);

  const toggle = async (promo) => {
    try {
      await postJson(gymId, `/promotions/${promo.id}`, { is_active: !promo.is_active }, 'PATCH');
      toast.success(promo.is_active ? t('{name} paused', { name: promo.name }) : t('{name} resumed', { name: promo.name }));
      reload();
    } catch (e) { toast.error(e.message); }
  };
  const planName = (id) => plans.find((p) => p.id === id)?.name || `Plan ${id}`;

  return (
    <div className="space-y-4">
      {canManage && <div className="flex justify-end"><Button onClick={() => setAdding(true)} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('New promotion')}</Button></div>}
      {!data ? <SkeletonCards count={2} /> : !data.length ? <Card className="border-white/10 bg-[#151515] p-10 text-center text-gray-400">{t('No promotions yet.')}</Card> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.map((promo) => (
            <Card key={promo.id} className="border-white/10 bg-[#151515] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Badge state={promo.state} />{promo.automatic ? <span className="text-xs text-gray-400">{t('Automatic')}</span> : <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-sm tracking-wider text-orange-300">{promo.code}</span>}</div>
                  <h3 className="mt-2 font-medium">{promo.name}</h3>
                  <p className="text-sm text-gray-400">{describe(promo, t)}</p>
                </div>
                {canManage && <Button size="sm" variant="outline" onClick={() => toggle(promo)}>{promo.is_active ? <><Pause className="mr-1 h-3 w-3" />{t('Pause')}</> : <><Play className="mr-1 h-3 w-3" />{t('Resume')}</>}</Button>}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>{t('Used {count}', { count: `${promo.times_used}${promo.max_redemptions ? ` / ${promo.max_redemptions}` : ''}` })}</span>
                {promo.per_member_limit > 0 && <span>{t('{count}× per member', { count: promo.per_member_limit })}</span>}
                {promo.new_members_only && <span>{t('New members only')}</span>}
                {promo.plan_ids.length > 0 && <span>{promo.plan_ids.map(planName).join(', ')}</span>}
                {promo.min_amount.amount_minor > 0 && <span>{t('Min {amount}', { amount: formatMoney(promo.min_amount) })}</span>}
                {(promo.starts_at || promo.ends_at) && <span>{promo.starts_at ? formatDate(promo.starts_at) : t('Now')} → {promo.ends_at ? formatDate(promo.ends_at) : t('no end')}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {adding && <PromotionForm gymId={gymId} plans={plans} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </div>
  );
}

// ─── Gift cards ─────────────────────────────────────────────

function GiftCardForm({ gymId, canComp, onClose, onSaved }) {
  const t = useT();
  const [v, setV] = useState({ amount: '', sold: true, method: 'cash', reference: '', recipient_query: '', recipient: null, recipient_name: '', expires: '' });
  const [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    if (v.recipient || v.recipient_query.trim().length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => gymFetch(gymId, `/members?search=${encodeURIComponent(v.recipient_query.trim())}&page_size=5`)
      .then((d) => { if (!cancelled) setMatches(d.results); }).catch(() => {}), 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, v.recipient_query, v.recipient]);

  const idempotency = useIdempotencyKey();
  const submit = async (event) => {
    event.preventDefault();
    const amount = toMinor(v.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError(t('Enter the card value.'));
    setBusy(true); setError('');
    const idempotencyKey = idempotency.get();
    try {
      const card = await postJson(gymId, '/gift-cards', {
        amount_minor: amount, recipient_member_id: v.recipient?.user_id ?? null, recipient_name: v.recipient ? '' : v.recipient_name.trim(),
        expires_at: v.expires ? new Date(`${v.expires}T23:59:59`).toISOString() : null,
        ...(v.sold ? { payment_method: v.method, payment_reference: v.reference.trim() } : {}),
      }, 'POST', { idempotencyKey });
      idempotency.settle();
      toast.success(t('Gift card {code} created', { code: card.code }));
      onSaved(card);
    } catch (e) { idempotency.settle(e); setError(e.message); setBusy(false); }
  };

  return (
    <Modal title={t('New gift card')} description={t("Sold cards count as revenue when sold; spending them later doesn't count again.")} onClose={onClose} size="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('Value (NPR)')}><input inputMode="decimal" required className={inputClass} value={v.amount} onChange={set('amount')} /></FormField>
        {canComp && <div className="flex flex-wrap gap-2 text-sm">{[[true, 'Sold'], [false, 'Complimentary (free)']].map(([value, label]) => <button key={label} type="button" onClick={() => setV((s) => ({ ...s, sold: value }))} className={`rounded-full border px-3 py-1 ${v.sold === value ? 'border-orange-500 text-orange-200' : 'border-white/10 text-gray-400'}`}>{t(label)}</button>)}</div>}
        {v.sold && <div className="grid gap-4 sm:grid-cols-2"><FormField label={t('Paid by')}><select className={inputClass} value={v.method} onChange={set('method')}>{PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></FormField><FormField label={t('Reference')}><input className={inputClass} value={v.reference} onChange={set('reference')} /></FormField></div>}
        <FormField label={t('For a member (optional)')} hint={t('Members see their gift cards in the app')}>
          {v.recipient ? (
            <div className="mt-1 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"><span>{v.recipient.full_name}</span><button type="button" className="text-xs text-gray-400 hover:text-white" onClick={() => setV((s) => ({ ...s, recipient: null, recipient_query: '' }))}>{t('Change')}</button></div>
          ) : (
            <>
              <input className={inputClass} value={v.recipient_query} onChange={set('recipient_query')} placeholder={t('Search members')} />
              {matches.length > 0 && v.recipient_query.trim().length >= 2 && <ul className="mt-1 divide-y divide-white/5 rounded-lg border border-white/10 text-sm">{matches.map((m) => <li key={m.user_id}><button type="button" className="w-full px-3 py-2 text-left hover:bg-white/5" onClick={() => { setV((s) => ({ ...s, recipient: m })); setMatches([]); }}>{m.full_name} <span className="text-gray-500">{m.email}</span></button></li>)}</ul>}
            </>
          )}
        </FormField>
        {!v.recipient && <FormField label={t('Or a name to print (optional)')}><input className={inputClass} value={v.recipient_name} onChange={set('recipient_name')} /></FormField>}
        <FormField label={t('Expires (optional)')}><DateTimeInput type="date" value={v.expires} onChange={set('expires')} /></FormField>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Create gift card')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function GiftCardsTab({ gymId, canManage }) {
  const t = useT();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [lookup, setLookup] = useState('');
  const [found, setFound] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = () => { setData(null); setVersion((n) => n + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    gymFetch(gymId, '/gift-cards').then((d) => { if (!cancelled) setData(d); }).catch((e) => toast.error(e.message));
    return () => { cancelled = true; };
  }, [gymId, version]);

  const search = async (event) => {
    event.preventDefault();
    try { setFound(await gymFetch(gymId, `/gift-cards/lookup?code=${encodeURIComponent(lookup.trim())}`)); } catch (e) { setFound(null); toast.error(e.message); }
  };
  const voidCard = async (card) => {
    const ok = await confirm({
      title: t('Cancel gift card {code}?', { code: card.code }),
      message: t('Its remaining {amount} can no longer be spent.', { amount: formatMoney(card.balance) }),
      confirmLabel: t('Cancel card'),
      cancelLabel: t('Keep card'),
    });
    if (!ok) return;
    try { await postJson(gymId, `/gift-cards/${card.id}/void`); toast.success(t('Gift card cancelled')); setFound(null); reload(); } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={search} className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="GC-XXXX-XXXX" className="w-full rounded-lg border border-white/10 bg-[#151515] py-2 pl-10 pr-3 font-mono text-sm uppercase" /></div><Button type="submit" variant="outline">{t('Check balance')}</Button></form>
        <Button onClick={() => setAdding(true)} className="bg-orange-500 text-black hover:bg-orange-400"><Gift className="mr-1 h-4 w-4" />{t('New gift card')}</Button>
      </div>
      {found && <Card className="border-orange-500/40 bg-orange-950/20 p-4 text-sm"><span className="font-mono text-orange-200">{found.code}</span> · {t('balance')} <span className="font-semibold">{formatMoney(found.balance)}</span> {t('of {amount}', { amount: formatMoney(found.initial) })} · <Badge state={found.status} />{found.expires_at && <span className="text-gray-400"> · {t('expires {date}', { date: formatDate(found.expires_at) })}</span>}</Card>}
      {data ? <p className="text-sm text-gray-400">{t('Unspent balance on active cards:')} <span className="text-white">{formatMoney(data.outstanding)}</span></p> : <Skeleton className="h-4 w-64" />}
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Code')}</th><th className="px-5 py-3">{t('For')}</th><th className="px-5 py-3">{t('Balance')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3">{t('Created')}</th><th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={4} cols={6} /> : !data.results.length ? <tr><td colSpan="6" className="px-5 py-6 text-center text-gray-500">{t('No gift cards yet.')}</td></tr> : data.results.map((card) => (
                <tr key={card.id}>
                  <td className="px-5 py-3 font-mono text-orange-200">{card.code}</td>
                  <td className="px-5 py-3 text-gray-300">{card.recipient_name || '—'}{!card.sold && <span className="ml-2 text-xs text-gray-500">{t('free')}</span>}</td>
                  <td className="px-5 py-3">{formatMoney(card.balance)} <span className="text-xs text-gray-500">/ {formatMoney(card.initial)}</span></td>
                  <td className="px-5 py-3"><Badge state={card.status} /></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(card.created_at)}</td>
                  <td className="px-5 py-3 text-right">{canManage && card.status === 'active' && <Button size="sm" variant="outline" onClick={() => voidCard(card)}>{t('Cancel')}</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {adding && <GiftCardForm gymId={gymId} canComp={canManage} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </div>
  );
}

// ─── Referrals ──────────────────────────────────────────────

function ReferralsTab({ gymId, canManage }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    gymFetch(gymId, '/referrals').then((d) => {
      if (cancelled) return;
      setData(d);
      setForm({ enabled: d.settings.enabled, credit: fromMinor(d.settings.referrer_credit.amount_minor), percent: String(d.settings.referee_discount_percent) });
    }).catch((e) => toast.error(e.message));
    return () => { cancelled = true; };
  }, [gymId, version]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await postJson(gymId, '/referrals/settings', { enabled: Boolean(form?.enabled), referrer_credit_minor: toMinor(form?.credit || '0'), referee_discount_percent: Number(form?.percent || 0) }, 'PATCH');
      toast.success(form?.enabled ? t('Referral programme saved') : t('Referrals switched off'));
      setData(null); setForm(null);
      setVersion((n) => n + 1);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  if (!data || !form) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="rounded-xl border border-white/10 bg-[#151515] p-5"><Skeleton className="h-4 w-24" /><SkeletonLines lines={4} className="mt-4" /></div>
        <div className="rounded-xl border border-white/10 bg-[#151515] p-5"><SkeletonLines lines={4} /></div>
      </div>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="border-white/10 bg-[#151515] p-5">
        <h3 className="font-medium">{t('Programme')}</h3>
        <p className="mt-1 text-sm text-gray-400">{t('Every member has a code in the app. A friend who uses it gets a discount on their first plan; the member gets store credit once that plan is paid.')}</p>
        {!form.enabled && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-gray-400">{t('Referrals are off. Members don\'t see a referral code in the app until you switch them on.')}</p>}
        <form onSubmit={save} className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canManage} className="accent-orange-500" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />{t('Referrals switched on')}</label>
          <FormField label={t('Member earns (NPR store credit)')}><input disabled={!canManage} inputMode="decimal" className={inputClass} value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></FormField>
          <FormField label={t("Friend's first-plan discount (%)")}><input disabled={!canManage} type="number" min="0" max="100" className={inputClass} value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} /></FormField>
          {canManage && <SubmitButton busy={saving}>{t('Save')}</SubmitButton>}
        </form>
      </Card>
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Member')}</th><th className="px-5 py-3">{t('Referred')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3">{t('Reward')}</th><th className="px-5 py-3">{t('When')}</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data.results.length ? <tr><td colSpan="5" className="px-5 py-6 text-center text-gray-500">{t('No referrals yet.')}</td></tr> : data.results.map((r) => (
                <tr key={r.id}><td className="px-5 py-3">{r.referrer.full_name}</td><td className="px-5 py-3 text-gray-300">{r.referee.full_name}</td><td className="px-5 py-3"><Badge state={r.status} /></td><td className="px-5 py-3">{r.reward.amount_minor ? formatMoney(r.reward) : '—'}</td><td className="px-5 py-3 text-gray-400">{formatDateTime(r.rewarded_at || r.created_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const TABS = [['promotions', 'Promotions', Tag], ['gift-cards', 'Gift cards', Gift], ['referrals', 'Referrals', Users]];

export default function PromotionsPage() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const [tab, setTab] = useState('promotions');
  const canManage = can('promotions.manage');
  return (
    <div className="space-y-6">
      <div><p className="text-sm text-orange-400">{t('Members')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Promotions')}</h1><p className="mt-1 text-sm text-gray-400">{t('Discounts, promo codes, gift cards and referral rewards.')}</p></div>
      <div className="flex gap-2 overflow-x-auto border-b border-white/10" role="tablist">
        {TABS.map(([key, label, Icon]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === key ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}><Icon className="h-4 w-4" />{t(label)}</button>)}
      </div>
      {tab === 'promotions' && <PromotionsTab gymId={gymId} canManage={canManage} />}
      {tab === 'gift-cards' && <GiftCardsTab gymId={gymId} canManage={canManage} />}
      {tab === 'referrals' && <ReferralsTab gymId={gymId} canManage={canManage} />}
    </div>
  );
}
