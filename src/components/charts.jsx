'use client';

import { useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { useT } from './I18nProvider';
import { Card } from './ui/Card';

/*
 * Chart tokens for the dark dashboard surface (#151515).
 * Categorical slots 1-3 are the validated dark steps (blue, orange, aqua):
 * validate_palette.js --mode dark --surface #151515 -> all checks pass
 * (worst adjacent CVD ΔE 9.4, normal-vision ΔE 26.5, all >= 3:1 contrast).
 * Single-measure charts use slot 1 only. Text never wears a series color.
 */
export const VIZ = {
  surface: '#151515',
  grid: 'rgba(255,255,255,0.08)',
  axis: '#8a8984',
  textPrimary: '#f0efec',
  textSecondary: '#c3c2b7',
  series: ['#3987e5', '#d95926', '#199e70'],
};

export const axisProps = {
  stroke: VIZ.grid,
  tick: { fill: VIZ.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
};

export const gridProps = { stroke: VIZ.grid, vertical: false };

/** Compact money for axes: 12.3k, 1.2M (whole currency units). */
export function compactMoney(minor) {
  const value = (minor || 0) / 100;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(value)}`;
}

/** Tooltip body in text tokens; a small swatch carries the series identity. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs shadow-xl" style={{ color: VIZ.textPrimary }}>
      <p className="mb-1 font-medium">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="flex items-center gap-2" style={{ color: VIZ.textSecondary }}>
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: item.color || item.fill }} />
          <span>{item.name}</span>
          <span className="ml-auto pl-3 font-medium" style={{ color: VIZ.textPrimary }}>{valueFormatter ? valueFormatter(item.value) : item.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Legend for >= 2 series: swatch + name in text ink. */
export function SeriesLegend({ items }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs" style={{ color: VIZ.textSecondary }}>
      {items.map(([name, color]) => (
        <span key={name} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{name}</span>
      ))}
    </div>
  );
}

/**
 * Card wrapper with a chart/table toggle. `table` = { columns: [label...], rows: [[cell...]] }.
 */
export function ChartCard({ title, subtitle, legend, table, children, className = '', height = 260 }) {
  const [showTable, setShowTable] = useState(false);
  const t = useT();
  return (
    <Card className={`border-white/10 bg-[#151515] p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium" style={{ color: VIZ.textPrimary }}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {table && (
          <button type="button" onClick={() => setShowTable((v) => !v)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/5" aria-pressed={showTable}>
            {showTable ? <><BarChart3 className="h-3.5 w-3.5" />{t('Chart')}</> : <><Table2 className="h-3.5 w-3.5" />{t('Table')}</>}
          </button>
        )}
      </div>
      {legend && !showTable && <div className="mt-3">{legend}</div>}
      <div className="mt-3">
        {showTable && table ? (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#151515] text-xs uppercase text-gray-500"><tr>{table.columns.map((column) => <th key={column} className="py-2 pr-4 font-medium">{column}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5">{table.rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i} className="py-1.5 pr-4 text-gray-300">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : <div style={{ height }}>{children}</div>}
      </div>
    </Card>
  );
}

/** Headline number tile (no chart needed for a single value). */
export function StatTile({ label, value, detail, tone }) {
  const toneClass = tone === 'good' ? 'text-green-300' : tone === 'warn' ? 'text-orange-300' : 'text-white';
  return (
    <Card className="border-white/10 bg-[#151515] p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${toneClass}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}
    </Card>
  );
}
