'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
import { joinsRequest } from '../../lib/joins-api';

const ANDROID_PACKAGE = process.env.NEXT_PUBLIC_ANDROID_PACKAGE || 'com.dev.lift_lens';
const ANDROID_STORE_URL = process.env.NEXT_PUBLIC_ANDROID_STORE_URL || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const IOS_STORE_URL = process.env.NEXT_PUBLIC_IOS_STORE_URL || 'https://apps.apple.com/app/liftlens/id000000000';
const JOIN_DOMAIN = (process.env.NEXT_PUBLIC_JOIN_DOMAIN || 'liftlens.app').replace(/^https?:\/\//, '').replace(/\/+$/, '');

const ERROR_TITLES = {
  join_code_expired: 'This invite has expired',
  join_code_exhausted: 'This invite is no longer available',
  join_code_invalid: 'Invalid invite',
  gym_not_approved: 'This gym is not accepting members yet',
};

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  return 'other';
}

// Play Store keeps the referrer through install; the app reads join_token from it on first launch.
function playStoreUrl(token) {
  const separator = ANDROID_STORE_URL.includes('?') ? '&' : '?';
  return `${ANDROID_STORE_URL}${separator}referrer=${encodeURIComponent(`join_token=${token}`)}`;
}

// Opens the installed app via its App Link; Chrome falls back to the Play Store (with referrer) if not installed.
function androidIntentUrl(token) {
  return `intent://${JOIN_DOMAIN}/join/${encodeURIComponent(token)}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreUrl(token))};end`;
}

export default function PublicJoinPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    joinsRequest(`/api/v1/join/resolve/${token}`)
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }));
  }, [token]);

  if (state.loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#090909] text-gray-400">Loading invite…</main>;
  }
  if (state.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">{ERROR_TITLES[state.error.code] || 'Unable to open invite'}</h1>
          <p className="mt-3 text-gray-400">{state.error.message}</p>
        </div>
      </main>
    );
  }

  const { gym, default_plan: plan, expires_at: expiresAt, short_code: shortCode } = state.data;
  // Safe to read the user agent here: the server render always shows the loading state.
  const platform = detectPlatform();
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(shortCode); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };
  const storeLink = 'flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-center text-sm hover:bg-white/5';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090909] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-6 text-center sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gym.logo || '/logo.png'} alt={gym.gym_name} className="mx-auto h-20 max-w-48 object-contain" />
        <p className="mt-6 text-sm text-orange-400">You&apos;re invited to join</p>
        <h1 className="mt-1 text-3xl font-semibold">{gym.gym_name}</h1>
        <p className="mt-2 text-gray-400">{[gym.address, gym.city].filter(Boolean).join(', ')}</p>

        {plan && (
          <div className="mt-6 rounded-xl border border-white/10 p-4 text-left">
            <p className="font-medium">{plan.name}</p>
            <p className="mt-1 text-sm text-gray-400">
              {plan.duration_days} days · {plan.price.currency} {(plan.price.amount_minor / 100).toLocaleString()}
            </p>
          </div>
        )}

        <div className="mt-7 grid gap-3">
          {platform === 'android' && (
            <a href={androidIntentUrl(token)} className="rounded-lg bg-orange-500 px-4 py-3 font-medium text-black hover:bg-orange-400">
              Open in LiftLens
            </a>
          )}
          {platform === 'ios' && (
            <a href={IOS_STORE_URL} className="rounded-lg bg-orange-500 px-4 py-3 font-medium text-black hover:bg-orange-400">
              Get LiftLens on the App Store
            </a>
          )}
          {platform === 'other' && (
            <p className="text-sm text-gray-400">Scan this gym&apos;s QR code with your phone, or install LiftLens and enter the code below.</p>
          )}
          <div className="flex gap-3">
            <a className={storeLink} href={IOS_STORE_URL}>App Store</a>
            <a className={storeLink} href={playStoreUrl(token)}>Google Play</a>
          </div>
        </div>

        {shortCode && (
          <div className="mt-7 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <p className="text-sm text-gray-300">
              {platform === 'android' ? 'If the app doesn’t join you automatically, tap “Enter gym code” in the Gyms tab:' : 'After installing, open the Gyms tab, tap “Enter gym code” and type:'}
            </p>
            <button onClick={copyCode} className="mt-3 inline-flex items-center gap-3 rounded-lg px-3 py-1 font-mono text-3xl font-bold tracking-[0.3em] text-orange-300 hover:bg-white/5" aria-label="Copy gym code">
              {shortCode}
              {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5 text-gray-500" />}
            </button>
          </div>
        )}

        {expiresAt && <p className="mt-4 text-xs text-gray-500">Invite expires {new Date(expiresAt).toLocaleString()}</p>}
      </div>
    </main>
  );
}
