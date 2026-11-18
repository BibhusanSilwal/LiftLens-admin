'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from './api';
import { useGymId } from './gym-api';

const fetcher = (url) => apiFetch(url, { cache: 'no-store' });

/**
 * Stale-while-revalidate data for a BFF route (`/api/...`).
 *
 * - Cached data shows at once when you come back to a page, then refreshes in the background
 *   (and again when the tab regains focus).
 * - `live: true` is for data staff act on (balances, subscription status, check-in state): it
 *   never shows a cached copy from an earlier visit, only what this mount fetched.
 * - After a write, call `mutate()` to refetch; the old data stays on screen meanwhile.
 * - `data` is undefined until the first load, so render a Skeleton for `!data && !error`.
 *
 * Pass `null` as the url to skip fetching (e.g. while the gym id is unknown).
 */
export function useApiData(url, { live = false, ...options } = {}) {
  // A per-mount key part keeps live data out of the shared cache.
  const [mountKey] = useState(() => (live ? Math.random().toString(36).slice(2) : ''));
  return useSWR(url ? [url, mountKey] : null, ([path]) => fetcher(path), {
    keepPreviousData: true,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
    ...options,
  });
}

/** `useApiData` for a gym-scoped `/api/v1/gyms/{gymId}{path}` endpoint. */
export function useGymData(path, options) {
  const gymId = useGymId();
  return useApiData(gymId && path ? `/api/v1/gyms/${gymId}${path}` : null, options);
}

/** Error message for a SWR error, or ''. */
export const errorMessage = (error) => (error ? error.message || 'Request failed' : '');
