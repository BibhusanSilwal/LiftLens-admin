'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Download, Undo2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { SkeletonRows, SkeletonStats } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { formatDateTime, formatMoney, isoDate, METHOD_LABELS, PAYMENT_METHODS, postJson, toMinor, useGymId, useIdempotencyKey } from '../../lib/gym-api';
import { errorMessage, useGymData } from '../../lib/use-gym-data';
import { useCapabilities } from '../CapabilityProvider';

const STATUS_STYLES = {
  succeeded: 'text-green-300',
  partially_refunded: 'text-yellow-300',
  refunded: 'text-red-300',
  pending: 'text-gray-400',
  failed: 'text-red-400',
};
const PURPOSE_LABEL = { subscription: 'Membership', pos: 'Front-desk sale', gift_card: 'Gift card' };

function RefundDialog({ gymId, payment, onClose, onDone }) {
  const t = useT();
  const refundable = payment.amount.amount_minor - payment.refunded.amount_minor;
  const [amount, setAmount] = useState((refundable / 100).toString());
  const [reason, setReason] = useState('');
  const [toCredit, setToCredit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useIdempotencyKey();
  const submit = async (event) => {
    event.preventDefault();
    const minor = toMinor(amount);
    if (!Number.isFinite(minor) || minor <= 0) return setError(t('Enter a valid amount.'));
    setBusy(true); setError('');
    try {
      await postJson(gymId, `/payments/${payment.id}/refund`, { amount_minor: minor, reason, to_store_credit: toCredit }, 'POST', { idempotencyKey: idempotency.get() });
      idempotency.settle();
      toast.success(t('Refund recorded'));
      onDone();
    } catch (e) { idempotency.settle(e); setError(e.message); setBusy(false); }
  };
  return (
    <Modal title={t('Refund {receipt}', { receipt: payment.receipt_no })} description={t('{amount} via {method}. Up to {refundable} can be refunded.', { amount: formatMoney(payment.amount), method: t(METHOD_LABELS[payment.method] || payment.method), refundable: formatMoney({ ...payment.amount, amount_minor: refundable }) })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('Amount (NPR)')}><input inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={toCredit} onChange={(e) => setToCredit(e.target.checked)} disabled={!payment.member} />{t('Give as store credit instead of cash')}</label>
        <FormField label={t('Reason')}><input required className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
        <p className="text-xs text-gray-500">{t("This doesn't change the membership. To end it, cancel it from the member's profile.")}</p>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Refund')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function toCsv(rows) {
  const header = ['Receipt', 'Date', 'Member', 'Email', 'Plan', 'Method', 'Reference', 'Amount', 'Refunded', 'Status', 'Received by'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((p) => [p.receipt_no, p.created_at, p.member?.full_name, p.member?.email, p.plan_name, METHOD_LABELS[p.method] || p.method, p.reference, p.amount.amount_minor / 100, p.refunded.amount_minor / 100, p.status, p.received_by].map(escape).join(','));
  return [header.map(escape).join(','), ...lines].join('\n');
}

export default function PaymentsPage() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const now = new Date();
  const [from, setFrom] = useState(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(isoDate(now));
  const [method, setMethod] = useState('');
  const [refunding, setRefunding] = useState(null);
  const query = new URLSearchParams({ page_size: '200' });
  if (from) query.set('date_from', from);
  if (to) query.set('date_to', to);
  if (method) query.set('method', method);
  // Live: takings and refundable amounts must never come from an earlier visit's cache.
  const { data, error: loadError, mutate } = useGymData(`/payments?${query}`, { live: true, keepPreviousData: false });
  const error = errorMessage(loadError);
  const load = () => mutate();

  const exportCsv = () => {
    const blob = new Blob([toCsv(data?.results ?? [])], { type: 'text/csv' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `payments-${from}-to-${to}.csv`;
    anchor.click();
  };
  const filter = (setter) => (e) => setter(e.target.value);

  const totals = data?.totals;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Payments')}</h1><p className="mt-1 text-sm text-gray-400">{t('To take a payment, open the member and use Sell plan or Take payment.')} <Link href="/dashboard/members?status=pending" className="text-orange-400 hover:underline">{t('See who owes money →')}</Link></p></div>
        {(data?.results?.length ?? 0) > 0 && <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />{t('Export CSV')}</Button>}
      </div>

      <Card className="grid gap-3 border-white/10 bg-[#151515] p-4 sm:grid-cols-3 lg:max-w-3xl">
        <FormField label={t('From')}><DateTimeInput type="date" value={from} onChange={filter(setFrom)} /></FormField>
        <FormField label={t('To')}><DateTimeInput type="date" value={to} onChange={filter(setTo)} /></FormField>
        <FormField label={t('Method')}><select className={inputClass} value={method} onChange={filter(setMethod)}><option value="">{t('All methods')}</option>{PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}<option value="store_credit">{t('Store credit')}</option></select></FormField>
      </Card>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {!totals ? (!error && <SkeletonStats count={2} />) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-white/10 bg-[#151515] p-5"><p className="text-sm text-gray-400">{t('Net received')}</p><p className="mt-1 text-3xl font-semibold">{formatMoney(totals.net)}</p><p className="mt-1 text-xs text-gray-500">{t('{gross} taken · {refunded} refunded', { gross: formatMoney(totals.gross), refunded: formatMoney(totals.refunded) })}</p></Card>
          <Card className="border-white/10 bg-[#151515] p-5 sm:col-span-2"><p className="text-sm text-gray-400">{t('By method')}</p><div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">{Object.keys(totals.by_method).length ? Object.entries(totals.by_method).map(([key, value]) => <div key={key}><p className="text-xs text-gray-500">{t(METHOD_LABELS[key] || key)}</p><p className="font-medium">{formatMoney(value)}</p></div>) : <p className="text-sm text-gray-500">{t('No payments in this range.')}</p>}</div><p className="mt-3 text-xs text-gray-600">{t('Store credit is excluded from takings because it moves money already received.')}</p></Card>
        </div>
      )}

      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-4">{t('Receipt')}</th><th className="px-5 py-4">{t('Member')}</th><th className="px-5 py-4">{t('For')}</th><th className="px-5 py-4">{t('Method')}</th><th className="px-5 py-4">{t('Amount')}</th><th className="px-5 py-4">{t('When')}</th><th className="px-5 py-4" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={6} cols={7} />
                : !data.results.length ? <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">{t('No payments in this range.')}</td></tr>
                : data.results.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4 font-mono text-xs">{payment.receipt_no}</td>
                    <td className="px-5 py-4">{payment.member ? <Link href={`/dashboard/members/${payment.member.id}`} className="hover:text-orange-400">{payment.member.full_name}</Link> : <span className="text-gray-500">{t('Walk-in')}</span>}</td>
                    <td className="px-5 py-4 text-gray-400">{payment.plan_name || t(PURPOSE_LABEL[payment.purpose] || payment.purpose)}</td>
                    <td className="px-5 py-4 text-gray-300">{t(METHOD_LABELS[payment.method] || payment.method)}{payment.reference && <span className="block text-xs text-gray-500">{payment.reference}</span>}</td>
                    <td className="px-5 py-4"><span className={STATUS_STYLES[payment.status]}>{formatMoney(payment.amount)}</span>{payment.refunded.amount_minor > 0 && <span className="block text-xs text-red-300">{t('−{amount} refunded', { amount: formatMoney(payment.refunded) })}</span>}</td>
                    <td className="px-5 py-4 text-gray-400">{formatDateTime(payment.created_at)}{payment.received_by && <span className="block text-xs text-gray-600">{t('by {name}', { name: payment.received_by })}</span>}</td>
                    <td className="px-5 py-4 text-right">{can('refunds.approve') && ['succeeded', 'partially_refunded'].includes(payment.status) && <Button size="sm" variant="outline" onClick={() => setRefunding(payment)}><Undo2 className="mr-1 h-3 w-3" />{t('Refund')}</Button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      {refunding && <RefundDialog gymId={gymId} payment={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); load(); }} />}
    </div>
  );
}
