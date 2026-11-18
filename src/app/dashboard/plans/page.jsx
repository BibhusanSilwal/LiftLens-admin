'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Archive, EyeOff, Pencil, Plus, Snowflake, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { SkeletonCards } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { formatMoney, fromMinor, gymFetch, postJson, toMinor, useGymId } from '../../lib/gym-api';
import { removeWithUndo } from '../../lib/undo';
import { errorMessage, useGymData } from '../../lib/use-gym-data';
import { useCapabilities } from '../CapabilityProvider';

const DURATION_PRESETS = [[30, '1 month'], [90, '3 months'], [180, '6 months'], [365, '1 year']];

function durationLabel(days, t) {
  const preset = DURATION_PRESETS.find(([value]) => value === days);
  return preset ? t(preset[1]) : t('{count} days', { count: days });
}

function PlanForm({ gymId, plan, onClose, onSaved }) {
  const t = useT();
  const [values, setValues] = useState(() => ({
    name: plan?.name || '',
    tier: plan?.tier || 'standard',
    price: plan ? fromMinor(plan.price.amount_minor) : '',
    duration_days: plan?.duration_days || 30,
    description: plan?.description || '',
    features: (plan?.features || []).join('\n'),
    is_public: plan?.is_public ?? true,
    max_freeze_days: plan?.max_freeze_days ?? 30,
    max_freezes: plan?.max_freezes ?? 2,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const price = toMinor(values.price);
    if (!values.name.trim()) return setError(t('Give the plan a name.'));
    if (!Number.isFinite(price) || price < 0) return setError(t('Enter a valid price.'));
    setBusy(true); setError('');
    const body = {
      name: values.name.trim(),
      tier: values.tier.trim() || 'standard',
      price_amount_minor: price,
      duration_days: Number(values.duration_days),
      description: values.description.trim(),
      features: values.features.split('\n').map((line) => line.trim()).filter(Boolean),
      is_public: values.is_public,
      max_freeze_days: Number(values.max_freeze_days),
      max_freezes: Number(values.max_freezes),
    };
    try {
      await postJson(gymId, plan ? `/plans/${plan.id}` : '/plans', body, plan ? 'PATCH' : 'POST');
      toast.success(plan ? t('Plan updated') : t('Plan created'));
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal title={plan ? t('Edit {name}', { name: plan.name }) : t('New membership plan')} description={plan ? t('Changes apply to new sales; existing members keep their price and dates.') : undefined} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('Plan name')} className="sm:col-span-2"><input className={inputClass} value={values.name} onChange={set('name')} placeholder={t('e.g. Monthly Unlimited')} /></FormField>
        <FormField label={t('Price (NPR)')}><input inputMode="decimal" className={inputClass} value={values.price} onChange={set('price')} placeholder="3000" /></FormField>
        <FormField label={t('Duration (days)')} hint={durationLabel(Number(values.duration_days) || 0, t)}>
          <div className="mt-1 flex gap-2">
            <input type="number" min="1" className={`${inputClass} mt-0`} value={values.duration_days} onChange={set('duration_days')} />
            <select className={`${inputClass} mt-0 w-36`} value="" onChange={(e) => e.target.value && setValues((v) => ({ ...v, duration_days: Number(e.target.value) }))}>
              <option value="">{t('Preset…')}</option>
              {DURATION_PRESETS.map(([days, label]) => <option key={days} value={days}>{t(label)}</option>)}
            </select>
          </div>
        </FormField>
        <FormField label={t('Tier / category')} hint={t('Used to group members, e.g. basic, premium, student')}><input className={inputClass} value={values.tier} onChange={set('tier')} /></FormField>
        <label className="flex items-center gap-3 self-center text-sm"><input type="checkbox" className="h-4 w-4 accent-orange-500" checked={values.is_public} onChange={set('is_public')} /><span>{t('Show in the app')} <span className="block text-xs text-gray-500">{t('Hidden plans can still be sold at the desk')}</span></span></label>
        <FormField label={t('Description')} className="sm:col-span-2"><textarea rows={2} className={inputClass} value={values.description} onChange={set('description')} /></FormField>
        <FormField label={t('Features (one per line)')} className="sm:col-span-2"><textarea rows={3} className={inputClass} value={values.features} onChange={set('features')} placeholder={'Unlimited gym access\nLocker\n1 PT session'} /></FormField>
        <FormField label={t('Max freeze days per period')} hint={t('0 = freezing not allowed')}><input type="number" min="0" className={inputClass} value={values.max_freeze_days} onChange={set('max_freeze_days')} /></FormField>
        <FormField label={t('Max freezes per period')}><input type="number" min="0" className={inputClass} value={values.max_freezes} onChange={set('max_freezes')} /></FormField>
        <div className="sm:col-span-2"><ErrorNote message={error} /></div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <SubmitButton busy={busy}>{plan ? t('Save changes') : t('Create plan')}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

export default function PlansPage() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data: plans, error: loadError, mutate } = useGymData(`/plans${showArchived ? '?include_archived=true' : ''}`, { keepPreviousData: false });
  const error = errorMessage(loadError);
  const load = () => mutate();

  // Undo instead of a confirm: the plan disappears now and is only removed when the toast closes.
  const archive = (plan) => {
    mutate((list) => list?.filter((p) => p.id !== plan.id), { revalidate: false });
    removeWithUndo({
      message: t('{name} removed', { name: plan.name }),
      description: t('Plans with members are archived (kept for history) instead of deleted.'),
      undoLabel: t('Undo'),
      commit: ({ keepalive }) => gymFetch(gymId, `/plans/${plan.id}`, { method: 'DELETE', keepalive }),
      onUndo: () => mutate(),
      onCommitted: () => mutate(),
    });
  };

  // Optimistic: show it as active at once, roll back if the server refuses.
  const restore = async (plan) => {
    try {
      await mutate(async (list) => {
        await postJson(gymId, `/plans/${plan.id}`, { is_active: true }, 'PATCH');
        return list?.map((p) => (p.id === plan.id ? { ...p, is_active: true } : p));
      }, {
        optimisticData: (list) => list?.map((p) => (p.id === plan.id ? { ...p, is_active: true } : p)),
        rollbackOnError: true,
        revalidate: true,
      });
      toast.success(t('{name} restored', { name: plan.name }));
    } catch (e) { toast.error(e.message); }
  };

  const canManage = can('plans.manage');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Memberships')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Plans')}</h1><p className="mt-1 text-sm text-gray-400">{t('What members can buy, for how long, and the freeze rules.')}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400"><input type="checkbox" className="accent-orange-500" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />{t('Show archived')}</label>
          {canManage && <Button onClick={() => setEditing('new')} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('New plan')}</Button>}
        </div>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!plans ? (error ? null : <SkeletonCards count={3} />) : !plans.length ? (
        <Card className="border-white/10 bg-[#151515] p-10 text-center text-gray-400">{t('No plans yet. Create your first membership plan so you can sell it at the desk and show it in the app.')}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`flex flex-col border-white/10 bg-[#151515] p-5 ${plan.is_active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">{plan.tier}</p><h2 className="text-lg font-semibold">{plan.name}</h2></div>
                <div className="flex gap-1">
                  {!plan.is_public && <span title={t('Hidden from the app')} className="rounded-full bg-white/5 p-1.5"><EyeOff className="h-3.5 w-3.5 text-gray-400" /></span>}
                  {!plan.is_active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">{t('Archived')}</span>}
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-orange-300">{formatMoney(plan.price)}<span className="ml-1 text-sm font-normal text-gray-500">/ {durationLabel(plan.duration_days, t)}</span></p>
              {plan.description && <p className="mt-2 text-sm text-gray-400">{plan.description}</p>}
              {plan.features?.length > 0 && <ul className="mt-3 space-y-1 text-sm text-gray-300">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>}
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t('{count} active', { count: plan.active_subscribers ?? 0 })}</span>
                <span className="flex items-center gap-1"><Snowflake className="h-3.5 w-3.5" />{plan.max_freezes ? t('{times}× / {days} days', { times: plan.max_freezes, days: plan.max_freeze_days }) : t('No freezing')}</span>
              </div>
              {canManage && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(plan)}><Pencil className="mr-1 h-3 w-3" />{t('Edit')}</Button>
                  {plan.is_active
                    ? <Button size="sm" variant="outline" onClick={() => archive(plan)}><Archive className="mr-1 h-3 w-3" />{t('Remove')}</Button>
                    : <Button size="sm" variant="outline" onClick={() => restore(plan)}>{t('Restore')}</Button>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && <PlanForm gymId={gymId} plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
