'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DateTimeInput, FormField, inputClass } from '../../../components/Modal';
import { Skeleton, SkeletonRows } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';
import { addDays, isoDate, useGymId } from '../../lib/gym-api';
import { errorMessage, useGymData } from '../../lib/use-gym-data';

const dateFmt = (value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = (value) => (value ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—');
const duration = (minutes) => (minutes == null ? '—' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`);
const METHOD = { qr: 'QR', manual: 'Desk' };

function toCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Member', 'Email', 'Date', 'Arrived', 'Left', 'Minutes', 'Check-in', 'Check-out', 'Auto-closed'];
  const lines = rows.map((r) => [r.member.full_name, r.member.email, new Date(r.check_in_at).toLocaleDateString(), timeFmt(r.check_in_at), timeFmt(r.check_out_at), r.duration_minutes, METHOD[r.check_in_method], METHOD[r.check_out_method] || '', r.auto_closed ? 'yes' : ''].map(escape).join(','));
  return [header.map(escape).join(','), ...lines].join('\n');
}

export default function AttendancePage() {
  const gymId = useGymId();
  const t = useT();
  const today = isoDate(new Date());
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const query = new URLSearchParams({ date_from: from, date_to: to, page_size: '500' });
  if (submitted) query.set('search', submitted);
  // Live: who is in the gym right now is acted on at the desk.
  const { data, error: loadError } = useGymData(`/attendance?${query}`, { live: true, keepPreviousData: false });
  const error = errorMessage(loadError);

  const exportCsv = () => {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([toCsv(data?.results ?? [])], { type: 'text/csv' }));
    anchor.download = `attendance-${from}-to-${to}.csv`;
    anchor.click();
  };
  const changeDate = (setter) => (e) => { if (e.target.value) setter(e.target.value); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Attendance')}</h1><p className="mt-1 text-sm text-gray-400">{t('Arrival and leaving times for every visit.')}</p></div>
        {(data?.results?.length ?? 0) > 0 && <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />{t('Export CSV')}</Button>}
      </div>
      <Card className="border-white/10 bg-[#151515] p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end" onSubmit={(e) => { e.preventDefault(); setSubmitted(search.trim()); }}>
          <FormField label={t('From')}><DateTimeInput type="date" required value={from} max={to} onChange={changeDate(setFrom)} /></FormField>
          <FormField label={t('To')}><DateTimeInput type="date" required value={to} min={from} max={today} onChange={changeDate(setTo)} /></FormField>
          <FormField label={t('Member')} className="lg:flex-1"><input data-page-search className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Name or email')} /></FormField>
          <Button type="submit" variant="outline">{t('Filter')}</Button>
        </form>
      </Card>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {data ? <p className="text-sm text-gray-400">{t('{count} visits by {members} member(s)', { count: data.count, members: data.unique_members })}</p> : !error && <Skeleton className="h-4 w-48" />}
      <Card className="overflow-hidden border-white/10 bg-[#151515]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-5 py-4">{t('Member')}</th><th className="px-5 py-4">{t('Date')}</th><th className="px-5 py-4">{t('Arrived')}</th><th className="px-5 py-4">{t('Left')}</th><th className="px-5 py-4">{t('Time spent')}</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {!data ? <SkeletonRows rows={6} cols={5} />
                : !data.results.length ? <tr><td colSpan="5" className="px-5 py-8 text-center text-gray-500">{t('No visits in this range.')}</td></tr>
                : data.results.map((record) => (
                  <tr key={record.id}>
                    <td className="px-5 py-3"><Link href={`/dashboard/members/${record.member.id}`} className="hover:text-orange-400">{record.member.full_name}</Link></td>
                    <td className="px-5 py-3 text-gray-400">{dateFmt(record.check_in_at)}</td>
                    <td className="px-5 py-3">{timeFmt(record.check_in_at)} <span className="text-xs text-gray-600">{t(METHOD[record.check_in_method] || '')}</span></td>
                    <td className="px-5 py-3">{record.is_open ? <span className="text-green-300">{t('In the gym')}</span> : <>{timeFmt(record.check_out_at)} <span className="text-xs text-gray-600">{record.auto_closed ? t('auto') : t(METHOD[record.check_out_method] || '')}</span></>}</td>
                    <td className="px-5 py-3 text-gray-300">{duration(record.duration_minutes)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
