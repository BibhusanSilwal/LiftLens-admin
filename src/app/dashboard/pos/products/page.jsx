'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PackagePlus, Pencil, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../../components/Modal';
import { PosNav } from '../../../../components/PosNav';
import { SkeletonRows } from '../../../../components/Skeleton';
import { useT } from '../../../../components/I18nProvider';
import { formatMoney, fromMinor, gymFetch, postJson, toMinor, useGymId } from '../../../lib/gym-api';

function ProductForm({ gymId, product, categories, onClose, onSaved }) {
  const t = useT();
  const [v, setV] = useState(() => ({
    name: product?.name || '', sku: product?.sku || '', category_id: product?.category_id ?? '', price: product ? fromMinor(product.price.amount_minor) : '',
    cost: product ? fromMinor(product.cost.amount_minor) : '', track_stock: product?.track_stock ?? true, stock_qty: '0',
    low_stock_threshold: String(product?.low_stock_threshold ?? 5), is_active: product?.is_active ?? true, new_category: '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const price = toMinor(v.price);
    if (!Number.isFinite(price)) return setError(t('Enter a valid price.'));
    setBusy(true); setError('');
    try {
      let categoryId = v.category_id === '' ? null : Number(v.category_id);
      if (v.category_id === 'new') {
        categoryId = (await postJson(gymId, '/pos/categories', { name: v.new_category.trim() })).id;
      }
      const body = {
        name: v.name.trim(), sku: v.sku.trim(), category_id: categoryId, price_minor: price, cost_minor: v.cost ? toMinor(v.cost) : 0,
        track_stock: v.track_stock, low_stock_threshold: Number(v.low_stock_threshold || 0), is_active: v.is_active,
      };
      if (product) await postJson(gymId, `/pos/products/${product.id}`, body, 'PATCH');
      else await postJson(gymId, '/pos/products', { ...body, stock_qty: v.track_stock ? Number(v.stock_qty || 0) : 0 });
      toast.success(product ? t('Product updated') : t('Product added'));
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal title={product ? t('Edit {name}', { name: product.name }) : t('New product')} onClose={onClose} size="max-w-xl">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('Name')} className="sm:col-span-2"><input required className={inputClass} value={v.name} onChange={set('name')} placeholder={t('e.g. Whey protein shake')} /></FormField>
        <FormField label={t('Category')}>
          <select className={inputClass} value={v.category_id} onChange={set('category_id')}>
            <option value="">{t('No category')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">{t('+ New category…')}</option>
          </select>
        </FormField>
        {v.category_id === 'new' ? <FormField label={t('New category name')}><input required className={inputClass} value={v.new_category} onChange={set('new_category')} placeholder={t('Supplements')} /></FormField>
          : <FormField label={t('SKU / barcode (optional)')}><input className={inputClass} value={v.sku} onChange={set('sku')} /></FormField>}
        <FormField label={t('Selling price (NPR)')}><input required inputMode="decimal" className={inputClass} value={v.price} onChange={set('price')} /></FormField>
        <FormField label={t('Cost price (NPR, optional)')} hint={t('For your margin; never shown to members')}><input inputMode="decimal" className={inputClass} value={v.cost} onChange={set('cost')} /></FormField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={v.track_stock} onChange={set('track_stock')} />{t('Track stock')}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={v.is_active} onChange={set('is_active')} />{t('For sale')}</label>
        {v.track_stock && !product && <FormField label={t('Opening stock')}><input type="number" min="0" className={inputClass} value={v.stock_qty} onChange={set('stock_qty')} /></FormField>}
        {v.track_stock && <FormField label={t('Warn when stock is at or below')}><input type="number" min="0" className={inputClass} value={v.low_stock_threshold} onChange={set('low_stock_threshold')} /></FormField>}
        <div className="sm:col-span-2"><ErrorNote message={error} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{product ? t('Save') : t('Add product')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function StockForm({ gymId, product, onClose, onSaved }) {
  const t = useT();
  const [mode, setMode] = useState('restock');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n === 0) return setError(t('Enter a whole number.'));
    setBusy(true); setError('');
    try {
      await postJson(gymId, `/pos/products/${product.id}/stock`, { delta: mode === 'restock' ? Math.abs(n) : n, reason: mode, note });
      toast.success(t('Stock updated')); onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal title={t('Stock: {name}', { name: product.name })} description={t('{count} in stock now', { count: product.stock_qty })} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">{[['restock', 'Delivery received'], ['adjustment', 'Correction (count, damage, expiry)']].map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-full border px-3 py-1 ${mode === value ? 'border-orange-500 text-orange-200' : 'border-white/10 text-gray-400'}`}>{t(label)}</button>)}</div>
        <FormField label={mode === 'restock' ? t('Units received') : t('Change (+/−)')} hint={mode === 'adjustment' ? t('Use a negative number to remove units') : undefined}><input type="number" className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} /></FormField>
        <FormField label={t('Note (optional)')}><input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Save')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

export default function ProductsPage() {
  const gymId = useGymId();
  const t = useT();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [stocking, setStocking] = useState(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => { setData(null); setVersion((n) => n + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    Promise.all([gymFetch(gymId, '/pos/products?include_inactive=true'), gymFetch(gymId, '/pos/categories')])
      .then(([products, categories]) => { if (!cancelled) setData({ products, categories }); })
      .catch((e) => toast.error(e.message));
    return () => { cancelled = true; };
  }, [gymId, version]);

  const products = (data?.products ?? []).filter((p) => !lowOnly || p.low_stock);
  const lowCount = (data?.products ?? []).filter((p) => p.low_stock && p.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Point of sale')}</h1></div>
        <Button onClick={() => setEditing('new')} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('New product')}</Button>
      </div>
      <PosNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-400">{!data ? '' : lowCount ? <span className="text-orange-300">{t('{count} product(s) low on stock', { count: lowCount })}</span> : t('Stock levels look fine.')}</p>
        <label className="flex items-center gap-2 text-sm text-gray-400"><input type="checkbox" className="accent-orange-500" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />{t('Low stock only')}</label>
      </div>
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Product')}</th><th className="px-5 py-3">{t('Category')}</th><th className="px-5 py-3">{t('Price')}</th><th className="px-5 py-3">{t('Margin')}</th><th className="px-5 py-3">{t('Stock')}</th><th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={5} cols={6} /> : !products.length ? <tr><td colSpan="6" className="px-5 py-6 text-center text-gray-500">{t('No products.')}</td></tr> : products.map((p) => {
                const margin = p.cost.amount_minor ? Math.round(((p.price.amount_minor - p.cost.amount_minor) / Math.max(p.price.amount_minor, 1)) * 100) : null;
                return (
                  <tr key={p.id} className={p.is_active ? '' : 'opacity-50'}>
                    <td className="px-5 py-3"><p className="font-medium">{p.name}</p>{p.sku && <p className="font-mono text-xs text-gray-500">{p.sku}</p>}</td>
                    <td className="px-5 py-3 text-gray-400">{p.category || '—'}</td>
                    <td className="px-5 py-3">{formatMoney(p.price)}</td>
                    <td className="px-5 py-3 text-gray-400">{margin == null ? '—' : `${margin}%`}</td>
                    <td className="px-5 py-3">{p.track_stock ? <span className={p.low_stock ? 'font-medium text-orange-300' : ''}>{p.stock_qty}{p.low_stock ? ` · ${t('low')}` : ''}</span> : <span className="text-gray-500">{t('Not tracked')}</span>}</td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-2">{p.track_stock && <Button size="sm" variant="outline" onClick={() => setStocking(p)}><PackagePlus className="mr-1 h-3 w-3" />{t('Stock')}</Button>}<Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="mr-1 h-3 w-3" />{t('Edit')}</Button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <ProductForm gymId={gymId} product={editing === 'new' ? null : editing} categories={data?.categories ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {stocking && <StockForm gymId={gymId} product={stocking} onClose={() => setStocking(null)} onSaved={() => { setStocking(null); reload(); }} />}
    </div>
  );
}
