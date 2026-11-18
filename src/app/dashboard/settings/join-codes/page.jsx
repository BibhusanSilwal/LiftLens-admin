'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Download, ExternalLink, Copy, Plus, RefreshCw, ShieldOff, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Card, CardContent } from '../../../../components/ui/Card';
import { DateTimeInput, ErrorNote, FormField, inputClass, Modal, SubmitButton } from '../../../../components/Modal';
import { Skeleton } from '../../../../components/Skeleton';
import { useConfirm } from '../../../../components/ConfirmProvider';
import { useT } from '../../../../components/I18nProvider';
import { createJoinCode, listJoinCodes, regenerateJoinCode, revokeJoinCode } from '../../../lib/joins-api';
import { gymFetch } from '../../../lib/gym-api';
import { useCapabilities } from '../../CapabilityProvider';

// Renders the QR for a join URL as an image (generated in the browser).
function QrPreview({ value, inactive }) {
  const t = useT();
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: 240 }).then((url) => { if (!cancelled) setSrc(url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [value]);
  return (
    <div className={`h-28 w-28 shrink-0 rounded-lg bg-white p-1.5 ${inactive ? 'opacity-30' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={t('Join QR code')} className="h-full w-full" /> : <div className="skeleton h-full w-full rounded !bg-gray-200" />}
    </div>
  );
}

function getGymId(capabilities) {
  return capabilities.activeGym?.id || capabilities.gym_id || capabilities.gyms?.[0]?.gym_id || null;
}

function CreateDialog({ gymId, onClose, onCreated }) {
  const t = useT();
  const [plans, setPlans] = useState([]);
  const [values, setValues] = useState({ default_plan_id: '', expires_at: '', max_uses: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { gymFetch(gymId, '/plans').then(setPlans).catch(() => {}); }, [gymId]);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await createJoinCode(gymId, {
        default_plan_id: values.default_plan_id ? Number(values.default_plan_id) : null,
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        max_uses: values.max_uses ? Number(values.max_uses) : null,
      });
      toast.success(t('Join QR created'));
      onCreated();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <Modal title={t('Generate join QR')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label={t('Default plan (optional)')}><select className={inputClass} value={values.default_plan_id} onChange={set('default_plan_id')}><option value="">{t('None')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></FormField>
        <FormField label={t('Expires at (optional)')}><DateTimeInput value={values.expires_at} onChange={set('expires_at')} /></FormField>
        <FormField label={t('Maximum uses (optional)')}><input type="number" min="1" className={inputClass} value={values.max_uses} onChange={set('max_uses')} /></FormField>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button><SubmitButton busy={busy}>{t('Create')}</SubmitButton></div>
      </form>
    </Modal>
  );
}

export default function JoinCodesPage() {
  const capabilities = useCapabilities();
  const t = useT();
  const confirm = useConfirm();
  const gymId = useMemo(() => getGymId(capabilities), [capabilities]);
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [posterQr, setPosterQr] = useState('');
  const [version, setVersion] = useState(0);
  const load = () => { setCodes(null); setVersion((v) => v + 1); };

  useEffect(() => {
    if (!gymId) return undefined;
    let cancelled = false;
    listJoinCodes(gymId).then((data) => { if (!cancelled) { setCodes(data.results); setError(''); } }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [gymId, version]);

  const revoke = async (code) => {
    const ok = await confirm({
      title: t('Revoke join code {code}?', { code: code.short_code || '' }),
      message: t('Printed posters with this QR stop working straight away. You can regenerate a new code later.'),
      confirmLabel: t('Revoke'),
    });
    if (!ok) return;
    try { await revokeJoinCode(gymId, code.id); toast.success(t('Join code revoked')); load(); } catch (e) { toast.error(e.message); }
  };
  const regenerate = async (code) => {
    try { await regenerateJoinCode(gymId, code.id); toast.success(t('New join code created')); load(); } catch (e) { toast.error(e.message); }
  };
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code.url); toast.success(t('Link copied')); } catch { toast.error(t("Couldn't copy the link")); }
  };
  const downloadPng = async (code) => { const dataUrl = await QRCode.toDataURL(code.url, { margin: 2, width: 800 }); const anchor = document.createElement('a'); anchor.href = dataUrl; anchor.download = `liftlens-join-${code.short_code || code.id}.png`; anchor.click(); };
  const downloadSvg = async (code) => { const svg = await QRCode.toString(code.url, { type: 'svg', margin: 2 }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); anchor.download = `liftlens-join-${code.short_code || code.id}.svg`; anchor.click(); };
  const printPoster = async (code) => { setSelected(code); setPosterQr(await QRCode.toDataURL(code.url, { margin: 2, width: 800 })); setTimeout(() => window.print(), 0); };

  if (!gymId && !capabilities.loading) return <p className="text-sm text-red-300">{t('No active gym is available for this account.')}</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-orange-400">{t('Setup')}</p><h1 className="mt-1 text-3xl font-semibold">{t('Join QR codes')}</h1><p className="mt-2 text-gray-400">{t('Create and manage QR codes that let members join this gym.')}</p></div>
        <Button onClick={() => setShowCreate(true)} className="bg-orange-500 text-black hover:bg-orange-400"><Plus className="mr-2 h-4 w-4" />{t('Generate QR')}</Button>
      </div>
      {error && <p className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
      <Card className="border-white/10 bg-[#151515]">
        <CardContent className="p-0">
          {!codes ? (
            <div className="divide-y divide-white/5" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="flex gap-5 p-5"><Skeleton className="h-28 w-28 shrink-0" /><div className="flex-1"><Skeleton className="h-7 w-36" /><Skeleton className="mt-3 h-3 w-2/3" /><Skeleton className="mt-4 h-3 w-1/2" /></div></div>)}</div>
          ) : !codes.length ? <p className="p-6 text-sm text-gray-400">{t('No join codes yet.')}</p> : (
            <div className="divide-y divide-white/5">
              {codes.map((code) => (
                <div key={code.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-4 sm:gap-5">
                    <QrPreview value={code.url} inactive={!code.is_active} />
                    <div className="min-w-0">
                      {code.short_code && <p className="font-mono text-2xl font-bold tracking-[0.25em] text-orange-300" title={t('Members type this in the app (Gyms → Enter gym code)')}>{code.short_code}</p>}
                      {!code.is_active && <p className="text-xs font-medium uppercase text-red-300">{t('Revoked')}</p>}
                      <a href={code.url} target="_blank" rel="noreferrer" className="mt-1 block max-w-xl break-all text-xs text-gray-500 hover:text-orange-400">{code.url}</a>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400"><span>{t('{count} scans', { count: code.stats.scans })}</span><span>{t('{count} installs', { count: code.stats.installs })}</span><span>{t('{count} joins', { count: code.stats.joins })}</span><span>{t('{count} uses', { count: `${code.uses}${code.max_uses === null ? '' : `/${code.max_uses}`}` })}</span></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copy(code)}><Copy className="mr-1 h-3 w-3" />{t('Copy')}</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPng(code)}><Download className="mr-1 h-3 w-3" />PNG</Button>
                    <Button size="sm" variant="outline" onClick={() => downloadSvg(code)}>SVG</Button>
                    <Button size="sm" variant="outline" onClick={() => printPoster(code)}><Printer className="mr-1 h-3 w-3" />{t('Poster PDF')}</Button>
                    {code.is_active
                      ? <Button size="sm" variant="outline" onClick={() => revoke(code)}><ShieldOff className="mr-1 h-3 w-3" />{t('Revoke')}</Button>
                      : <Button size="sm" variant="outline" onClick={() => regenerate(code)}><RefreshCw className="mr-1 h-3 w-3" />{t('Regenerate')}</Button>}
                    <a className="inline-flex h-9 items-center rounded-md border border-white/10 px-3 text-sm hover:bg-white/5" href={`/join/${code.token}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3 w-3" />{t('Open')}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* The printed poster is for members, so it stays in English like the app's store listing. */}
      {selected && <div className="print-poster fixed inset-0 z-50 hidden items-center justify-center bg-white text-black"><div className="text-center"><h1 className="text-4xl font-bold">Join our gym</h1><p className="mt-2 text-lg">Scan with your phone camera to join in the LiftLens app</p>{posterQr && <img src={posterQr} alt="Join QR code" className="mx-auto mt-8 h-80 w-80" />}{selected.short_code && <><p className="mt-6 text-lg">Already have the app? Gyms → Enter gym code:</p><p className="mt-2 font-mono text-6xl font-bold tracking-[0.3em]">{selected.short_code}</p></>}<p className="mt-6 text-xs text-gray-500">{selected.url}</p></div></div>}
      {showCreate && <CreateDialog gymId={gymId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}
