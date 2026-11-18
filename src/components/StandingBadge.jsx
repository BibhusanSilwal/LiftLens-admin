'use client';

import { STANDING_STYLES } from '../app/lib/gym-api';
import { useT } from './I18nProvider';

export function StandingBadge({ standing }) {
  const t = useT();
  const [label, style] = STANDING_STYLES[standing] || STANDING_STYLES.none;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${style}`}>{t(label)}</span>;
}
