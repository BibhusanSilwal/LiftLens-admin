'use client';

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import ne from '../app/lib/i18n/ne';

/**
 * Lightweight i18n for the gym-operations side of the dashboard.
 * English text is the key: t('Members') → 'सदस्यहरू' in Nepali, or the English when no translation exists.
 * Placeholders use {name}: t('Sent to {count} member(s)', { count: 3 }).
 * Pages outside <I18nScope enabled> (platform admin, login, public pages) always render English.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ne', label: 'नेपाली', short: 'ने' },
];
const DICTIONARIES = { ne };
const STORAGE_KEY = 'liftlens.lang';
const listeners = new Set();
let memoryLanguage = null;

function readLanguage() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && (value === 'en' || DICTIONARIES[value]) ? value : 'en';
  } catch {
    return 'en';
  }
}

export function setLanguage(code) {
  try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode: still switch for this tab */ }
  memoryLanguage = code;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  const onStorage = (event) => { if (event.key === STORAGE_KEY) { memoryLanguage = null; listener(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
};
const getSnapshot = () => memoryLanguage ?? readLanguage();
const getServerSnapshot = () => 'en';

export function useLanguage() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const ScopeContext = createContext(false);

/** Turns translation on for everything inside (the gym dashboard). */
export function I18nScope({ enabled, children }) {
  const language = useLanguage();
  const active = enabled ? language : 'en';
  useEffect(() => {
    document.documentElement.lang = active;
  }, [active]);
  return <ScopeContext.Provider value={enabled}>{children}</ScopeContext.Provider>;
}

function interpolate(text, vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (match, key) => (vars[key] ?? match)) : text;
}

export function translate(language, text, vars) {
  const dictionary = DICTIONARIES[language];
  return interpolate((dictionary && dictionary[text]) || text, vars);
}

/** Returns t(text, vars). */
export function useT() {
  const enabled = useContext(ScopeContext);
  const language = useLanguage();
  const active = enabled ? language : 'en';
  return useCallback((text, vars) => translate(active, text, vars), [active]);
}

/** EN | ने toggle for the header. */
export function LanguageSwitcher({ className = '' }) {
  const language = useLanguage();
  return (
    <div role="group" aria-label="Language / भाषा" className={`flex rounded-full border border-white/10 p-0.5 text-xs ${className}`}>
      {LANGUAGES.map(({ code, label, short }) => (
        <button
          key={code}
          type="button"
          title={label}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className={`rounded-full px-2.5 py-1 transition ${language === code ? 'bg-orange-500 font-semibold text-black' : 'text-gray-400 hover:text-white'}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
