'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Crown, KeyRound, Plus, Power, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../components/Modal';
import { SkeletonRows } from '../../../components/Skeleton';
import { useConfirm } from '../../../components/ConfirmProvider';
import { useT } from '../../../components/I18nProvider';
import { formatDate, gymFetch, postJson, useGymId } from '../../lib/gym-api';
import { useCapabilities } from '../CapabilityProvider';

const ROLES = [
  ['staff', 'Front-desk staff', 'Check-ins, members, payments, point of sale and notices.'],
  ['trainer', 'Trainer', 'Sees members and attendance, and can run the check-in desk.'],
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(([value, label]) => [value, label]));

function AddStaffDialog({ gymId, onClose, onSaved }) {
  const t = useT();
  const [values, setValues] = useState({ email: '', role: 'staff', full_name: '', password: '' });
  const [newAccount, setNewAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { email: values.email.trim(), role: values.role };
      if (newAccount) Object.assign(body, { full_name: values.full_name.trim(), password: values.password });
      const added = await postJson(gymId, '/staff', body);
      toast.success(added.account_created
        ? t('Account created for {name}. Share the password with them; they sign in here with their email.', { name: added.full_name })
        : t('{name} can now sign in to the dashboard.', { name: added.full_name }));
      onSaved();
    } catch (e) {
      if (e.code === 'account_required') { setNewAccount(true); setError(t('No LiftLens account uses this email. Enter their name and a starting password to create one.')); }
      else setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <Modal title={t('Add staff')} description={t('They sign in to this dashboard with their own email and password.')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('Email')}><input required type="email" autoComplete="off" className={inputClass} value={values.email} onChange={set('email')} /></FormField>
        <fieldset>
          <legend className="text-sm text-gray-400">{t('Role')}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ROLES.map(([value, label, hint]) => (
              <label key={value} className={`cursor-pointer rounded-lg border p-3 text-sm ${values.role === value ? 'border-orange-500 bg-orange-500/10' : 'border-white/10'}`}>
                <input type="radio" name="role" value={value} checked={values.role === value} onChange={set('role')} className="sr-only" />
                <span className="font-medium">{t(label)}</span>
                <span className="mt-1 block text-xs text-gray-400">{t(hint)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-500" checked={newAccount} onChange={(e) => setNewAccount(e.target.checked)} />{t('Create a new login for them')}</label>
        {newAccount && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('Full name')}><input required className={inputClass} value={values.full_name} onChange={set('full_name')} /></FormField>
            <FormField label={t('Starting password')} hint={t('At least 8 characters. They can change it later.')}><input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={values.password} onChange={set('password')} /></FormField>
          </div>
        )}
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Add to team')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

function PermissionsDialog({ gymId, person, meta, isOwner, onClose, onSaved }) {
  const t = useT();
  const [role, setRole] = useState(person.role);
  const [caps, setCaps] = useState(() => new Set(person.capabilities));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const changeRole = (value) => { setRole(value); setCaps(new Set(meta.roles[value])); };
  const toggle = (key) => setCaps((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      if (role !== person.role) await postJson(gymId, `/staff/${person.id}`, { role }, 'PATCH');
      await postJson(gymId, `/staff/${person.id}`, { capabilities: [...caps] }, 'PATCH');
      toast.success(t('Access updated for {name}', { name: person.full_name }));
      onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const defaults = new Set(meta.roles[role] ?? []);
  return (
    <Modal title={t('Access for {name}', { name: person.full_name })} description={t('Start from a role, then tick extra permissions or untick ones they should not have.')} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {ROLES.map(([value, label]) => <button key={value} type="button" onClick={() => changeRole(value)} className={`rounded-full border px-3 py-1 text-sm ${role === value ? 'border-orange-500 bg-orange-500/10 text-orange-200' : 'border-white/10 text-gray-400'}`}>{t(label)}</button>)}
        </div>
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {meta.capabilities.map(({ key, label, owner_only: ownerOnly }) => {
            const locked = ownerOnly && !isOwner && !caps.has(key);
            return (
              <label key={key} className={`flex items-start gap-2 text-sm ${locked ? 'opacity-50' : ''}`}>
                <input type="checkbox" className="mt-0.5 accent-orange-500" disabled={locked} checked={caps.has(key)} onChange={() => toggle(key)} />
                <span>{t(label)}{defaults.has(key) !== caps.has(key) && <span className="ml-1 text-xs text-orange-300">({caps.has(key) ? t('extra') : t('removed')})</span>}{ownerOnly && <span className="ml-1 text-xs text-gray-500">· {t('owner only')}</span>}</span>
              </label>
            );
          })}
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Save')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

export default function StaffPage() {
  const gymId = useGymId();
  const t = useT();
  const confirm = useConfirm();
  const { role: myRole } = useCapabilities();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const reload = () => { setData(null); setVersion((v) => v + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    gymFetch(gymId, '/staff')
      .then((result) => { if (!cancelled) { setData(result); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [gymId, version]);

  const setActive = async (person) => {
    if (person.is_active && !(await confirm({
      title: t('Disable {name}?', { name: person.full_name }),
      message: t('They lose access to this dashboard straight away. You can turn it back on later.'),
      confirmLabel: t('Disable'),
    }))) return;
    try {
      await postJson(gymId, `/staff/${person.id}`, { is_active: !person.is_active }, 'PATCH');
      toast.success(person.is_active ? t('{name} disabled', { name: person.full_name }) : t('{name} enabled', { name: person.full_name }));
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const remove = async (person) => {
    if (!(await confirm({
      title: t('Remove {name} from the team?', { name: person.full_name }),
      message: t('Their LiftLens account stays, but they can no longer use this dashboard for your gym.'),
      confirmLabel: t('Remove'),
    }))) return;
    try {
      await gymFetch(gymId, `/staff/${person.id}`, { method: 'DELETE' });
      toast.success(t('{name} removed', { name: person.full_name }));
      reload();
    } catch (e) { toast.error(e.message); }
  };

  const staff = data?.staff ?? [];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Setup')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Staff management')}</h1><p className="mt-1 text-sm text-gray-400">{t('Give front-desk staff and trainers their own login, and choose what each person can do.')}</p></div>
        <Button onClick={() => setAdding(true)} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />{t('Add staff')}</Button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {data?.owner && <p className="flex items-center gap-2 text-sm text-gray-400"><Crown className="h-4 w-4 text-orange-400" />{t('Owner')}: <span className="text-white">{data.owner.full_name}</span> <span className="text-gray-500">({data.owner.email})</span></p>}
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3">{t('Name')}</th><th className="px-5 py-3">{t('Role')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3">{t('Added')}</th><th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={3} cols={5} /> : !staff.length ? (
                <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-400">{t('No staff yet. Add your front-desk team and trainers so they get their own login.')}</td></tr>
              ) : staff.map((person) => (
                <tr key={person.id} className={person.is_active ? '' : 'opacity-60'}>
                  <td className="px-5 py-3"><p className="font-medium">{person.full_name}</p><p className="text-xs text-gray-500">{person.email}</p></td>
                  <td className="px-5 py-3">{t(ROLE_LABEL[person.role] || person.role)}{person.customised && <span className="ml-2 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-300">{t('custom access')}</span>}</td>
                  <td className="px-5 py-3">{person.is_active ? <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-300">{t('Active')}</span> : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">{t('Disabled')}</span>}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(person.invited_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(person)}><KeyRound className="mr-1 h-3 w-3" />{t('Access')}</Button>
                      <Button size="sm" variant="outline" onClick={() => setActive(person)} title={person.is_active ? t('Disable') : t('Enable')}><Power className={`h-3 w-3 ${person.is_active ? 'text-orange-300' : 'text-green-300'}`} /><span className="sr-only">{person.is_active ? t('Disable') : t('Enable')}</span></Button>
                      <Button size="sm" variant="outline" onClick={() => remove(person)} title={t('Remove')}><Trash2 className="h-3 w-3 text-red-400" /><span className="sr-only">{t('Remove')}</span></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {adding && <AddStaffDialog gymId={gymId} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
      {editing && data && <PermissionsDialog gymId={gymId} person={editing} meta={data} isOwner={myRole === 'owner'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}
