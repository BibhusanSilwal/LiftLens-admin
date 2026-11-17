'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing, Clock, Pencil, Pin, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { SkeletonCards } from '../../../components/Skeleton';
import { useConfirm } from '../../../components/ConfirmProvider';
import { useT } from '../../../components/I18nProvider';
import { formatDateTime, gymFetch, postJson, useGymId } from '../../lib/gym-api';
import { useCapabilities } from '../CapabilityProvider';

const CATEGORIES = [['general', 'General'], ['closure', 'Closure / timing change'], ['event', 'Event'], ['offer', 'Offer'], ['rule', 'Rules & safety']];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES);
const STATE_STYLES = { live: 'bg-green-500/15 text-green-300', scheduled: 'bg-sky-500/15 text-sky-300', expired: 'bg-white/10 text-gray-400' };
const STATE_LABEL = { live: 'Live', scheduled: 'Scheduled', expired: 'Expired' };

/** ISO string -> value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

function NoticeForm({ gymId, notice, plans, onClose, onSaved }) {
  const t = useT();
  const isEdit = Boolean(notice);
  const sent = Boolean(notice?.pushed_at);
  const [values, setValues] = useState(() => ({
    title: notice?.title || '',
    body: notice?.body || '',
    category: notice?.category || 'general',
    audience: notice?.audience || 'all',
    plan_ids: notice?.plan_ids || [],
    pinned: notice?.pinned || false,
    send_push: notice?.send_push ?? true,
    schedule: Boolean(notice && !sent),
    publish_at: toLocalInput(notice?.publish_at),
    expires_at: toLocalInput(notice?.expires_at),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const togglePlan = (id) => setValues((v) => ({ ...v, plan_ids: v.plan_ids.includes(id) ? v.plan_ids.filter((p) => p !== id) : [...v.plan_ids, id] }));

  const submit = async (event) => {
    event.preventDefault();
    if (values.audience === 'plans' && !values.plan_ids.length) return setError(t('Choose at least one plan.'));
    setBusy(true); setError('');
    try {
      if (isEdit) {
        const body = { title: values.title, body: values.body, category: values.category, pinned: values.pinned, expires_at: fromLocalInput(values.expires_at) };
        if (!sent && values.publish_at) body.publish_at = fromLocalInput(values.publish_at);
        await postJson(gymId, `/notices/${notice.id}`, body, 'PATCH');
        toast.success(t('Notice updated'));
      } else {
        const body = {
          title: values.title, body: values.body, category: values.category, audience: values.audience,
          plan_ids: values.audience === 'plans' ? values.plan_ids : [], pinned: values.pinned, send_push: values.send_push,
          publish_at: values.schedule ? fromLocalInput(values.publish_at) : null, expires_at: fromLocalInput(values.expires_at),
        };
        // The server saves the notice and sends it in the background, so this returns straight away.
        const created = await postJson(gymId, '/notices', body);
        toast.success(created.pushed_at
          ? t('Sending to {count} member(s)', { count: created.audience_size })
          : t('Scheduled for {when}', { when: formatDateTime(created.publish_at) }));
      }
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Modal title={isEdit ? t('Edit notice') : t('New notice')} description={sent ? t('Already sent. Edits update the notice in the app; push messages are not re-sent.') : t('Members see notices in the app and get a push notification.')} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('Title')}><input required maxLength={120} className={inputClass} value={values.title} onChange={set('title')} placeholder={t('e.g. Closed on Saturday for Dashain')} /></FormField>
        <FormField label={t('Message')} hint={`${values.body.length}/4000`}><textarea required rows={5} maxLength={4000} className={inputClass} value={values.body} onChange={set('body')} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Category')}><select className={inputClass} value={values.category} onChange={set('category')}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></FormField>
          <FormField label={t('Remove from the app after (optional)')}><DateTimeInput value={values.expires_at} onChange={set('expires_at')} /></FormField>
        </div>
        {!isEdit && (
          <>
            <FormField label={t('Send to')}>
              <select className={inputClass} value={values.audience} onChange={set('audience')}><option value="all">{t('All active members')}</option><option value="plans">{t('Members on selected plans')}</option></select>
            </FormField>
            {values.audience === 'plans' && (
              <div className="flex flex-wrap gap-2">{plans.map((plan) => <button type="button" key={plan.id} onClick={() => togglePlan(plan.id)} className={`rounded-full border px-3 py-1 text-sm ${values.plan_ids.includes(plan.id) ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-white/10 text-gray-400'}`}>{plan.name}</button>)}</div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={values.send_push} onChange={set('send_push')} />{t('Send a push notification')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={values.schedule} onChange={set('schedule')} />{t('Schedule for later')}</label>
          </>
        )}
        {values.schedule && !sent && <FormField label={t('Publish at')} hint={t('Scheduled notices go out with the next run of the scheduled job.')}><DateTimeInput required value={values.publish_at} onChange={set('publish_at')} /></FormField>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={values.pinned} onChange={set('pinned')} />{t('Pin to the top')}</label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{isEdit ? t('Save') : values.schedule ? t('Schedule') : t('Send now')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

export default function NoticesPage() {
  const gymId = useGymId();
  const t = useT();
  const confirm = useConfirm();
  const { can } = useCapabilities();
  const [notices, setNotices] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = () => { setNotices(null); setVersion((v) => v + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    Promise.all([gymFetch(gymId, '/notices'), gymFetch(gymId, '/plans')])
      .then(([list, planList]) => { if (!cancelled) { setNotices(list); setPlans(planList); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [gymId, version]);

  const remove = async (notice) => {
    const ok = await confirm({
      title: t('Delete "{title}"?', { title: notice.title }),
      message: t("It disappears from the app. Push messages already sent can't be recalled."),
      confirmLabel: t('Delete'),
    });
    if (!ok) return;
    try { await gymFetch(gymId, `/notices/${notice.id}`, { method: 'DELETE' }); toast.success(t('Notice deleted')); reload(); } catch (e) { toast.error(e.message); }
  };

  const canManage = can('notices.manage');
  const planName = (id) => plans.find((plan) => plan.id === id)?.name || `Plan ${id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Communication')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Notices')}</h1><p className="mt-1 text-sm text-gray-400">{t("Announcements members see in the app's Gyms tab, with a push notification.")}</p></div>
        {canManage && <Button onClick={() => setEditing('new')} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('New notice')}</Button>}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!notices ? (error ? null : <SkeletonCards count={3} />) : !notices.length ? (
        <Card className="border-white/10 bg-[#151515] p-10 text-center text-gray-400">{t('No notices yet. Post closures, events, offers or rules for your members.')}</Card>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Card key={notice.id} className="border-white/10 bg-[#151515] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${STATE_STYLES[notice.state]}`}>{t(STATE_LABEL[notice.state] || notice.state)}</span>
                    <span className="text-gray-400">{t(CATEGORY_LABEL[notice.category] || notice.category)}</span>
                    {notice.pinned && <span className="flex items-center gap-1 text-orange-300"><Pin className="h-3 w-3" />{t('Pinned')}</span>}
                  </div>
                  <h2 className="mt-2 break-words text-lg font-medium">{notice.title}</h2>
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-400">{notice.body}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{notice.state === 'scheduled' ? t('Goes out {when}', { when: formatDateTime(notice.publish_at) }) : t('Published {when}', { when: formatDateTime(notice.publish_at) })}</span>
                    {notice.expires_at && <span>{t('Until {when}', { when: formatDateTime(notice.expires_at) })}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{notice.audience === 'all' ? t('All members') : notice.plan_ids.map(planName).join(', ')}</span>
                    {notice.pushed_at && <span className="flex items-center gap-1"><BellRing className="h-3 w-3" />{notice.sending ? t('Sending…') : t('Sent to {count}', { count: notice.recipients_count })}</span>}
                    {notice.created_by && <span>{t('by {name}', { name: notice.created_by })}</span>}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(notice)}><Pencil className="mr-1 h-3 w-3" />{t('Edit')}</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(notice)} aria-label={t('Delete')}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <NoticeForm gymId={gymId} notice={editing === 'new' ? null : editing} plans={plans} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}
