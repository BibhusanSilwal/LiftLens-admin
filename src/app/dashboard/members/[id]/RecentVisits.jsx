'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DoorOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { SkeletonLines } from '../../../../components/Skeleton';
import { useT } from '../../../../components/I18nProvider';
import { addDays, gymFetch, isoDate } from '../../../lib/gym-api';

const when = (value) => new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const timeOnly = (value) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const duration = (minutes) => (minutes == null ? '' : minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`);

/** Last 30 days of a member's visits on their profile. */
export function RecentVisits({ gymId, userId }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    const today = isoDate(new Date());
    gymFetch(gymId, `/attendance?member_id=${userId}&date_from=${addDays(today, -29)}&date_to=${today}&page_size=50`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [gymId, userId]);

  return (
    <Card className="border-white/10 bg-[#151515]">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-medium"><DoorOpen className="h-4 w-4 text-orange-400" />{t('Visits (last 30 days)')}</h2>
        {data && <span className="text-sm text-gray-400">{t('{count} visit(s)', { count: data.count })}</span>}
      </CardHeader>
      <CardContent className="text-sm">
        {error ? <p className="text-red-300">{error}</p> : !data ? <SkeletonLines lines={3} /> : !data.results.length ? <p className="text-gray-400">{t('No visits in the last 30 days.')}</p> : (
          <ul className="divide-y divide-white/5">
            {data.results.slice(0, 10).map((record) => (
              <li key={record.id} className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2">
                <span>{when(record.check_in_at)}</span>
                <span className="text-gray-400">{record.is_open ? <span className="text-green-300">{t('In the gym')}</span> : t('left {time} · {duration}', { time: timeOnly(record.check_out_at), duration: duration(record.duration_minutes) })}</span>
              </li>
            ))}
          </ul>
        )}
        {data?.count > 10 && <Link href="/dashboard/attendance" className="mt-2 inline-block text-orange-400 hover:underline">{t('All attendance →')}</Link>}
      </CardContent>
    </Card>
  );
}
