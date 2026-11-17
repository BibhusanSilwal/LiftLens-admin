'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisProps, ChartCard, ChartTooltip, gridProps, StatTile, VIZ } from '../../../components/charts';
import { periodLabel, RangeFilter, useReport } from '../../../components/ReportRange';
import { useGymId } from '../../lib/gym-api';
import { SkeletonPage } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';

const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`;

export default function AnalyticsPage() {
  const gymId = useGymId();
  const t = useT();
  const { data, error, range, setRange, group, today } = useReport(gymId);
  const members = data?.members;
  const attendance = data?.attendance;

  const visitSeries = attendance?.series?.map((p) => ({ ...p, label: periodLabel(p.period, group) })) ?? [];
  // Trim hours nobody visits at either end, so the chart shows the gym's real day.
  const busyHours = attendance?.by_hour?.filter((h) => h.visits > 0).map((h) => h.hour) ?? [];
  const hours = busyHours.length
    ? attendance.by_hour.filter((h) => h.hour >= Math.min(...busyHours) && h.hour <= Math.max(...busyHours)).map((h) => ({ ...h, label: hourLabel(h.hour) }))
    : [];
  const peak = hours.reduce((best, h) => (h.visits > (best?.visits ?? 0) ? h : best), null);
  const renewalRate = members?.renewal_rate;

  return (
    <div className="space-y-6">
      <div><p className="text-sm text-orange-400">{t('Business')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Members & attendance')}</h1><p className="mt-1 text-sm text-gray-400">{t('Growth, renewals and when people train.')}</p></div>
      <RangeFilter range={range} setRange={setRange} today={today} group={group} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!members ? (!error && <SkeletonPage />) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t('Active members')} value={members.active} detail={t('{frozen} frozen · {pending} awaiting payment', { frozen: members.frozen, pending: members.pending })} />
            <StatTile label={t('New members')} value={members.new} detail={t('Joined in this range')} />
            <StatTile label={t('Renewal rate')} value={renewalRate == null ? '—' : `${Math.round(renewalRate * 100)}%`} detail={members.ended ? t('{renewed} of {ended} plans that ended were renewed', { renewed: members.renewed, ended: members.ended }) : t('No plans ended in this range')} tone={renewalRate == null ? undefined : renewalRate >= 0.6 ? 'good' : 'warn'} />
            <StatTile label={t('Churned')} value={members.churned} detail={t('Plan ended without renewing')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/members?status=expiring"><StatTile label={t('Expiring in 7 days')} value={members.expiring_7} detail={t('{count} within 30 days', { count: members.expiring_30 })} tone={members.expiring_7 ? 'warn' : undefined} /></Link>
            <StatTile label={t('Visits')} value={attendance.visits} detail={t('{count} different members', { count: attendance.unique_visitors })} />
            <StatTile label={t('Average visit')} value={attendance.average_minutes == null ? '—' : t('{count} min', { count: attendance.average_minutes })} detail={t('Check-in to check-out')} />
            <StatTile label={t('Busiest hour')} value={peak ? hourLabel(peak.hour) : '—'} detail={peak ? t('{count} check-ins started then', { count: peak.visits }) : t('No visits yet')} />
          </div>

          <ChartCard title={t('Visits')} subtitle={t(`Check-ins per ${group}`)} table={{ columns: [t('Period'), t('Visits')], rows: visitSeries.map((p) => [p.label, p.visits]) }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} width={32} allowDecimals={false} />
                <Tooltip cursor={{ stroke: VIZ.axis, strokeDasharray: '3 3' }} content={<ChartTooltip />} />
                <Line type="monotone" dataKey="visits" name={t('Visits')} stroke={VIZ.series[0]} strokeWidth={2} dot={false}
                  activeDot={{ r: 5, stroke: VIZ.surface, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={t('When members arrive')} subtitle={t('Check-ins by hour of day')} table={{ columns: [t('Hour'), t('Visits')], rows: hours.map((h) => [hourLabel(h.hour), h.visits]) }}>
              {!hours.length ? <p className="text-sm text-gray-500">{t('No visits in this range.')}</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hours} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="15%">
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                    <YAxis {...axisProps} width={32} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
                    <Bar dataKey="visits" name={t('Check-ins')} fill={VIZ.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title={t('Busiest days')} subtitle={t('Check-ins by weekday')} table={{ columns: [t('Day'), t('Visits')], rows: attendance.by_weekday.map((d) => [d.day, d.visits]) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendance.by_weekday} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} width={32} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
                  <Bar dataKey="visits" name={t('Check-ins')} fill={VIZ.series[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title={t('Active members by plan')} height={Math.max(140, members.by_plan.length * 44)} table={{ columns: [t('Plan'), t('Active members')], rows: members.by_plan.map((p) => [p.plan, p.count]) }}>
            {!members.by_plan.length ? <p className="text-sm text-gray-500">{t('No active members yet.')}</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={members.by_plan} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="plan" {...axisProps} width={120} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
                  <Bar dataKey="count" name={t('Active members')} fill={VIZ.series[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="count" position="right" style={{ fill: VIZ.textSecondary, fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
