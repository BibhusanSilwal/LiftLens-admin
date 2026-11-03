'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';

const VERIFY_URL = '/api/auth/email-verification/verify/';
const APP_SCHEME = process.env.NEXT_PUBLIC_MOBILE_APP_SCHEME || 'liftlens';
const ANDROID_PACKAGE = 'com.dev.lift_lens';
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

function getErrorMessage(data) {
  return data?.detail || data?.message || 'This verification link is invalid or has expired.';
}

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');
  const [token, setToken] = useState('');

  const appUrl = useMemo(() => {
    if (!token) return '';
    return `${APP_SCHEME}://verify-email?token=${encodeURIComponent(token)}`;
  }, [token]);

  const openApp = () => {
    if (!appUrl) return;

    const fallbackTimer = window.setTimeout(() => {
      if (!document.hidden) window.location.assign(PLAY_STORE_URL);
    }, 1500);

    const clearFallback = () => window.clearTimeout(fallbackTimer);
    document.addEventListener('visibilitychange', clearFallback, { once: true });
    window.location.assign(appUrl);
  };

  useEffect(() => {
    const verificationToken = new URLSearchParams(window.location.search).get('token');
    if (!verificationToken) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    setToken(verificationToken);
    let cancelled = false;

    const verifyEmail = async () => {
      try {
        const response = await fetch(VERIFY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verificationToken }),
        });
        const responseText = await response.text();
        let data = {};
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch {
            data = {};
          }
        }

        if (!response.ok) {
          throw new Error(getErrorMessage(data));
        }

        if (!cancelled) {
          setStatus('success');
          setMessage('Your email has been verified successfully.');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error.message || 'Email verification failed. Please try again.');
        }
      }
    };

    verifyEmail();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'success' || !appUrl) return;

    const fallbackTimer = window.setTimeout(() => {
      if (!document.hidden) window.location.assign(PLAY_STORE_URL);
    }, 1500);
    const clearFallback = () => window.clearTimeout(fallbackTimer);

    document.addEventListener('visibilitychange', clearFallback, { once: true });
    window.location.assign(appUrl);

    return () => {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', clearFallback);
    };
  }, [status, appUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
        {status === 'loading' && <Loader2 className="mx-auto mb-5 h-12 w-12 animate-spin text-orange-500" />}
        {status === 'success' && <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-green-500" />}
        {status === 'error' && <XCircle className="mx-auto mb-5 h-12 w-12 text-red-500" />}
        <h1 className="text-2xl font-semibold">
          {status === 'loading' ? 'Verifying email' : status === 'success' ? 'Email verified' : 'Verification failed'}
        </h1>
        <p className="mt-3 text-zinc-400">{message}</p>
        {status === 'success' && (
          <button
            type="button"
            onClick={openApp}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-3 font-medium transition hover:bg-orange-500"
          >
            Open LiftLens app <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </section>
    </main>
  );
}
