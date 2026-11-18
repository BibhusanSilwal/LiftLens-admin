'use client';

import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { axisProps, ChartCard, ChartTooltip, compactMoney, gridProps, SeriesLegend, StatTile, VIZ } from '../../../components/charts';
import { periodLabel, RangeFilter, useReport } from '../../../components/ReportRange';
import { formatMoney, METHOD_LABELS, useGymId } from '../../lib/gym-api';
import { SkeletonPage } from '../../../components/Skeleton';
import { useT } from '../../../components/I18nProvider';

const STREAMS = [
  ['memberships', 'Memberships', VIZ.series[0]],
  ['pos', 'Front-desk sales', VIZ.series[1]],
  ['other', 'Other', VIZ.series[2]],
];

function exportCsv(data) {
  const currency = data.range.currency;
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [['Period', `Memberships (${currency})`, `Front-desk sales (${currency})`, `Other (${currency})`, `Refunds (${currency})`, `Net (${currency})`]];
  data.revenue.series.forEach((p) => rows.push([p.period, p.memberships / 100, p.pos / 100, p.other / 100, p.refunds / 100, p.net / 100]));
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv' }));
  anchor.download = `revenue-${data.range.date_from}-to-${data.range.date_to}.csv`;
  anchor.click();
}

export default function ReportsPage() {
  const gymId = useGymId();
  const t = useT();
  const { data, error, range, setRange, group, today } = useReport(gymId);
  const revenue = data?.revenue;
  const currency = data?.range?.currency || 'NPR';
  const money = (minor) => formatMoney({ amount_minor: minor, currency });

  // Only streams with money in the range get a slot, so an all-zero "Other" adds no legend noise.
  const streams = revenue ? STREAMS.filter(([key]) => revenue.series.some((p) => p[key] > 0)).map(([key, name, color]) => [key, t(name), color]) : [];
  const series = revenue?.series?.map((p) => ({ ...p, label: periodLabel(p.period, group) })) ?? [];
  const methods = revenue?.by_method?.map((m) => ({ name: t(METHOD_LABELS[m.method] || m.method), value: m.amount.amount_minor, count: m.count })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Business')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Revenue')}</h1><p className="mt-1 text-sm text-gray-400">{t("Money received, by stream, method and plan. Store credit isn't counted as new revenue.")}</p></div>
        {revenue && <Button variant="outline" onClick={() => exportCsv(data)}><Download className="mr-1 h-4 w-4" />{t('Export CSV')}</Button>}
      </div>
      <RangeFilter range={range} setRange={setRange} today={today} group={group} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!revenue ? (!error && <SkeletonPage />) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t('Net revenue')} value={formatMoney(revenue.net)} detail={t('{gross} received · {refunds} refunded', { gross: formatMoney(revenue.gross), refunds: formatMoney(revenue.refunds) })} />
            <StatTile label={t('Monthly run-rate')} value={formatMoney(revenue.monthly_run_rate)} detail={t('Active plans, priced per 30 days')} />
            <StatTile label={t('Outstanding')} value={formatMoney(revenue.outstanding)} detail={t('Unpaid balances on current plans')} tone={revenue.outstanding.amount_minor > 0 ? 'warn' : undefined} />
            <StatTile label={t('Payments')} value={revenue.payments} detail={range.preset ? t('in the last {count} days', { count: range.preset }) : t('in the selected range')} />
          </div>

          <ChartCard
            title={t('Revenue over time')}
            subtitle={t(`Received per ${group}, before refunds`)}
            height={300}
            legend={streams.length > 1 ? <SeriesLegend items={streams.map(([, name, color]) => [name, color])} /> : null}
            table={{ columns: [t('Period'), ...streams.map(([, name]) => name), t('Refunds'), t('Net')], rows: series.map((p) => [p.label, ...streams.map(([key]) => money(p[key])), money(p.refunds), money(p.net)]) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axisProps} width={48} tickFormatter={compactMoney} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip valueFormatter={money} />} />
                {streams.map(([key, name, color], index) => (
                  <Bar key={key} dataKey={key} name={name} stackId="revenue" fill={color} maxBarSize={36}
                    stroke={VIZ.surface} strokeWidth={streams.length > 1 ? 2 : 0}
                    radius={index === streams.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title={t('By payment method')}
              height={Math.max(160, methods.length * 44)}
              table={{ columns: [t('Method'), t('Amount'), t('Payments')], rows: methods.map((m) => [m.name, money(m.value), m.count]) }}
            >
              {!methods.length ? <p className="text-sm text-gray-500">{t('No payments in this range.')}</p> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={methods} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip valueFormatter={money} />} />
                    <Bar dataKey="value" name={t('Received')} fill={VIZ.series[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
                      <LabelList dataKey="value" position="right" formatter={compactMoney} style={{ fill: VIZ.textSecondary, fontSize: 12 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <Card className="border-white/10 bg-[#151515] p-5 lg:order-last">
              <h2 className="font-medium">{t('Front-desk sales: top products')}</h2>
              {!data.pos?.top_products?.length ? <p className="mt-3 text-sm text-gray-500">{t('No products sold in this range.')}</p> : (
                <table className="mt-3 w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500"><tr><th className="py-2 text-left font-medium">{t('Product')}</th><th className="py-2 text-right font-medium">{t('Units')}</th><th className="py-2 text-right font-medium">{t('Revenue')}</th></tr></thead>
                  <tbody className="divide-y divide-white/5">{data.pos.top_products.map((row) => <tr key={row.name}><td className="py-2">{row.name}</td><td className="py-2 text-right text-gray-400">{row.quantity}</td><td className="py-2 text-right">{formatMoney(row.revenue)}</td></tr>)}</tbody>
                </table>
              )}
              {data.pos?.low_stock?.length > 0 && <p className="mt-3 text-sm text-orange-300">{t('Low stock:')} {data.pos.low_stock.map((p) => `${p.name} (${p.stock_qty})`).join(', ')}</p>}
            </Card>

            <Card className="border-white/10 bg-[#151515] p-5">
              <h2 className="font-medium">{t('Membership revenue by plan')}</h2>
              {!revenue.by_plan.length ? <p className="mt-3 text-sm text-gray-500">{t('No membership payments in this range.')}</p> : (
                <table className="mt-3 w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500"><tr><th className="py-2 text-left font-medium">{t('Plan')}</th><th className="py-2 text-right font-medium">{t('Payments')}</th><th className="py-2 text-right font-medium">{t('Received')}</th><th className="py-2 text-right font-medium">{t('Share')}</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {revenue.by_plan.map((row) => {
                      const total = revenue.by_plan.reduce((sum, r) => sum + r.amount.amount_minor, 0) || 1;
                      return <tr key={row.plan}><td className="py-2">{row.plan}</td><td className="py-2 text-right text-gray-400">{row.count}</td><td className="py-2 text-right">{formatMoney(row.amount)}</td><td className="py-2 text-right text-gray-400">{Math.round((row.amount.amount_minor / total) * 100)}%</td></tr>;
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
