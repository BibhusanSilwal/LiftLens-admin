'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { LogIn, LogOut, Maximize2, RefreshCw, Search, Settings2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormField, inputClass, Modal } from '../../../components/Modal';
import { Skeleton, SkeletonLines } from '../../../components/Skeleton';
import { useConfirm } from '../../../components/ConfirmProvider';
import { useT } from '../../../components/I18nProvider';
import { STANDING_STYLES, gymFetch, postJson, useGymId } from '../../lib/gym-api';
import { useCapabilities } from '../CapabilityProvider';

const timeOnly = (value) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function since(value, now) {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Rotating QR for the front desk. Refreshes itself just before each code expires. */
function RotatingQr({ gymId, onCount }) {
  const t = useT();
  const [display, setDisplay] = useState(null);
  const [image, setImage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    let refreshTimer;
    const refresh = async () => {
      try {
        const data = await gymFetch(gymId, '/checkin-display');
        if (cancelled) return;
        setDisplay(data);
        setSecondsLeft(data.expires_in);
        setImage(await QRCode.toDataURL(data.url, { margin: 1, width: 640, errorCorrectionLevel: 'M' }));
        setError('');
        onCount?.(data.members_in);
        refreshTimer = setTimeout(refresh, Math.max(1, data.expires_in) * 1000);
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
        refreshTimer = setTimeout(refresh, 5000);
      }
    };
    refresh();
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { cancelled = true; clearTimeout(refreshTimer); clearInterval(tick); };
  }, [gymId, onCount]);

  const fullscreen = () => containerRef.current?.requestFullscreen?.().catch(() => {});
  const progress = display ? (secondsLeft / display.rotation_seconds) * 100 : 0;

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 text-black sm:p-6 [&:fullscreen]:p-16">
      <p className="text-sm font-medium uppercase tracking-widest text-gray-500">{display?.gym?.name || t('Check-in')}</p>
      <h2 className="mt-1 text-center text-xl font-bold sm:text-2xl">{t('Scan with LiftLens to check in or out')}</h2>
      <div className="mt-5 aspect-square w-full max-w-[22rem] [:fullscreen_&]:max-w-[60vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt={t('Check-in QR code')} className="h-full w-full" /> : <div className="skeleton h-full w-full rounded-xl !bg-gray-200" />}
      </div>
      <div className="mt-4 h-1.5 w-full max-w-[22rem] overflow-hidden rounded-full bg-gray-200"><div className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-center text-xs text-gray-500">{error ? <span className="text-red-600">{error}</span> : t('New code in {seconds}s · Gyms tab → Check in / out', { seconds: secondsLeft })}</p>
      <Button variant="outline" size="sm" onClick={fullscreen} className="mt-4 border-gray-300 text-gray-700 hover:bg-gray-100 [:fullscreen_&]:hidden"><Maximize2 className="mr-1 h-4 w-4" />{t('Full screen')}</Button>
    </div>
  );
}

function SettingsDialog({ gymId, onClose }) {
  const t = useT();
  const confirm = useConfirm();
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { gymFetch(gymId, '/checkin-settings').then(setValues).catch((e) => toast.error(e.message)); }, [gymId]);
  const save = async () => {
    setSaving(true);
    try { await postJson(gymId, '/checkin-settings', values, 'PATCH'); toast.success(t('Check-in settings saved')); onClose(); } catch (e) { toast.error(e.message); setSaving(false); }
  };
  const rotate = async () => {
    const ok = await confirm({
      title: t('Reset all check-in codes?'),
      message: t('Every code shown so far stops working. Use this if a photo of the screen is being shared.'),
      confirmLabel: t('Reset codes'),
    });
    if (!ok) return;
    try { await postJson(gymId, '/checkin-key/rotate'); toast.success(t('Codes reset')); } catch (e) { toast.error(e.message); }
  };
  return (
    <Modal title={t('Check-in settings')} onClose={onClose} footer={values && <><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button disabled={saving} onClick={save} className="bg-orange-500 text-black hover:bg-orange-400">{saving ? t('Saving…') : t('Save')}</Button></>}>
      {!values ? <SkeletonLines lines={4} /> : (
        <div className="space-y-4 text-sm">
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 accent-orange-500" checked={values.require_active_subscription} onChange={(e) => setValues({ ...values, require_active_subscription: e.target.checked })} /><span>{t('Only members with an active, paid plan can check themselves in')}<span className="block text-xs text-gray-500">{t('Frozen, expired and unpaid members are told to see the front desk. Staff can still check anyone in manually.')}</span></span></label>
          <FormField label={t('Code changes every (seconds)')} hint={t('Shorter = harder to share a photo of the code')}><input type="number" min="15" max="300" className={inputClass} value={values.rotation_seconds} onChange={(e) => setValues({ ...values, rotation_seconds: Number(e.target.value) })} /></FormField>
          <FormField label={t('Close forgotten check-outs after (hours)')}><input type="number" min="1" max="24" className={inputClass} value={values.auto_close_hours} onChange={(e) => setValues({ ...values, auto_close_hours: Number(e.target.value) })} /></FormField>
          <Button type="button" variant="outline" size="sm" onClick={rotate}><RefreshCw className="mr-1 h-3.5 w-3.5" />{t('Reset all codes now')}</Button>
        </div>
      )}
    </Modal>
  );
}

export default function CheckInPage() {
  const gymId = useGymId();
  const t = useT();
  const { can } = useCapabilities();
  const [live, setLive] = useState(null);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const reloadLive = () => { setLive(null); setVersion((v) => v + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    const load = () => gymFetch(gymId, '/attendance/live').then((data) => { if (!cancelled) setLive(data); }).catch(() => {});
    load();
    const poll = setInterval(() => { load(); setNow(Date.now()); }, 15000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [gymId, version]);

  useEffect(() => {
    if (!gymId || query.trim().length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      gymFetch(gymId, `/members?search=${encodeURIComponent(query.trim())}&page_size=8`)
        .then((data) => { if (!cancelled) setMatches(data.results); }).catch(() => {});
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, query]);

  const act = async (memberId, action, name) => {
    try {
      const result = await postJson(gymId, '/attendance/manual', { member_id: memberId, action });
      if (result.warning) toast.warning(t('{name} checked in. Note: {warning}', { name, warning: result.warning }));
      else toast.success(action === 'in' ? t('{name} checked in', { name }) : t('{name} checked out', { name }));
      setQuery(''); setMatches([]); reloadLive();
    } catch (e) { toast.error(e.message); }
  };

  const insideIds = new Set((live?.results || []).map((record) => record.member.id));
  const visibleMatches = query.trim().length >= 2 ? matches : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-orange-400">{t('Front desk')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Check-in')}</h1><p className="mt-1 text-sm text-gray-400">{t("Keep this screen facing members. The code changes every few seconds so it can't be shared as a photo.")}</p></div>
        {can('gym.settings') && <Button variant="outline" onClick={() => setShowSettings(true)}><Settings2 className="mr-1 h-4 w-4" />{t('Settings')}</Button>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RotatingQr gymId={gymId} />
        <div className="space-y-6">
          <Card className="border-white/10 bg-[#151515] p-5">
            <h2 className="font-medium">{t('Manual check-in')}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("For members without their phone. Staff can check in anyone; you'll see a warning if their plan isn't active.")}</p>
            <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input data-page-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search member by name, email or phone')} className="w-full rounded-lg border border-white/10 bg-[#0d0d0d] py-2.5 pl-10 pr-3 text-sm" /></div>
            {visibleMatches.length > 0 && (
              <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10">
                {visibleMatches.map((member) => (
                  <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0"><p className="truncate">{member.full_name}</p><p className="text-xs text-gray-500">{member.subscription?.plan?.name || t('No plan')} · {t(STANDING_STYLES[member.standing]?.[0] || member.standing)}</p></div>
                    {insideIds.has(member.user_id)
                      ? <Button size="sm" variant="outline" onClick={() => act(member.user_id, 'out', member.full_name)}><LogOut className="mr-1 h-3.5 w-3.5" />{t('Check out')}</Button>
                      : <Button size="sm" onClick={() => act(member.user_id, 'in', member.full_name)} className="bg-orange-500 text-black hover:bg-orange-400"><LogIn className="mr-1 h-3.5 w-3.5" />{t('Check in')}</Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="border-white/10 bg-[#151515] p-5">
            <h2 className="font-medium">{t('In the gym now')} <span className="ml-1 text-gray-500">{live?.count ?? '—'}</span></h2>
            {!live ? (
              <div className="mt-3 space-y-4" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="flex items-center justify-between"><div className="w-1/2"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/2" /></div><Skeleton className="h-8 w-14" /></div>)}</div>
            ) : !live.results.length ? <p className="mt-3 text-sm text-gray-400">{t('Nobody is checked in.')}</p> : (
              <ul className="mt-3 max-h-[28rem] divide-y divide-white/5 overflow-y-auto">
                {live.results.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0"><p className="truncate">{record.member.full_name}</p><p className="text-xs text-gray-500">{t('In at {time}', { time: timeOnly(record.check_in_at) })} · {since(record.check_in_at, now)}{record.check_in_method === 'manual' ? ` · ${t('desk')}` : ''}</p></div>
                    <Button size="sm" variant="outline" onClick={() => act(record.member.id, 'out', record.member.full_name)}><LogOut className="mr-1 h-3.5 w-3.5" />{t('Out')}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      {showSettings && <SettingsDialog gymId={gymId} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
