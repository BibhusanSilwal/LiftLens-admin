'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { apiFetch } from '../../lib/api';

const schema = z.object({
  name: z.string().min(1, 'Gym name is required'),
  location: z.string().min(1, 'Location is required'),
  timezone: z.string().min(1),
  logo: z.string().url('Enter a valid logo URL').or(z.literal('')),
  facilities: z.string(),
  hours: z.string(),
});

const FIELDS = [['name', 'Gym name'], ['logo', 'Logo URL'], ['location', 'Location'], ['timezone', 'Timezone'], ['hours', 'Hours'], ['facilities', 'Facilities (comma separated)']];

export default function SettingsPage() {
  const t = useT();
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  useEffect(() => {
    apiFetch('/api/users/gym/profile')
      .then((data) => { reset({ ...data, facilities: Array.isArray(data.facilities) ? data.facilities.join(', ') : data.facilities || '', hours: typeof data.hours === 'object' ? JSON.stringify(data.hours) : data.hours || '' }); setLoaded(true); })
      .catch((e) => setError(e.message));
  }, [reset]);
  const submit = async (values) => {
    setError('');
    try {
      await apiFetch('/api/users/gym/profile', { method: 'PATCH', body: JSON.stringify({ ...values, facilities: values.facilities.split(',').map((item) => item.trim()).filter(Boolean) }) });
      toast.success(t('Gym profile saved'));
    } catch (e) { setError(e.message); toast.error(e.message); }
  };
  return (
    <div className="max-w-3xl space-y-6">
      <div><p className="text-sm text-orange-400">{t('Setup')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Gym profile')}</h1><p className="mt-2 text-gray-400">{t('Keep the details your members see up to date.')}</p></div>
      <Card className="border-white/10 bg-[#151515]">
        <CardHeader><h2 className="font-medium">{t('Details')}</h2></CardHeader>
        <CardContent>
          {!loaded && !error ? (
            <div className="grid gap-5 sm:grid-cols-2" aria-hidden="true">{FIELDS.map(([name]) => <div key={name}><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-10 w-full" /></div>)}</div>
          ) : (
            <form onSubmit={handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2">
              {FIELDS.map(([name, label]) => <label key={name} className="space-y-2 text-sm"><span>{t(label)}</span><input {...register(name)} className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 outline-none focus:border-orange-500" />{errors[name] && <span className="text-xs text-red-300">{t(errors[name].message)}</span>}</label>)}
              <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><div>{error && <span className="text-sm text-red-300">{error}</span>}</div><Button disabled={isSubmitting} className="bg-orange-500 text-black hover:bg-orange-400">{isSubmitting ? t('Saving…') : t('Save changes')}</Button></div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
