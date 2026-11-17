'use client';

import { useEffect, useState } from 'react';
import { addDays, gymFetch, isoDate } from '../app/lib/gym-api';
import { useT } from './I18nProvider';

const PRESETS = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];

function autoGroup(from, to) {
  const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  return days <= 45 ? 'day' : days <= 186 ? 'week' : 'month';
}

/** Date-range state + the report request for it. */
export function useReport(gymId) {
  const today = isoDate(new Date());
  const [range, setRange] = useState({ from: addDays(today, -29), to: today, preset: 30 });
  const [state, setState] = useState({ data: null, error: '' });
  const group = autoGroup(range.from, range.to);

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    gymFetch(gymId, `/reports/summary?date_from=${range.from}&date_to=${range.to}&group=${group}`)
      .then((data) => { if (!cancelled) setState({ data, error: '' }); })
      .catch((e) => { if (!cancelled) setState((s) => ({ ...s, error: e.message })); });
    return () => { cancelled = true; };
  }, [gymId, range.from, range.to, group]);

  // Clear the old report so the skeleton shows while the new range loads.
  const changeRange = (next) => { setState((s) => ({ ...s, data: null })); setRange(next); };
  return { ...state, range, setRange: changeRange, group, today };
}

/** One row of range controls above the charts. */
export function RangeFilter({ range, setRange, today, group }) {
  const t = useT();
  const choosePreset = (days) => setRange({ from: addDays(today, -(days - 1)), to: today, preset: days });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#151515] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1" role="group" aria-label={t('Date range')}>
        {PRESETS.map(([days, label]) => (
          <button key={days} type="button" onClick={() => choosePreset(days)} aria-pressed={range.preset === days} className={`rounded-md px-3 py-1.5 text-sm ${range.preset === days ? 'bg-orange-500/15 text-orange-200' : 'text-gray-400 hover:bg-white/5'}`}>{t(label)}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
        <input type="date" aria-label={t('From')} value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value, preset: null })} className="rounded-md border border-white/10 bg-[#0d0d0d] px-2 py-1.5 text-white" />
        <span>{t('to')}</span>
        <input type="date" aria-label={t('To')} value={range.to} min={range.from} max={today} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value, preset: null })} className="rounded-md border border-white/10 bg-[#0d0d0d] px-2 py-1.5 text-white" />
        <span className="hidden text-xs text-gray-500 sm:inline">{t(`by ${group}`)}</span>
      </div>
    </div>
  );
}

export function periodLabel(period, group) {
  const date = new Date(`${period}T00:00:00`);
  if (group === 'month') return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
