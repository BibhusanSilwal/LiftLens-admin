'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { Megaphone, QrCode, Search, ShoppingCart, User, UserPlus } from 'lucide-react';
import { useCapabilities } from '../app/dashboard/CapabilityProvider';
import { gymFetch, useGymId } from '../app/lib/gym-api';
import { navSections } from './Sidebar';
import { useT } from './I18nProvider';
import { Kbd, useModKey } from './Kbd';

export const OPEN_COMMAND_MENU = 'liftlens:open-command-menu';

/** Open the command menu from anywhere (e.g. the header search button). */
export function openCommandMenu() {
  window.dispatchEvent(new Event(OPEN_COMMAND_MENU));
}

// "G then T" style jumps. Keep this list short and in sync with SHORTCUTS below.
const GO_TO = {
  t: { href: '/dashboard/today', capability: 'today.view' },
  m: { href: '/dashboard/members', capability: 'members.view' },
  p: { href: '/dashboard/pos', capability: 'pos.sell' },
  c: { href: '/dashboard/check-in', capability: 'attendance.manage' },
};

const ACTIONS = [
  { label: 'New sale', href: '/dashboard/pos', icon: ShoppingCart, capability: 'pos.sell', keys: ['G', 'P'] },
  { label: 'Check in a member', href: '/dashboard/check-in', icon: QrCode, capability: 'attendance.manage', keys: ['G', 'C'] },
  { label: 'Add member', href: '/dashboard/members?add=1', icon: UserPlus, capability: 'members.manage' },
  { label: 'Post a notice', href: '/dashboard/notices', icon: Megaphone, capability: 'notices.manage' },
];

const SHORTCUT_KEYS = { '/dashboard/today': ['G', 'T'], '/dashboard/members': ['G', 'M'] };

function isTyping(target) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function Keys({ keys }) {
  return <span className="ml-auto flex gap-1">{keys.map((key) => <Kbd key={key}>{key}</Kbd>)}</span>;
}

const itemClass = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 data-[selected=true]:bg-orange-500/15 data-[selected=true]:text-white';

/**
 * Ctrl/⌘+K palette: jump to a page, find a member, or start a common action. Also owns the
 * global shortcuts: "/" focuses the page's search box (or opens this menu), "G then T/M/P/C"
 * jumps to Today / Members / POS / Check-in. Single-key shortcuts never fire while typing.
 */
export function CommandMenu() {
  const router = useRouter();
  const t = useT();
  const mod = useModKey();
  const { can, role, loading } = useCapabilities();
  const gymId = useGymId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState([]);
  const pendingG = useRef(0);

  const platform = role === 'platform_admin';
  const gymSide = !loading && role && !platform;
  const canSearchMembers = gymSide && can('members.view');

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        const search = document.querySelector('[data-page-search]');
        if (search) search.focus(); else setOpen(true);
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'g') { pendingG.current = Date.now(); return; }
      if (Date.now() - pendingG.current < 1000 && GO_TO[key]) {
        pendingG.current = 0;
        const target = GO_TO[key];
        if (gymSide && can(target.capability)) router.push(target.href);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_COMMAND_MENU, show);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_COMMAND_MENU, show); };
  }, [can, gymSide, router]);

  const term = query.trim();
  const searching = canSearchMembers && open && term.length >= 2;
  useEffect(() => {
    if (!searching) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      gymFetch(gymId, `/members?search=${encodeURIComponent(term)}&page_size=8`)
        .then((data) => { if (!cancelled) setMembers(data.results || []); })
        .catch(() => { if (!cancelled) setMembers([]); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [gymId, searching, term]);

  const go = (href) => { setOpen(false); setQuery(''); router.push(href); };
  const onOpenChange = (value) => { setOpen(value); if (!value) setQuery(''); };

  if (loading || !role) return null;
  const sections = navSections(platform, can);
  const actions = gymSide ? ACTIONS.filter((action) => can(action.capability)) : [];
  const shownMembers = searching ? members : [];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={t('Command menu')}
      // Members come from the server already matched, so don't let cmdk filter them away.
      filter={(value, search, keywords) => {
        if (value.startsWith('member:')) return 1;
        const haystack = `${value} ${(keywords || []).join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase()) ? 1 : 0;
      }}
      overlayClassName="fixed inset-0 z-50 bg-black/60"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-[#151515] shadow-2xl"
    >
      {/* Radix needs a title (and description) inside the dialog for screen readers; keep them visually hidden. */}
      <Dialog.Title className="sr-only">{t('Command menu')}</Dialog.Title>
      <Dialog.Description className="sr-only">{t('Search pages, actions or members')}</Dialog.Description>
      <div className="flex items-center gap-2 border-b border-white/10 px-4">
        <Search className="h-4 w-4 shrink-0 text-gray-500" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={canSearchMembers ? t('Search pages, actions or members…') : t('Search pages…')}
          className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-gray-500">{t('No results.')}</Command.Empty>
        {shownMembers.length > 0 && (
          <Command.Group heading={t('Members')} className="px-1 pb-2 text-xs text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {shownMembers.map((member) => (
              <Command.Item key={member.user_id} value={`member:${member.user_id}`} onSelect={() => go(`/dashboard/members/${member.user_id}`)} className={itemClass}>
                <User className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="min-w-0 truncate">{member.full_name}<span className="ml-2 text-xs text-gray-500">{member.email}{member.phone ? ` · ${member.phone}` : ''}</span></span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {actions.length > 0 && (
          <Command.Group heading={t('Actions')} className="px-1 pb-2 text-xs text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {actions.map(({ label, href, icon: Icon, keys }) => (
              <Command.Item key={label} value={t(label)} keywords={[label]} onSelect={() => go(href)} className={itemClass}>
                <Icon className="h-4 w-4 shrink-0 text-orange-400" />{t(label)}{keys && <Keys keys={keys} />}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {sections.map((section) => (
          <Command.Group key={section.title} heading={t(section.title)} className="px-1 pb-2 text-xs text-gray-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {section.items.map(({ href, label, icon: Icon }) => (
              <Command.Item key={href} value={`${t(label)} ${href}`} keywords={[label]} onSelect={() => go(href)} className={itemClass}>
                <Icon className="h-4 w-4 shrink-0 text-gray-500" />{t(label)}{gymSide && SHORTCUT_KEYS[href] && <Keys keys={SHORTCUT_KEYS[href]} />}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 px-4 py-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t('to move')}</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd>{t('to open')}</span>
        <span className="flex items-center gap-1"><Kbd>{mod}</Kbd><Kbd>K</Kbd>{t('to toggle')}</span>
        <span className="flex items-center gap-1"><Kbd>/</Kbd>{t('to search the page')}</span>
      </div>
    </Command.Dialog>
  );
}
