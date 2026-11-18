'use client';

import { useT } from './I18nProvider';

/** A grey block with a left → right shimmer (styles in globals.css). */
export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

function Busy({ children, className = '' }) {
  const t = useT();
  return <div role="status" aria-busy="true" className={className}><span className="sr-only">{t('Loading…')}</span>{children}</div>;
}

const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3'];

/** Placeholder rows for a <tbody>. */
export function SkeletonRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true">
      {Array.from({ length: cols }, (_, c) => (
        <td key={c} className="px-5 py-4"><Skeleton className={`h-4 ${WIDTHS[(r + c) % WIDTHS.length]}`} />{c === 0 && <Skeleton className="mt-2 h-3 w-1/3" />}</td>
      ))}
    </tr>
  ));
}

/** Stacked card placeholders (notices, plans, promotions…). */
export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <Busy className={`space-y-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-[#151515] p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-5 w-1/2" />
          <Skeleton className="mt-3 h-3 w-5/6" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </Busy>
  );
}

/** A row of KPI tiles. */
export function SkeletonStats({ count = 4 }) {
  return (
    <Busy className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-[#151515] p-5"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-7 w-28" /><Skeleton className="mt-3 h-3 w-36" /></div>
      ))}
    </Busy>
  );
}

/** A full page: stat tiles, then a large panel. */
export function SkeletonPage({ stats = 4 }) {
  return (
    <div className="space-y-6">
      {stats > 0 && <SkeletonStats count={stats} />}
      <Busy className="rounded-xl border border-white/10 bg-[#151515] p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 h-56 w-full" />
      </Busy>
    </div>
  );
}

/** Simple list lines (inside a card). */
export function SkeletonLines({ lines = 3, className = '' }) {
  return <Busy className={`space-y-3 ${className}`}>{Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-4 ${WIDTHS[i % WIDTHS.length]}`} />)}</Busy>;
}
