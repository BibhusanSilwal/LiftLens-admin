'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarDays, HeartPulse, Mail, Phone, Target, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../../../components/ui/Card';
import { Skeleton, SkeletonLines } from '../../../../components/Skeleton';
import { useT } from '../../../../components/I18nProvider';
import { apiFetch } from '../../../lib/api';
import { useGymId } from '../../../lib/gym-api';
import { MembershipPanel } from './MembershipPanel';
import { RecentVisits } from './RecentVisits';

const MISSING_LABELS = { phone: 'phone number', emergency_contact: 'emergency contact', date_of_birth: 'date of birth' };
const HEALTH_LABELS = { health_complications: 'Medical conditions', blood_group: 'Blood group', allergies: 'Allergies', injuries: 'Injuries' };

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

function humanize(value) {
  return String(value).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div><Skeleton className="h-4 w-20" /><Skeleton className="mt-5 h-4 w-28" /><Skeleton className="mt-2 h-8 w-64" /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#151515] p-6 lg:col-span-2"><Skeleton className="h-4 w-32" /><SkeletonLines lines={4} className="mt-5" /></div>
        <div className="rounded-xl border border-white/10 bg-[#151515] p-6"><Skeleton className="h-4 w-36" /><SkeletonLines lines={2} className="mt-5" /></div>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#151515] p-6"><Skeleton className="h-5 w-40" /><Skeleton className="mt-5 h-24 w-full" /></div>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams();
  const action = useSearchParams().get('action');
  const gymId = useGymId();
  const t = useT();
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) apiFetch(`/api/users/gym/members/${id}`).then(setMember).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!member) return <ProfileSkeleton />;

  const health = member.health_info || {};
  const healthEntries = Object.entries(HEALTH_LABELS).filter(([key]) => health[key]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/members" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-orange-400"><ArrowLeft className="h-4 w-4" />{t('Members')}</Link>
        <p className="mt-4 text-sm text-orange-400">{t('Member profile')}</p>
        <h1 className="mt-1 break-words text-3xl font-semibold">{member.full_name}</h1>
        <p className="mt-2 text-xs text-gray-500">{t("Viewing this profile is recorded in the gym's access log.")}</p>
      </div>

      {!member.profile_complete && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-950/30 p-4 text-sm text-orange-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
          <p>{t('Profile incomplete: missing {fields}. Ask the member to add it in the app (Profile → Profile details).', { fields: member.missing_fields.map((field) => t(MISSING_LABELS[field] || field)).join(', ') })}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-[#151515] lg:col-span-2">
          <CardHeader><h2 className="font-medium">{t('Contact details')}</h2></CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <p className="break-all"><Mail className="mr-2 inline h-4 w-4 text-orange-400" />{member.email || '—'}</p>
            <p><Phone className="mr-2 inline h-4 w-4 text-orange-400" />{member.phone || '—'}</p>
            <p><UserRound className="mr-2 inline h-4 w-4 text-orange-400" />{member.gender === 'M' ? t('Male') : member.gender === 'F' ? t('Female') : '—'}{member.age ? ` · ${t('{age} yrs', { age: member.age })}` : ''}</p>
            <p><CalendarDays className="mr-2 inline h-4 w-4 text-orange-400" />{t('Born {date}', { date: formatDate(member.date_of_birth) })}</p>
            <p className="text-gray-400">{t('Member since {date}', { date: formatDate(member.joined_at) })}</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/50 bg-orange-950/20">
          <CardHeader><h2 className="flex items-center gap-2 font-medium text-orange-200"><AlertTriangle className="h-5 w-5" />{t('Emergency contacts')}</h2></CardHeader>
          <CardContent className="space-y-3 text-sm text-orange-100">
            {member.emergency_contacts?.length ? member.emergency_contacts.map((contact) => (
              <div key={contact.id}>
                <p className="font-medium">{contact.name}{contact.is_primary && <span className="ml-2 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] uppercase">{t('Primary')}</span>}</p>
                <a href={`tel:${contact.phone}`} className="text-orange-300 hover:underline">{contact.phone}</a>
                {contact.relationship && <span className="text-orange-200/70"> · {contact.relationship}</span>}
              </div>
            )) : <p>{t('No emergency contacts on file.')}</p>}
          </CardContent>
        </Card>
      </div>

      <MembershipPanel gymId={gymId} userId={id} initialDialog={['sell', 'pay'].includes(action) ? action : null} />

      <RecentVisits gymId={gymId} userId={id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/10 bg-[#151515]">
          <CardHeader><h2 className="flex items-center gap-2 font-medium"><HeartPulse className="h-5 w-5 text-red-400" />{t('Health information')}</h2></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {healthEntries.length ? healthEntries.map(([key, label]) => (
              <div key={key}><p className="text-xs uppercase text-gray-500">{t(label)}</p><p className="whitespace-pre-line text-gray-200">{health[key]}</p></div>
            )) : <p className="text-gray-400">{t('No health information provided.')}</p>}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#151515]">
          <CardHeader><h2 className="flex items-center gap-2 font-medium"><Target className="h-5 w-5 text-orange-400" />{t('Goals')}</h2></CardHeader>
          <CardContent className="text-sm">
            {member.goals?.length ? (
              <div className="flex flex-wrap gap-2">{member.goals.map((goal) => <span key={goal} className="rounded-full bg-white/5 px-3 py-1 text-gray-200">{t(humanize(goal))}</span>)}</div>
            ) : <p className="text-gray-400">{t('No goals set.')}</p>}
            {member.fitness_level && <p className="mt-3 text-gray-400">{t('Fitness level: {level}', { level: t(humanize(member.fitness_level)) })}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
