'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Lock, Undo2, Unlock } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../../components/Modal';
import { PosNav } from '../../../../components/PosNav';
import { Skeleton, SkeletonLines, SkeletonRows } from '../../../../components/Skeleton';
import { useConfirm } from '../../../../components/ConfirmProvider';
import { useT } from '../../../../components/I18nProvider';
import { formatDateTime, formatMoney, gymFetch, isoDate, METHOD_LABELS, postJson, toMinor, useGymId, useIdempotencyKey } from '../../../lib/gym-api';
import { useCapabilities } from '../../CapabilityProvider';

const STATUS = { completed: 'text-green-300', partially_refunded: 'text-yellow-300', refunded: 'text-red-300' };

function RefundDialog({ gymId, sale, onClose, onDone }) {
  const t = useT();
  const [qty, setQty] = useState(() => Object.fromEntries(sale.items.map((i) => [i.id, i.quantity - i.refunded_quantity])));
  const [restock, setRestock] = useState(true);
  const [toCredit, setToCredit] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useIdempotencyKey();
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const lines = sale.items.map((i) => ({ sale_item_id: i.id, quantity: Number(qty[i.id] || 0) })).filter((l) => l.quantity > 0);
      const result = await postJson(gymId, `/pos/sales/${sale.id}/refund`, { lines, restock, to_store_credit: toCredit, reason }, 'POST', { idempotencyKey: idempotency.get() });
      idempotency.settle();
      toast.success(t('Refunded {amount}', { amount: formatMoney(result.refunded) }));
      onDone();
    } catch (e) { idempotency.settle(e); setError(e.message); setBusy(false); }
  };
  return (
    <Modal title={t('Refund {receipt}', { receipt: sale.receipt_no })} description={t("Each item's share of what was actually paid is refunded, through the original payment methods.")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ul className="space-y-2 text-sm">
          {sale.items.map((item) => {
            const left = item.quantity - item.refunded_quantity;
            return <li key={item.id} className="flex items-center justify-between gap-3"><span className="min-w-0">{item.name} <span className="text-gray-500">({t('{count} refundable', { count: left })})</span></span><input type="number" min="0" max={left} disabled={!left} value={qty[item.id]} onChange={(e) => setQty({ ...qty, [item.id]: e.target.value })} className={`${inputClass} mt-0 w-20 shrink-0`} /></li>;
          })}
        </ul>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={restock} onChange={(e) => setRestock(e.target.checked)} />{t('Put items back in stock')}</label>
        {sale.member && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={toCredit} onChange={(e) => setToCredit(e.target.checked)} />{t('Refund as store credit')}</label>}
        <FormField label={t('Reason')}><input required className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Refund')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function RegisterCard({ gymId, register, canSeeHistory, onChange }) {
  const t = useT();
  const confirm = useConfirm();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const current = register?.current;
  const act = async (event) => {
    event.preventDefault();
    const minor = toMinor(amount || '0');
    if (!Number.isFinite(minor) || minor < 0) { toast.error(t('Enter a valid amount.')); return; }
    if (current && !(await confirm({
      title: t('Close the register?'),
      message: t('You counted {amount}. The shift is closed and its difference is recorded.', { amount: formatMoney({ ...current.expected_cash, amount_minor: minor }) }),
      confirmLabel: t('Close & count'),
      tone: 'neutral',
    }))) return;
    setBusy(true);
    try {
      if (current) {
        const closed = await postJson(gymId, '/pos/register/close', { counted_cash_minor: minor, note });
        const diff = closed.difference.amount_minor;
        if (diff === 0) toast.success(t('Drawer balanced'));
        else toast.warning(t(diff > 0 ? 'Drawer over by {amount}' : 'Drawer short by {amount}', { amount: formatMoney({ ...closed.difference, amount_minor: Math.abs(diff) }) }));
      } else {
        await postJson(gymId, '/pos/register/open', { opening_float_minor: minor });
        toast.success(t('Register opened'));
      }
      setAmount(''); setNote(''); onChange();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  if (!register) return <div className="rounded-xl border border-white/10 bg-[#151515] p-5"><Skeleton className="h-5 w-32" /><SkeletonLines lines={2} className="mt-4" /><Skeleton className="mt-5 h-10 w-full" /></div>;
  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-[#151515] p-5">
        <h2 className="flex items-center gap-2 font-medium">{current ? <Unlock className="h-4 w-4 text-green-400" /> : <Lock className="h-4 w-4 text-gray-400" />}{t('Cash drawer')}</h2>
        {current ? (
          <div className="mt-2 space-y-1 text-sm text-gray-400">
            <p>{t('Opened {when} by {name} with {amount}.', { when: formatDateTime(current.opened_at), name: current.opened_by, amount: formatMoney(current.opening_float) })}</p>
            <p>{t('Expected in the drawer now:')} <span className="font-medium text-white">{formatMoney(current.expected_cash)}</span> <span className="text-xs">{t('(float + all cash taken − cash refunds)')}</span></p>
          </div>
        ) : <p className="mt-2 text-sm text-gray-400">{t('Open the drawer at the start of a shift with the float you put in.')}</p>}
        <form onSubmit={act} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end xl:flex-col xl:items-stretch">
          <FormField label={current ? t('Cash counted (NPR)') : t('Opening float (NPR)')}><input inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
          {current && <FormField label={t('Note')} className="flex-1"><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>}
          <Button type="submit" disabled={busy} className="bg-orange-500 text-black hover:bg-orange-400">{busy ? t('Saving…') : current ? t('Close & count') : t('Open register')}</Button>
        </form>
      </Card>
      {canSeeHistory && register?.history?.length > 0 && (
        <Card className="overflow-hidden border-white/10 bg-[#151515]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Shift')}</th><th className="px-5 py-3">{t('Expected')}</th><th className="px-5 py-3">{t('Counted')}</th><th className="px-5 py-3">{t('Difference')}</th></tr></thead>
              <tbody className="divide-y divide-white/5">{register.history.map((s) => <tr key={s.id}><td className="px-5 py-3 text-gray-300">{formatDateTime(s.opened_at)} → {formatDateTime(s.closed_at)}<span className="block text-xs text-gray-500">{s.closed_by}{s.note ? ` · ${s.note}` : ''}</span></td><td className="px-5 py-3">{formatMoney(s.expected_cash)}</td><td className="px-5 py-3">{formatMoney(s.counted_cash)}</td><td className={`px-5 py-3 ${s.difference.amount_minor === 0 ? 'text-green-300' : 'text-orange-300'}`}>{formatMoney(s.difference)}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function SalesPage() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const today = isoDate(new Date());
  const [day, setDay] = useState(today);
  const [sales, setSales] = useState(null);
  const [register, setRegister] = useState(null);
  const [refunding, setRefunding] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = () => { setSales(null); setRegister(null); setVersion((n) => n + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    Promise.all([gymFetch(gymId, `/pos/sales?date_from=${day}&date_to=${day}&page_size=200`), gymFetch(gymId, '/pos/register')])
      .then(([s, r]) => { if (!cancelled) { setSales(s); setRegister(r); } })
      .catch((e) => toast.error(e.message));
    return () => { cancelled = true; };
  }, [gymId, day, version]);

  const results = sales?.results ?? [];
  const takings = results.reduce((sum, s) => sum + s.total.amount_minor - s.refunded.amount_minor, 0);
  const currency = results[0]?.total?.currency || 'NPR';

  return (
    <div className="space-y-4">
      <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Point of sale')}</h1></div>
      <PosNav />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-48"><DateTimeInput type="date" required value={day} max={today} aria-label={t('Day')} onChange={(e) => { if (e.target.value) { setSales(null); setDay(e.target.value); } }} className="mt-0" /></div>
            {sales ? <p className="text-sm text-gray-400">{t('{count} sale(s) · net {amount}', { count: results.length, amount: formatMoney({ amount_minor: takings, currency }) })}{!can('pos.history.all') && ` ${t('(your sales)')}`}</p> : <Skeleton className="h-4 w-40" />}
          </div>
          <Card className="overflow-hidden border-white/10 bg-[#151515]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Receipt')}</th><th className="px-5 py-3">{t('Items')}</th><th className="px-5 py-3">{t('Total')}</th><th className="px-5 py-3">{t('Paid by')}</th><th className="px-5 py-3" /></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {!sales ? <SkeletonRows rows={4} cols={5} /> : !results.length ? <tr><td colSpan="5" className="px-5 py-6 text-center text-gray-500">{t('No sales on this day.')}</td></tr> : results.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-5 py-3"><p className="font-mono text-xs">{sale.receipt_no}</p><p className="text-xs text-gray-500">{formatDateTime(sale.created_at)}{sale.member ? ` · ${sale.member.full_name}` : ''}</p></td>
                      <td className="px-5 py-3 text-gray-300">{sale.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                      <td className="px-5 py-3"><span className={STATUS[sale.status]}>{formatMoney(sale.total)}</span>{sale.refunded.amount_minor > 0 && <span className="block text-xs text-red-300">−{formatMoney(sale.refunded)}</span>}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{sale.tenders.map((tender) => t(METHOD_LABELS[tender.method] || tender.method)).join(' + ')}</td>
                      <td className="px-5 py-3 text-right">{can('refunds.approve') && sale.status !== 'refunded' && <Button size="sm" variant="outline" onClick={() => setRefunding(sale)}><Undo2 className="mr-1 h-3 w-3" />{t('Refund')}</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <RegisterCard gymId={gymId} register={register} canSeeHistory={can('pos.cashup.all')} onChange={reload} />
      </div>
      {refunding && <RefundDialog gymId={gymId} sale={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); reload(); }} />}
    </div>
  );
}
