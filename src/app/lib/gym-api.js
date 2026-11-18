'use client';

import { useMemo, useRef } from 'react';
import { apiFetch } from './api';
import { useCapabilities } from '../dashboard/CapabilityProvider';

/** The gym the signed-in staff user is working in (first gym for now). */
export function useGymId() {
  const capabilities = useCapabilities();
  return useMemo(
    () => capabilities.activeGym?.id || capabilities.gym_id || capabilities.gyms?.[0]?.gym_id || null,
    [capabilities],
  );
}

/** Fetch a gym-scoped /api/v1/gyms/{id}/... endpoint through the BFF proxy. */
export function gymFetch(gymId, path, options = {}) {
  if (!gymId) return Promise.reject(new Error('No gym selected'));
  return apiFetch(`/api/v1/gyms/${gymId}${path}`, { cache: 'no-store', ...options });
}

/**
 * POST/PATCH JSON to a gym endpoint. Pass `{ idempotencyKey }` for writes that move money or
 * create records, so a retry or double-click replays the first result instead of repeating it.
 */
export function postJson(gymId, path, body, method = 'POST', { idempotencyKey } = {}) {
  return gymFetch(gymId, path, {
    method,
    body: JSON.stringify(body ?? {}),
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
  });
}

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * One Idempotency-Key per user action. `get()` returns the same key until `settle(error)`:
 * success or a 4xx clears it (the next submit is a new action, possibly with edited fields);
 * a network error or 5xx keeps it, so trying again cannot repeat a write that already landed.
 */
export function useIdempotencyKey() {
  const ref = useRef(null);
  return useMemo(() => ({
    get: () => {
      if (!ref.current) ref.current = newIdempotencyKey();
      return ref.current;
    },
    settle: (error) => {
      if (!error || (error.status >= 400 && error.status < 500)) ref.current = null;
    },
  }), []);
}

/** {amount_minor, currency} -> "NPR 3,000" */
export function formatMoney(money) {
  if (!money) return '—';
  const value = (money.amount_minor || 0) / 100;
  return `${money.currency || 'NPR'} ${value.toLocaleString(undefined, { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** "3,000.50" (rupees) -> 300050 (paisa). Returns NaN for invalid input. */
export function toMinor(value) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? Math.round(number * 100) : NaN;
}

export function fromMinor(amountMinor) {
  return ((amountMinor || 0) / 100).toString();
}

export function formatDate(value) {
  if (!value) return '—';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export function isoDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export const PAYMENT_METHODS = [
  ['cash', 'Cash'],
  ['fonepay', 'Fonepay QR'],
  ['esewa', 'eSewa'],
  ['khalti', 'Khalti'],
  ['card', 'Card'],
  ['bank', 'Bank transfer'],
  ['other', 'Other'],
];

export const METHOD_LABELS = Object.fromEntries([...PAYMENT_METHODS, ['store_credit', 'Store credit'], ['gift_card', 'Gift card']]);

export const STANDING_STYLES = {
  active: ['Active', 'bg-green-500/15 text-green-300'],
  expiring: ['Expiring', 'bg-orange-500/15 text-orange-300'],
  upcoming: ['Starts soon', 'bg-sky-500/15 text-sky-300'],
  pending: ['Awaiting payment', 'bg-yellow-500/15 text-yellow-300'],
  frozen: ['Frozen', 'bg-cyan-500/15 text-cyan-300'],
  expired: ['Expired', 'bg-white/10 text-gray-400'],
  cancelled: ['Cancelled', 'bg-white/10 text-gray-400'],
  none: ['No plan', 'bg-white/5 text-gray-500'],
};
