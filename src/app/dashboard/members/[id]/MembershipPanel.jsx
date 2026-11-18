'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, CalendarPlus, Ban, CreditCard, History, RefreshCw, Snowflake, Sun, Wallet } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../../components/Modal';
import { Skeleton, SkeletonLines } from '../../../../components/Skeleton';
import { StandingBadge } from '../../../../components/StandingBadge';
import { useT } from '../../../../components/I18nProvider';
import {
  addDays, formatDate, formatDateTime, formatMoney, fromMinor, gymFetch, isoDate, METHOD_LABELS,
  PAYMENT_METHODS, postJson, toMinor, useIdempotencyKey,
} from '../../../lib/gym-api';
import { errorMessage, useApiData, useGymData } from '../../../lib/use-gym-data';
import { useCapabilities } from '../../CapabilityProvider';

// ─── Shared form bits ───────────────────────────────────────

function PaymentFields({ values, onChange, label }) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <FormField label={label || t('Amount received (NPR)')}><input inputMode="decimal" className={inputClass} value={values.amount} onChange={(e) => onChange({ ...values, amount: e.target.value })} placeholder="0" /></FormField>
      <FormField label={t('Method')}><select className={inputClass} value={values.method} onChange={(e) => onChange({ ...values, method: e.target.value })}>{PAYMENT_METHODS.map(([value, name]) => <option key={value} value={value}>{t(name)}</option>)}</select></FormField>
      <FormField label={t('Reference')} hint={t('Receipt / wallet txn id')}><input className={inputClass} value={values.reference} onChange={(e) => onChange({ ...values, reference: e.target.value })} /></FormField>
    </div>
  );
}

function paymentBody(values, t) {
  const amount = toMinor(values.amount || '0');
  if (!Number.isFinite(amount) || amount < 0) throw new Error(t('Enter a valid amount.'));
  return amount > 0 ? { amount_minor: amount, method: values.method, reference: values.reference.trim() } : null;
}

const emptyPayment = (amountMinor = 0) => ({ amount: amountMinor ? fromMinor(amountMinor) : '', method: 'cash', reference: '' });

function useSubmit(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useIdempotencyKey();
  // `action` receives the Idempotency-Key for this submit; pass it to postJson for money/record writes.
  const run = async (event, action, successMessage) => {
    event.preventDefault();
    setBusy(true); setError('');
    // On success the dialog closes and the panel reloads behind a skeleton, so busy stays on until unmount.
    try {
      await action(idempotency.get());
      idempotency.settle();
      toast.success(successMessage); onDone();
    } catch (e) { idempotency.settle(e); setError(e.message); setBusy(false); }
  };
  return { busy, error, run, setError };
}

function Footer({ onClose, busy, label }) {
  const t = useT();
  return <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{label}</SubmitButton></div>;
}

function ModeToggle({ options, value, onChange }) {
  const t = useT();
  return <div className="flex flex-wrap gap-2 text-sm">{options.map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-full border px-3 py-1 ${value === key ? 'border-orange-500 text-orange-200' : 'border-white/10 text-gray-400'}`}>{t(label)}</button>)}</div>;
}

// ─── Action dialogs ─────────────────────────────────────────

/** Live price breakdown from /checkout/quote (discount, credit, gift card, what's left to collect). */
function useQuote(gymId, body, enabled) {
  const [state, setState] = useState({ quote: null, error: '' });
  const key = JSON.stringify(body);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      postJson(gymId, '/checkout/quote', JSON.parse(key))
        .then((quote) => { if (!cancelled) setState({ quote, error: '' }); })
        .catch((e) => { if (!cancelled) setState({ quote: null, error: e.message }); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, key, enabled]);
  return state;
}

function QuoteSummary({ quote, error }) {
  const t = useT();
  if (error) return <p className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">{error}</p>;
  if (!quote) return null;
  const row = (label, money, tone = '') => <div className="flex justify-between gap-3"><span className="text-gray-400">{label}</span><span className={tone}>{money}</span></div>;
  const promo = quote.promotion?.code || quote.promotion?.name;
  return (
    <div className="space-y-1 rounded-lg border border-white/10 bg-white/[.02] p-3 text-sm">
      {row(t('Plan price'), formatMoney(quote.subtotal))}
      {quote.discount.amount_minor > 0 && row(quote.discount_source === 'referral' ? t('Referral discount (from {name})', { name: quote.referral_from }) : t('Discount: {code}', { code: promo }), `−${formatMoney(quote.discount)}`, 'text-green-300')}
      {quote.bonus_days > 0 && row(t('Bonus: {code}', { code: promo }), t('+{count} days', { count: quote.bonus_days }), 'text-green-300')}
      {quote.credit_applied.amount_minor > 0 && row(t('Store credit'), `−${formatMoney(quote.credit_applied)}`)}
      {quote.gift_card_applied.amount_minor > 0 && row(t('Gift card {code}', { code: quote.gift_card?.code }), `−${formatMoney(quote.gift_card_applied)}`)}
      <div className="flex justify-between border-t border-white/10 pt-1 font-medium"><span>{t('To collect')}</span><span>{formatMoney(quote.total_due)}</span></div>
      {quote.notes?.map((note) => <p key={note} className="text-xs text-gray-500">{note}</p>)}
    </div>
  );
}

function SellDialog({ gymId, userId, plans, current, credit, canDiscount, onClose, onDone }) {
  const t = useT();
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const plan = plans.find((p) => String(p.id) === String(planId));
  const [price, setPrice] = useState(plan ? fromMinor(plan.price.amount_minor) : '');
  const [startDate, setStartDate] = useState('');
  const [useCredit, setUseCredit] = useState(credit.amount_minor > 0);
  const [codes, setCodes] = useState({ promo: '', referral: '', giftCard: '' });
  const [payment, setPayment] = useState(() => emptyPayment(0));
  const [amountEdited, setAmountEdited] = useState(false);
  const { busy, error, run } = useSubmit(onDone);
  const isRenewal = current && ['active', 'frozen'].includes(current.status) && current.days_remaining > 0;

  const priceMinor = toMinor(price);
  const customPrice = canDiscount && plan && Number.isFinite(priceMinor) && priceMinor !== plan.price.amount_minor;
  const quoteBody = {
    member_id: Number(userId),
    plan_id: Number(planId),
    ...(customPrice ? { amount_minor: priceMinor } : {}),
    use_credit: useCredit,
    promo_code: codes.promo.trim() || null,
    referral_code: codes.referral.trim() || null,
    gift_card_code: codes.giftCard.trim() || null,
  };
  const { quote, error: quoteError } = useQuote(gymId, quoteBody, Boolean(plan));
  const amount = amountEdited ? payment.amount : quote ? fromMinor(quote.total_due.amount_minor) : payment.amount;

  const choosePlan = (id) => {
    setPlanId(id);
    const next = plans.find((p) => String(p.id) === String(id));
    if (next) setPrice(fromMinor(next.price.amount_minor));
    setAmountEdited(false);
  };
  const setCode = (key) => (e) => { setCodes((c) => ({ ...c, [key]: e.target.value.toUpperCase() })); setAmountEdited(false); };

  const submit = (event) => run(event, async (idempotencyKey) => {
    if (quoteError) throw new Error(quoteError);
    const body = {
      plan_id: Number(planId), use_credit: useCredit, payment: paymentBody({ ...payment, amount }, t),
      promo_code: quoteBody.promo_code, referral_code: quoteBody.referral_code, gift_card_code: quoteBody.gift_card_code,
    };
    if (startDate) body.start_date = startDate;
    if (customPrice) body.price_amount_minor = priceMinor;
    await postJson(gymId, `/members/${userId}/subscriptions`, body, 'POST', { idempotencyKey });
  }, isRenewal ? t('Renewal sold') : t('Plan sold'));

  if (!plans.length) return <Modal title={t('Sell a plan')} onClose={onClose}><p className="text-sm text-gray-400">{t('Create a membership plan first (Plans page).')}</p></Modal>;
  return (
    <Modal title={isRenewal ? t('Renew membership') : t('Sell a plan')} description={isRenewal ? t('Starts the day after the current period ends ({date}) unless you pick a date.', { date: formatDate(addDays(current.end_date, 1)) }) : t('Starts today unless you pick a date. Unpaid plans stay "awaiting payment".')} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('Plan')} className="sm:col-span-2"><select className={inputClass} value={planId} onChange={(e) => choosePlan(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)} · {t('{count} days', { count: p.duration_days })}</option>)}</select></FormField>
          <FormField label={t('Start date')} hint={t('Blank = automatic')}><DateTimeInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></FormField>
        </div>
        <FormField label={t('Price (NPR)')} hint={canDiscount ? t("Change for a custom price (automatic discounts then don't apply)") : t('Only owners can change the price')}><input inputMode="decimal" disabled={!canDiscount} className={inputClass} value={price} onChange={(e) => { setPrice(e.target.value); setAmountEdited(false); }} /></FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('Promo code')}><input className={`${inputClass} uppercase`} value={codes.promo} onChange={setCode('promo')} /></FormField>
          <FormField label={t("Friend's referral code")}><input className={`${inputClass} uppercase`} value={codes.referral} onChange={setCode('referral')} /></FormField>
          <FormField label={t('Gift card')}><input className={`${inputClass} uppercase`} value={codes.giftCard} onChange={setCode('giftCard')} placeholder="GC-…" /></FormField>
        </div>
        {credit.amount_minor > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={useCredit} onChange={(e) => { setUseCredit(e.target.checked); setAmountEdited(false); }} />{t('Use store credit ({amount})', { amount: formatMoney(credit) })}</label>}
        <QuoteSummary quote={quote} error={quoteError} />
        <PaymentFields values={{ ...payment, amount }} onChange={(next) => { if (next.amount !== amount) setAmountEdited(true); setPayment(next); }} label={t('Amount received now (NPR)')} />
        <p className="text-xs text-gray-500">{t('Set the amount to 0 to sell on credit; the member shows as "awaiting payment" until it\'s paid.')}</p>
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={isRenewal ? t('Renew') : t('Sell plan')} />
      </form>
    </Modal>
  );
}

function PayDialog({ gymId, sub, credit, onClose, onDone }) {
  const t = useT();
  const [payment, setPayment] = useState(() => emptyPayment(sub.balance_due.amount_minor));
  const [useCredit, setUseCredit] = useState(false);
  const [giftCard, setGiftCard] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const submit = (event) => run(event, (idempotencyKey) => postJson(gymId, `/subscriptions/${sub.id}/payments`, {
    payment: paymentBody(payment, t), use_credit: useCredit, gift_card_code: giftCard.trim() || null,
  }, 'POST', { idempotencyKey }), t('Payment recorded'));
  return (
    <Modal title={t('Take payment')} description={t('{plan}: {amount} due. Store credit and gift cards are used first; enter only the cash/card part below.', { plan: sub.plan.name, amount: formatMoney(sub.balance_due) })} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {credit.amount_minor > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />{t('Use store credit first ({amount})', { amount: formatMoney(credit) })}</label>}
        <FormField label={t('Gift card (optional)')}><input className={`${inputClass} uppercase`} value={giftCard} onChange={(e) => setGiftCard(e.target.value.toUpperCase())} placeholder="GC-…" /></FormField>
        <PaymentFields values={payment} onChange={setPayment} />
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={t('Record payment')} />
      </form>
    </Modal>
  );
}

function CreditDialog({ gymId, userId, credit, onClose, onDone }) {
  const t = useT();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('add');
  const [note, setNote] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const submit = (event) => run(event, (idempotencyKey) => {
    const minor = toMinor(amount);
    if (!Number.isFinite(minor) || minor <= 0) throw new Error(t('Enter an amount.'));
    return postJson(gymId, `/members/${userId}/credit`, { delta_minor: mode === 'add' ? minor : -minor, note }, 'POST', { idempotencyKey });
  }, t('Store credit updated'));
  return (
    <Modal title={t('Adjust store credit')} description={t('Current balance: {amount}', { amount: formatMoney(credit) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ModeToggle options={[['add', 'Add credit'], ['remove', 'Remove credit']]} value={mode} onChange={setMode} />
        <FormField label={t('Amount (NPR)')}><input inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
        <FormField label={t('Reason')}><input required className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('e.g. Goodwill for broken locker')} /></FormField>
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={t('Save')} />
      </form>
    </Modal>
  );
}

function ExtendDialog({ gymId, sub, onClose, onDone }) {
  const t = useT();
  const [mode, setMode] = useState('days');
  const [days, setDays] = useState('7');
  const [endDate, setEndDate] = useState(sub.end_date);
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const preview = mode === 'days' ? addDays(sub.end_date, Number(days) || 0) : endDate;
  const submit = (event) => run(event, (idempotencyKey) => postJson(gymId, `/subscriptions/${sub.id}/extend`, mode === 'days' ? { days: Number(days), reason } : { new_end_date: endDate, reason }, 'POST', { idempotencyKey }), t('Membership updated'));
  return (
    <Modal title={t('Extend or fix dates')} description={t('Currently ends {date}. Every change is logged with your reason.', { date: formatDate(sub.end_date) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ModeToggle options={[['days', 'Add / remove days'], ['date', 'Set end date']]} value={mode} onChange={setMode} />
        {mode === 'days'
          ? <FormField label={t('Days')} hint={t('Use a negative number to remove days')}><input type="number" className={inputClass} value={days} onChange={(e) => setDays(e.target.value)} /></FormField>
          : <FormField label={t('New end date')}><DateTimeInput type="date" required min={sub.start_date} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></FormField>}
        <p className="text-sm text-gray-400">{t('New end date:')} <span className="text-white">{formatDate(preview)}</span></p>
        <FormField label={t('Reason')}><input required className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('e.g. Gym closed for Dashain, compensation')} /></FormField>
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={t('Save')} />
      </form>
    </Modal>
  );
}

function FreezeDialog({ gymId, sub, onClose, onDone }) {
  const t = useT();
  const today = isoDate(new Date());
  const left = Math.max(0, sub.freeze_days_allowed - sub.freeze_days_used);
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(addDays(today, Math.min(7, left || 7)));
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const days = Math.round((new Date(until) - new Date(from)) / 86400000);
  const submit = (event) => run(event, () => postJson(gymId, `/subscriptions/${sub.id}/freeze`, { from_date: from, until, reason }), t('Membership frozen'));
  return (
    <Modal title={t('Freeze membership')} description={t('{left} of {allowed} freeze days left · {count} freeze(s) left this period.', { left, allowed: sub.freeze_days_allowed, count: Math.max(0, sub.freezes_allowed - sub.freeze_count) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Freeze from')}><DateTimeInput type="date" required min={today} value={from} onChange={(e) => setFrom(e.target.value)} /></FormField>
          <FormField label={t('Back on')} hint={t('First day the member can train again')}><DateTimeInput type="date" required min={addDays(from, 1)} value={until} onChange={(e) => setUntil(e.target.value)} /></FormField>
        </div>
        <p className="text-sm text-gray-400">{days > 0 ? t('Freezes {days} day(s). The end date moves to {date}.', { days, date: formatDate(addDays(sub.end_date, days)) }) : t('Pick a return date after the start.')}</p>
        <FormField label={t('Reason (optional)')}><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('e.g. Travelling, injury')} /></FormField>
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={t('Freeze')} />
      </form>
    </Modal>
  );
}

function ChangePlanDialog({ gymId, sub, plans, onClose, onDone }) {
  const t = useT();
  const options = plans.filter((plan) => plan.id !== sub.plan.id);
  const [planId, setPlanId] = useState(options[0]?.id || '');
  const [payment, setPayment] = useState(emptyPayment());
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const submit = (event) => run(event, (idempotencyKey) => postJson(gymId, `/subscriptions/${sub.id}/change-plan`, { plan_id: Number(planId), payment: paymentBody(payment, t), reason }, 'POST', { idempotencyKey }), t('Plan changed'));
  return (
    <Modal title={t('Upgrade or downgrade')} description={t('The new plan starts today. The unused, paid part of the current plan is credited and applied to the new one; anything left over stays as store credit.')} onClose={onClose} size="max-w-2xl">
      {!options.length ? <p className="text-sm text-gray-400">{t('There are no other active plans.')}</p> : (
        <form onSubmit={submit} className="space-y-4">
          <FormField label={t('New plan')}><select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)}>{options.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)} · {t('{count} days', { count: p.duration_days })}</option>)}</select></FormField>
          <PaymentFields values={payment} onChange={setPayment} label={t('Extra payment now (optional)')} />
          <FormField label={t('Note (optional)')}><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
          <ErrorNote message={error} />
          <Footer onClose={onClose} busy={busy} label={t('Change plan')} />
        </form>
      )}
    </Modal>
  );
}

function CancelDialog({ gymId, sub, canRefund, onClose, onDone }) {
  const t = useT();
  const [atPeriodEnd, setAtPeriodEnd] = useState(sub.status === 'active');
  const [refund, setRefund] = useState('');
  const [toCredit, setToCredit] = useState(false);
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onDone);
  const submit = (event) => run(event, (idempotencyKey) => {
    const refundMinor = atPeriodEnd ? 0 : toMinor(refund || '0');
    if (!Number.isFinite(refundMinor)) throw new Error(t('Enter a valid refund amount.'));
    return postJson(gymId, `/subscriptions/${sub.id}/cancel`, { at_period_end: atPeriodEnd, refund_amount_minor: refundMinor, refund_to_credit: toCredit, reason }, 'POST', { idempotencyKey });
  }, atPeriodEnd ? t('Cancellation scheduled') : t('Membership cancelled'));
  return (
    <Modal title={t('Cancel membership')} description={t('{plan}, paid {amount}.', { plan: sub.plan.name, amount: formatMoney(sub.amount_paid) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {sub.status === 'active' && (
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-orange-500" checked={atPeriodEnd} onChange={() => setAtPeriodEnd(true)} /><span>{t('At the end of the period ({date})', { date: formatDate(sub.end_date) })}<span className="block text-xs text-gray-500">{t('Member keeps access until then; no refund.')}</span></span></label>
            <label className="flex items-start gap-2"><input type="radio" className="mt-1 accent-orange-500" checked={!atPeriodEnd} onChange={() => setAtPeriodEnd(false)} /><span>{t('Immediately')}</span></label>
          </div>
        )}
        {!atPeriodEnd && canRefund && sub.amount_paid.amount_minor > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('Refund (NPR)')} hint={t('Up to {amount}', { amount: formatMoney(sub.amount_paid) })}><input inputMode="decimal" className={inputClass} value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="0" /></FormField>
            <label className="flex items-center gap-2 self-center text-sm"><input type="checkbox" className="accent-orange-500" checked={toCredit} onChange={(e) => setToCredit(e.target.checked)} />{t('Refund as store credit')}</label>
          </div>
        )}
        <FormField label={t('Reason')}><input required className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
        <ErrorNote message={error} />
        <Footer onClose={onClose} busy={busy} label={atPeriodEnd ? t('Schedule cancellation') : t('Cancel now')} />
      </form>
    </Modal>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#151515] p-6">
        <Skeleton className="h-4 w-28" />
        <div className="mt-5 grid gap-4 sm:grid-cols-4"><div className="sm:col-span-2"><Skeleton className="h-6 w-40" /><Skeleton className="mt-2 h-4 w-56" /></div><div><Skeleton className="h-3 w-16" /><Skeleton className="mt-2 h-7 w-12" /></div><div><Skeleton className="h-3 w-12" /><Skeleton className="mt-2 h-6 w-24" /></div></div>
        <div className="mt-5 flex gap-2 border-t border-white/5 pt-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-24" />)}</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="rounded-xl border border-white/10 bg-[#151515] p-6"><Skeleton className="h-4 w-24" /><SkeletonLines lines={3} className="mt-5" /></div>)}</div>
    </div>
  );
}

// ─── Panel ──────────────────────────────────────────────────

export function MembershipPanel({ gymId, userId, initialDialog = null }) {
  const { can } = useCapabilities();
  const t = useT();
  // Opened straight from the members list (?action=sell / ?action=pay).
  const [dialog, setDialog] = useState(initialDialog);
  // Live: balances and subscription status are never shown from an earlier visit's cache.
  const { data, error: loadError, mutate } = useApiData(
    gymId ? `/api/v1/gyms/${gymId}/members/${userId}/subscriptions` : null,
    { live: true, keepPreviousData: false },
  );
  const { data: plans = [] } = useGymData('/plans');
  const error = errorMessage(loadError);
  // After a write, show the skeleton until the new balance arrives instead of the old one.
  const load = () => mutate(undefined, { revalidate: true });

  const unfreeze = async () => {
    try { await postJson(gymId, `/subscriptions/${data?.current?.id}/unfreeze`); toast.success(t('Membership unfrozen')); load(); } catch (e) { toast.error(e.message); }
  };

  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!data) return <PanelSkeleton />;

  const sub = data.current;
  const done = () => { setDialog(null); load(); };
  const manage = can('subscriptions.manage');
  const live = sub && ['active', 'frozen', 'pending'].includes(sub.status);
  const props = { gymId, sub, onClose: () => setDialog(null), onDone: done };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-[#151515]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><h2 className="font-medium">{t('Membership')}</h2>{data.credit_balance.amount_minor > 0 && <span className="text-xs text-gray-400">{t('Store credit')}: <span className="text-green-300">{formatMoney(data.credit_balance)}</span></span>}</CardHeader>
        <CardContent className="space-y-4 text-sm">
          {sub ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2">
                <div className="flex flex-wrap items-center gap-3"><p className="text-lg font-semibold">{sub.plan.name}</p><StandingBadge standing={sub.standing} /></div>
                <p className="mt-1 text-gray-400">{formatDate(sub.start_date)} → {formatDate(sub.end_date)}</p>
                {sub.frozen_until && <p className="mt-1 text-cyan-300">{t('Frozen {from} – back on {until}', { from: formatDate(sub.frozen_from), until: formatDate(sub.frozen_until) })}</p>}
                {sub.cancel_at_period_end && <p className="mt-1 text-orange-300">{t('Cancels at period end')}{sub.cancel_reason ? ` · ${sub.cancel_reason}` : ''}</p>}
              </div>
              <div><p className="text-xs uppercase text-gray-500">{t('Days left')}</p><p className="text-2xl font-semibold">{['active', 'frozen'].includes(sub.status) ? sub.days_remaining : '—'}</p><p className="text-xs text-gray-500">{t('of {total}', { total: sub.total_days })}</p></div>
              <div><p className="text-xs uppercase text-gray-500">{t('Paid')}</p><p className="text-lg">{formatMoney(sub.amount_paid)}</p>{sub.balance_due.amount_minor > 0 && <p className="text-yellow-300">{t('{amount} due', { amount: formatMoney(sub.balance_due) })}</p>}</div>
            </div>
          ) : <p className="text-gray-400">{t('No membership plan yet.')}</p>}

          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {can('payments.record') && <Button size="sm" onClick={() => setDialog('sell')} className="bg-orange-500 text-black hover:bg-orange-400"><RefreshCw className="mr-1 h-3.5 w-3.5" />{live && sub.status !== 'pending' ? t('Renew') : sub ? t('Sell plan') : t('Assign plan')}</Button>}
            {can('payments.record') && sub && sub.balance_due.amount_minor > 0 && sub.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => setDialog('pay')}><CreditCard className="mr-1 h-3.5 w-3.5" />{t('Take payment')}</Button>}
            {manage && sub && ['active', 'frozen', 'pending', 'expired'].includes(sub.status) && <Button size="sm" variant="outline" onClick={() => setDialog('extend')}><CalendarPlus className="mr-1 h-3.5 w-3.5" />{t('Extend / fix')}</Button>}
            {manage && sub?.status === 'active' && !sub.frozen_until && <Button size="sm" variant="outline" onClick={() => setDialog('freeze')}><Snowflake className="mr-1 h-3.5 w-3.5" />{t('Freeze')}</Button>}
            {manage && sub?.frozen_until && <Button size="sm" variant="outline" onClick={unfreeze}><Sun className="mr-1 h-3.5 w-3.5" />{t('Unfreeze')}</Button>}
            {manage && sub && ['active', 'pending'].includes(sub.status) && <Button size="sm" variant="outline" onClick={() => setDialog('change')}><ArrowLeftRight className="mr-1 h-3.5 w-3.5" />{t('Upgrade / downgrade')}</Button>}
            {manage && live && <Button size="sm" variant="outline" onClick={() => setDialog('cancel')}><Ban className="mr-1 h-3.5 w-3.5" />{t('Cancel')}</Button>}
            {can('promotions.manage') && <Button size="sm" variant="outline" onClick={() => setDialog('credit')}><Wallet className="mr-1 h-3.5 w-3.5" />{t('Store credit')}</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-[#151515]">
          <CardHeader><h2 className="flex items-center gap-2 font-medium"><History className="h-4 w-4 text-orange-400" />{t('Activity')}</h2></CardHeader>
          <CardContent>
            {!data.events.length ? <p className="text-sm text-gray-400">{t('No activity yet.')}</p> : (
              <ol className="space-y-3 text-sm">
                {data.events.slice(0, 20).map((event) => (
                  <li key={event.id} className="border-l-2 border-white/10 pl-3">
                    <p><span className="font-medium">{t(event.label)}</span>{event.days_delta ? <span className="text-gray-400"> · {t('{count} days', { count: `${event.days_delta > 0 ? '+' : ''}${event.days_delta}` })}</span> : null}{event.new_end_date && event.type !== 'created' ? <span className="text-gray-400"> · {t('ends {date}', { date: formatDate(event.new_end_date) })}</span> : null}</p>
                    {event.note && <p className="break-words text-gray-400">{event.note}</p>}
                    <p className="text-xs text-gray-600">{formatDateTime(event.created_at)} · {event.actor}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#151515]">
          <CardHeader><h2 className="flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-orange-400" />{t('Payments')}</h2></CardHeader>
          <CardContent>
            {!data.payments.length ? <p className="text-sm text-gray-400">{can('payments.record') ? t('No payments yet.') : t("You don't have access to payments.")}</p> : (
              <table className="w-full text-sm"><tbody className="divide-y divide-white/5">
                {data.payments.map((payment) => (
                  <tr key={payment.id}><td className="py-2"><p>{formatMoney(payment.amount)}{payment.refunded.amount_minor > 0 && <span className="ml-1 text-xs text-red-300">−{formatMoney(payment.refunded)}</span>}</p><p className="text-xs text-gray-500">{payment.receipt_no} · {t(METHOD_LABELS[payment.method] || payment.method)}{payment.plan_name ? ` · ${payment.plan_name}` : ''}</p></td><td className="py-2 text-right text-xs text-gray-500">{formatDateTime(payment.created_at)}</td></tr>
                ))}
              </tbody></table>
            )}
          </CardContent>
        </Card>
      </div>

      {data.history.length > 1 && (
        <Card className="border-white/10 bg-[#151515]">
          <CardHeader><h2 className="font-medium">{t('Subscription history')}</h2></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th className="py-2">{t('Plan')}</th><th className="py-2">{t('Period')}</th><th className="py-2">{t('Status')}</th><th className="py-2">{t('Price')}</th></tr></thead>
              <tbody className="divide-y divide-white/5">{data.history.map((item) => <tr key={item.id}><td className="py-2">{item.plan.name}</td><td className="py-2 text-gray-400">{formatDate(item.start_date)} → {formatDate(item.end_date)}</td><td className="py-2"><StandingBadge standing={item.standing} /></td><td className="py-2 text-gray-300">{formatMoney(item.price_paid)}</td></tr>)}</tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {dialog === 'sell' && <SellDialog gymId={gymId} userId={userId} plans={plans} current={sub} credit={data.credit_balance} canDiscount={manage} onClose={() => setDialog(null)} onDone={done} />}
      {dialog === 'pay' && sub && <PayDialog {...props} credit={data.credit_balance} />}
      {dialog === 'extend' && <ExtendDialog {...props} />}
      {dialog === 'freeze' && <FreezeDialog {...props} />}
      {dialog === 'change' && <ChangePlanDialog {...props} plans={plans} />}
      {dialog === 'cancel' && <CancelDialog {...props} canRefund={can('refunds.approve')} />}
      {dialog === 'credit' && <CreditDialog gymId={gymId} userId={userId} credit={data.credit_balance} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}
