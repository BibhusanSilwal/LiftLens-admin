'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Minus, Plus, Printer, Search, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormField, inputClass, Modal } from '../../../components/Modal';
import { PosNav } from '../../../components/PosNav';
import { Skeleton } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { formatDateTime, formatMoney, fromMinor, gymFetch, METHOD_LABELS, PAYMENT_METHODS, postJson, toMinor, useGymId, useIdempotencyKey } from '../../lib/gym-api';

function Receipt({ sale, gymName, tendered, onClose }) {
  const t = useT();
  const change = tendered != null ? tendered - (sale.tenders.find((tender) => tender.method === 'cash')?.amount.amount_minor ?? 0) : 0;
  return (
    <Modal title={t('Sale complete')} description={t('Receipt {receipt}', { receipt: sale.receipt_no })} onClose={onClose}
      footer={<><Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />{t('Print')}</Button><Button onClick={onClose} className="bg-orange-500 text-black hover:bg-orange-400">{t('New sale')}</Button></>}>
      <div className="print-receipt space-y-3 font-mono text-sm">
        <div className="text-center"><p className="font-bold">{gymName}</p><p className="text-xs text-gray-400">{formatDateTime(sale.created_at)} · {sale.receipt_no}</p>{sale.member && <p className="text-xs text-gray-400">{sale.member.full_name}</p>}</div>
        <div className="border-y border-dashed border-white/20 py-2">
          {sale.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.quantity} × {item.name}</span><span>{formatMoney(item.line_total)}</span></div>)}
        </div>
        {sale.discount.amount_minor > 0 && <div className="flex justify-between"><span>{t('Discount')}{sale.promo_code ? ` (${sale.promo_code})` : ''}</span><span>−{formatMoney(sale.discount)}</span></div>}
        <div className="flex justify-between font-bold"><span>{t('Total')}</span><span>{formatMoney(sale.total)}</span></div>
        {sale.tenders.map((tender) => <div key={tender.receipt_no} className="flex justify-between text-gray-400"><span>{t(METHOD_LABELS[tender.method] || tender.method)}</span><span>{formatMoney(tender.amount)}</span></div>)}
        {change > 0 && <div className="flex justify-between text-lg font-bold text-green-300"><span>{t('Change')}</span><span>{formatMoney({ ...sale.total, amount_minor: change })}</span></div>}
        <p className="text-center text-xs text-gray-500">{t('Thank you!')}</p>
      </div>
    </Modal>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="min-h-28 rounded-xl border border-white/10 bg-[#151515] p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-10 h-4 w-1/2" /></div>)}
    </div>
  );
}

export default function PosSellPage() {
  const gymId = useGymId();
  const t = useT();
  const [catalogue, setCatalogue] = useState({ products: [], categories: [], register: null, gymName: '', loaded: false });
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({}); // productId -> quantity
  const [member, setMember] = useState(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberMatches, setMemberMatches] = useState([]);
  const [credit, setCredit] = useState(0);
  const [codes, setCodes] = useState({ promo: '', giftCard: '' });
  const [useCredit, setUseCredit] = useState(false);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [tendered, setTendered] = useState('');
  const [quote, setQuote] = useState({ data: null, error: '' });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    Promise.all([gymFetch(gymId, '/pos/products'), gymFetch(gymId, '/pos/categories'), gymFetch(gymId, '/pos/register')])
      .then(([products, categories, register]) => { if (!cancelled) setCatalogue((c) => ({ ...c, products, categories, register: register.current, loaded: true })); })
      .catch((e) => toast.error(e.message));
    apiName(gymId).then((name) => { if (!cancelled) setCatalogue((c) => ({ ...c, gymName: name })); });
    return () => { cancelled = true; };
  }, [gymId, version]);

  useEffect(() => {
    if (!gymId || member || memberQuery.trim().length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => gymFetch(gymId, `/members?search=${encodeURIComponent(memberQuery.trim())}&page_size=6`)
      .then((d) => { if (!cancelled) setMemberMatches(d.results); }).catch(() => {}), 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, memberQuery, member]);

  const items = useMemo(() => Object.entries(cart).filter(([, q]) => q > 0).map(([id, quantity]) => ({ product_id: Number(id), quantity })), [cart]);
  const quoteKey = JSON.stringify({ items, member: member?.user_id ?? null, promo: codes.promo.trim(), gift: codes.giftCard.trim(), useCredit });

  useEffect(() => {
    if (!gymId) return undefined;
    const body = JSON.parse(quoteKey);
    if (!body.items.length) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      postJson(gymId, '/pos/quote', { items: body.items, member_id: body.member, promo_code: body.promo || null, gift_card_code: body.gift || null, use_credit: body.useCredit })
        .then((data) => { if (!cancelled) setQuote({ data, error: '' }); })
        .catch((e) => { if (!cancelled) setQuote({ data: null, error: e.message }); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, quoteKey]);

  const productById = useMemo(() => Object.fromEntries(catalogue.products.map((p) => [p.id, p])), [catalogue.products]);
  const visible = catalogue.products.filter((p) => (!category || p.category_id === category) && (!search.trim() || `${p.name} ${p.sku}`.toLowerCase().includes(search.trim().toLowerCase())));
  const currency = catalogue.products[0]?.price?.currency || 'NPR';
  const shown = items.length ? quote.data : null;
  const due = shown?.total_due?.amount_minor ?? 0;
  const tenderedMinor = tendered ? toMinor(tendered) : null;
  const change = method === 'cash' && Number.isFinite(tenderedMinor) && tenderedMinor != null ? tenderedMinor - due : null;

  const add = (product, delta = 1) => setCart((c) => {
    const next = Math.max(0, (c[product.id] || 0) + delta);
    if (product.track_stock && next > product.stock_qty) { toast.error(t('Only {count} {name} in stock', { count: product.stock_qty, name: product.name })); return c; }
    return { ...c, [product.id]: next };
  });

  const pickMember = async (m) => {
    setMember(m); setMemberMatches([]); setMemberQuery('');
    try { const data = await gymFetch(gymId, `/members/${m.user_id}/credit`); setCredit(data.balance.amount_minor); } catch { setCredit(0); }
  };

  // After a sale the catalogue reloads (stock changed), behind a skeleton.
  const reset = () => { setCart({}); setMember(null); setCredit(0); setCodes({ promo: '', giftCard: '' }); setUseCredit(false); setReference(''); setTendered(''); setQuote({ data: null, error: '' }); setCatalogue((c) => ({ ...c, loaded: false })); setVersion((v) => v + 1); };

  const idempotency = useIdempotencyKey();
  const complete = async () => {
    if (!items.length || quote.error) return;
    if (method === 'cash' && change != null && change < 0) { toast.error(t('Cash tendered is less than the amount due.')); return; }
    setBusy(true);
    try {
      const sale = await postJson(gymId, '/pos/sales', {
        items, member_id: member?.user_id ?? null, promo_code: codes.promo.trim() || null, gift_card_code: codes.giftCard.trim() || null,
        use_credit: useCredit, payment: { method, reference: reference.trim() },
      }, 'POST', { idempotencyKey: idempotency.get() });
      idempotency.settle();
      toast.success(t('Sale {receipt} complete', { receipt: sale.receipt_no }));
      setReceipt({ sale, tendered: method === 'cash' ? tenderedMinor : null });
    } catch (e) { idempotency.settle(e); toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Point of sale')}</h1></div>
        {catalogue.loaded && <p className={`text-sm ${catalogue.register ? 'text-green-300' : 'text-gray-400'}`}>{catalogue.register ? t('Register open since {when}', { when: formatDateTime(catalogue.register.opened_at) }) : t('Register closed: sales still work; open it under Sales & cash-up to track the cash drawer.')}</p>}
      </div>
      <PosNav />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Search products or scan SKU')} className="w-full rounded-lg border border-white/10 bg-[#151515] py-2.5 pl-10 pr-3 text-sm" /></div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {[[null, t('All')], ...catalogue.categories.map((c) => [c.id, c.name])].map(([id, name]) => (
              <button key={id ?? 'all'} onClick={() => setCategory(id)} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${category === id ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-white/10 text-gray-400 hover:text-white'}`}>{name}</button>
            ))}
          </div>
          {!catalogue.loaded ? <ProductGridSkeleton /> : !catalogue.products.length ? <Card className="border-white/10 bg-[#151515] p-10 text-center text-gray-400">{t('No products yet. Add merchandise, supplements and drinks under Products & stock.')}</Card> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((p) => {
                const out = p.track_stock && p.stock_qty <= 0;
                return (
                  <button key={p.id} disabled={out} onClick={() => add(p)} className="flex min-h-28 flex-col justify-between rounded-xl border border-white/10 bg-[#151515] p-3 text-left transition hover:border-orange-500/60 disabled:cursor-not-allowed disabled:opacity-40">
                    <span className="break-words font-medium leading-tight">{p.name}</span>
                    <span className="mt-2 flex flex-wrap items-end justify-between gap-2"><span className="text-orange-300">{formatMoney(p.price)}</span>{p.track_stock && <span className={`text-xs ${p.low_stock ? 'text-orange-300' : 'text-gray-500'}`}>{out ? t('Out') : t('{count} left', { count: p.stock_qty })}</span>}</span>
                    {cart[p.id] > 0 && <span className="mt-1 self-start rounded-full bg-orange-500 px-2 text-xs font-semibold text-black">{t('{count} in cart', { count: cart[p.id] })}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit border-white/10 bg-[#151515] p-4 xl:sticky xl:top-20">
          <h2 className="flex items-center gap-2 font-medium"><ShoppingCart className="h-4 w-4 text-orange-400" />{t('Cart')}</h2>
          {!items.length ? <p className="mt-3 text-sm text-gray-500">{t('Tap products to add them.')}</p> : (
            <ul className="mt-3 divide-y divide-white/5">
              {items.map(({ product_id: id, quantity }) => {
                const p = productById[id];
                if (!p) return null;
                return (
                  <li key={id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 break-words">{p.name}<span className="block text-xs text-gray-500">{formatMoney(p.price)}</span></span>
                    <button aria-label={t('Fewer')} onClick={() => add(p, -1)} className="rounded border border-white/10 p-1"><Minus className="h-3 w-3" /></button>
                    <span className="w-6 text-center">{quantity}</span>
                    <button aria-label={t('More')} onClick={() => add(p, 1)} className="rounded border border-white/10 p-1"><Plus className="h-3 w-3" /></button>
                    <button aria-label={t('Remove')} onClick={() => setCart((c) => ({ ...c, [id]: 0 }))} className="p-1 text-gray-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm">
            {member ? (
              <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-orange-400" />{member.full_name}</span><button aria-label={t('Remove member')} onClick={() => { setMember(null); setCredit(0); setUseCredit(false); }}><X className="h-4 w-4 text-gray-400" /></button></div>
            ) : (
              <div>
                <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder={t('Member (optional): search name')} className={inputClass} />
                {memberMatches.length > 0 && memberQuery.trim().length >= 2 && <ul className="mt-1 divide-y divide-white/5 rounded-lg border border-white/10">{memberMatches.map((m) => <li key={m.user_id}><button className="w-full px-3 py-2 text-left hover:bg-white/5" onClick={() => pickMember(m)}>{m.full_name} <span className="text-gray-500">{m.email}</span></button></li>)}</ul>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input value={codes.promo} onChange={(e) => setCodes((c) => ({ ...c, promo: e.target.value.toUpperCase() }))} placeholder={t('Promo code')} className={`${inputClass} mt-0 uppercase`} />
              <input value={codes.giftCard} onChange={(e) => setCodes((c) => ({ ...c, giftCard: e.target.value.toUpperCase() }))} placeholder={t('Gift card')} className={`${inputClass} mt-0 uppercase`} />
            </div>
            {credit > 0 && <label className="flex items-center gap-2"><input type="checkbox" className="accent-orange-500" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />{t('Use store credit ({amount})', { amount: formatMoney({ amount_minor: credit, currency }) })}</label>}

            {quote.error && items.length > 0 && <p className="rounded-lg bg-red-950/40 p-2 text-red-300">{quote.error}</p>}
            {items.length > 0 && !shown && !quote.error && <div className="space-y-2" aria-hidden="true"><Skeleton className="h-4 w-full" /><Skeleton className="h-6 w-2/3" /></div>}
            {shown && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-400"><span>{t('Subtotal')}</span><span>{formatMoney(shown.subtotal)}</span></div>
                {shown.discount.amount_minor > 0 && <div className="flex justify-between text-green-300"><span>{shown.promotion?.code || shown.promotion?.name || t('Discount')}</span><span>−{formatMoney(shown.discount)}</span></div>}
                {shown.credit_applied.amount_minor > 0 && <div className="flex justify-between text-gray-400"><span>{t('Store credit')}</span><span>−{formatMoney(shown.credit_applied)}</span></div>}
                {shown.gift_card_applied.amount_minor > 0 && <div className="flex justify-between text-gray-400"><span>{t('Gift card')}</span><span>−{formatMoney(shown.gift_card_applied)}</span></div>}
                <div className="flex justify-between text-lg font-semibold"><span>{t('To pay')}</span><span>{formatMoney(shown.total_due)}</span></div>
              </div>
            )}
            {due > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <FormField label={t('Paid by')}><select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>{PAYMENT_METHODS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></FormField>
                {method === 'cash'
                  ? <FormField label={t('Cash given')} hint={change != null ? (change >= 0 ? t('Change {amount}', { amount: formatMoney({ amount_minor: change, currency }) }) : t('Not enough')) : t('Exact: {amount}', { amount: fromMinor(due) })}><input inputMode="decimal" className={inputClass} value={tendered} onChange={(e) => setTendered(e.target.value)} /></FormField>
                  : <FormField label={t('Reference')}><input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} /></FormField>}
              </div>
            )}
            <Button onClick={complete} disabled={busy || !items.length || Boolean(quote.error) || !shown} className="h-12 w-full bg-orange-500 text-base font-semibold text-black hover:bg-orange-400">
              {busy ? t('Completing…') : shown ? t('Complete sale · {amount}', { amount: formatMoney(shown.total_due) }) : t('Complete sale')}
            </Button>
          </div>
        </Card>
      </div>
      {receipt && <Receipt sale={receipt.sale} tendered={receipt.tendered} gymName={catalogue.gymName} onClose={() => { setReceipt(null); reset(); }} />}
    </div>
  );
}

async function apiName(gymId) {
  try {
    const today = await fetch('/api/today', { cache: 'no-store' }).then((r) => r.json());
    return today?.gym?.id === gymId ? today.gym.name : today?.gym?.name || '';
  } catch {
    return '';
  }
}
