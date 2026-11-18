'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, KeyRound, Pause, Pencil, Plus, Search, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { apiFetch } from '../../lib/api';
import { SkeletonRows } from '../../../components/Skeleton';
import { useConfirm } from '../../../components/ConfirmProvider';

const STATUS_STYLES = {
  approved: 'bg-green-500/15 text-green-300',
  pending: 'bg-orange-500/15 text-orange-300',
  suspended: 'bg-red-500/15 text-red-300',
};

const optionalNumber = (min, max) => z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
  z.number().min(min).max(max).nullable(),
);

const detailsSchema = {
  gym_name: z.string().trim().min(2, 'Gym name is required'),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  website: z.union([z.literal(''), z.string().trim().url('Enter a full URL, e.g. https://…')]).optional(),
  description: z.string().trim().max(5000).optional(),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  is_partner: z.boolean(),
  status: z.enum(['approved', 'pending', 'suspended']),
};

const createSchema = z.object({
  ...detailsSchema,
  owner_full_name: z.string().trim().min(1, 'Owner name is required'),
  owner_email: z.string().trim().email('Enter a valid email'),
  owner_password: z.string().min(8, 'At least 8 characters'),
});
const editSchema = z.object(detailsSchema);

const EMPTY = {
  gym_name: '', phone: '', address: '', city: '', website: '', description: '',
  latitude: '', longitude: '', is_partner: true, status: 'approved',
  owner_full_name: '', owner_email: '', owner_password: '',
};

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('') + '#7';
}

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-gray-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-300">{error.message}</span>}
    </label>
  );
}

const inputClass = 'mt-1 w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none';

function GymFormModal({ gym, onClose, onSaved }) {
  const isEdit = Boolean(gym);
  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? { ...EMPTY, ...gym, latitude: gym.latitude ?? '', longitude: gym.longitude ?? '' }
      : EMPTY,
  });
  const [serverError, setServerError] = useState('');
  const password = useWatch({ control, name: 'owner_password' });

  const submit = async (values) => {
    setServerError('');
    const body = { ...values };
    if (isEdit) {
      delete body.owner_full_name; delete body.owner_email; delete body.owner_password;
    }
    try {
      const saved = await apiFetch(isEdit ? `/api/platform/gyms/${gym.id}` : '/api/platform/gyms', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      toast.success(isEdit ? 'Gym updated' : `${saved.gym_name} created. The owner can now sign in with ${saved.owner_email}.`);
      onSaved();
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit(submit)} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151515] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{isEdit ? `Edit ${gym.gym_name}` : 'New gym'}</h2>
            <p className="mt-1 text-sm text-gray-400">{isEdit ? 'Update the gym profile shown to members.' : 'Creates the gym and its owner login. The owner can sign in to this dashboard right away.'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/5" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        {!isEdit && (
          <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-400">Owner account</legend>
            <Field label="Owner name" error={errors.owner_full_name}><input className={inputClass} {...register('owner_full_name')} /></Field>
            <Field label="Owner email (login)" error={errors.owner_email}><input type="email" className={inputClass} {...register('owner_email')} /></Field>
            <Field label="Temporary password" error={errors.owner_password} className="sm:col-span-2">
              <div className="mt-1 flex gap-2">
                <input type="text" autoComplete="new-password" className={`${inputClass} mt-0 font-mono`} {...register('owner_password')} />
                <Button type="button" variant="outline" onClick={() => setValue('owner_password', generatePassword(), { shouldValidate: true })}><KeyRound className="mr-1 h-4 w-4" />Generate</Button>
              </div>
              {password && <span className="mt-1 block text-xs text-gray-500">Share this with the owner securely; they can change it after signing in.</span>}
            </Field>
          </fieldset>
        )}

        <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-400">Gym profile</legend>
          <Field label="Gym name" error={errors.gym_name} className="sm:col-span-2"><input className={inputClass} {...register('gym_name')} /></Field>
          <Field label="Phone" error={errors.phone}><input className={inputClass} {...register('phone')} /></Field>
          <Field label="Website" error={errors.website}><input className={inputClass} placeholder="https://" {...register('website')} /></Field>
          <Field label="Address" error={errors.address}><input className={inputClass} {...register('address')} /></Field>
          <Field label="City" error={errors.city}><input className={inputClass} {...register('city')} /></Field>
          <Field label="Latitude" error={errors.latitude}><input inputMode="decimal" className={inputClass} placeholder="27.7172" {...register('latitude')} /></Field>
          <Field label="Longitude" error={errors.longitude}><input inputMode="decimal" className={inputClass} placeholder="85.3240" {...register('longitude')} /></Field>
          <p className="-mt-2 text-xs text-gray-500 sm:col-span-2">Coordinates let members find the gym with &ldquo;Near me&rdquo; in the app.</p>
          <Field label="Description" error={errors.description} className="sm:col-span-2"><textarea rows={3} className={inputClass} {...register('description')} /></Field>
          <Field label="Status" error={errors.status}>
            <select className={inputClass} {...register('status')}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 self-end pb-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-orange-500" {...register('is_partner')} />
            <span>Partner gym <span className="block text-xs text-gray-500">Listed in the app&apos;s Discover tab</span></span>
          </label>
        </fieldset>

        {serverError && <p className="mt-4 rounded-lg bg-red-950/40 p-3 text-sm text-red-300">{serverError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-orange-500 text-black hover:bg-orange-400">{isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create gym'}</Button>
        </div>
      </form>
    </div>
  );
}

export default function GymsPage() {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, object = edit
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/platform/gyms', { cache: 'no-store' });
      setGyms(Array.isArray(data) ? data : data.gyms || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // The effect must not return load()'s promise: React would call it as a cleanup function.
  useEffect(() => { load(); }, [load]);

  const update = async (gym, body, message) => {
    try {
      await apiFetch(`/api/platform/gyms/${gym.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast.success(message);
      setLoading(true);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const suspend = async (gym) => {
    const ok = await confirm({
      title: `Suspend ${gym.gym_name}?`,
      message: "Members won't be able to join it and it disappears from the app. You can approve it again later.",
      confirmLabel: 'Suspend',
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/platform/gyms/${gym.id}`, { method: 'DELETE' });
      toast.success(`${gym.gym_name} suspended`);
      setLoading(true);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return gyms.filter((gym) => (statusFilter === 'all' || gym.status === statusFilter)
      && (!term || [gym.gym_name, gym.city, gym.owner_email, gym.owner_name].some((value) => (value || '').toLowerCase().includes(term))));
  }, [gyms, query, statusFilter]);

  const counts = useMemo(() => gyms.reduce((acc, gym) => ({ ...acc, [gym.status]: (acc[gym.status] || 0) + 1 }), {}), [gyms]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-orange-400">Platform administration</p>
          <h1 className="mt-1 text-3xl font-semibold">Gyms</h1>
          <p className="mt-1 text-sm text-gray-400">{gyms.length} gyms · {counts.approved || 0} approved · {counts.pending || 0} pending · {counts.suspended || 0} suspended</p>
        </div>
        <Button onClick={() => setEditing('new')} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-1 h-4 w-4" />New gym</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by gym, city or owner" className="w-full rounded-lg border border-white/10 bg-[#151515] px-10 py-2.5 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-white/10 bg-[#151515] px-3 py-2.5 text-sm">
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">Gym</th>
                <th className="px-5 py-4">Owner</th>
                <th className="px-5 py-4">Members</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Partner</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <SkeletonRows rows={5} cols={6} />
              ) : !visible.length ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-gray-500">{gyms.length ? 'No gyms match these filters.' : 'No gyms yet. Create the first one.'}</td></tr>
              ) : visible.map((gym) => (
                <tr key={gym.id} className="hover:bg-white/[.02]">
                  <td className="px-5 py-4"><p className="font-medium">{gym.gym_name}</p><p className="text-xs text-gray-500">{gym.city || 'No city'}</p></td>
                  <td className="px-5 py-4"><p>{gym.owner_name || '—'}</p><p className="text-xs text-gray-500">{gym.owner_email}</p></td>
                  <td className="px-5 py-4 text-gray-300">{gym.active_members}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${STATUS_STYLES[gym.status] || ''}`}>{gym.status}</span></td>
                  <td className="px-5 py-4">
                    <button onClick={() => update(gym, { is_partner: !gym.is_partner }, gym.is_partner ? 'Removed from the app directory' : 'Listed in the app directory')} className={`rounded-full px-3 py-1 text-xs ${gym.is_partner ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-gray-400'}`} title="Partner gyms appear in the app's Discover tab">
                      {gym.is_partner ? 'Partner' : 'Not listed'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {gym.status !== 'approved' && <Button onClick={() => update(gym, { status: 'approved' }, `${gym.gym_name} approved`)} size="sm" className="bg-green-600 hover:bg-green-500"><Check className="mr-1 h-3 w-3" />Approve</Button>}
                      {gym.status !== 'suspended' && <Button onClick={() => suspend(gym)} size="sm" variant="outline"><Pause className="mr-1 h-3 w-3" />Suspend</Button>}
                      <Button onClick={() => setEditing(gym)} size="sm" variant="outline"><Pencil className="mr-1 h-3 w-3" />Edit</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <GymFormModal
          gym={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setLoading(true); load(); }}
        />
      )}
    </div>
  );
}
