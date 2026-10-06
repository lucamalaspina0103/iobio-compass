// Nucleo delle traduzioni: funzioni pure, senza React e senza storage,
// cosi' si usano anche nei moduli "di logica" (piano, notifiche, idee) e si testano in Node.

import { MESSAGES } from './messages';

export type LangCode = 'it' | 'en' | 'fr' | 'es' | 'de';
export type Dict = Record<string, string>;
export type Params = Record<string, string | number>;

export const LANGUAGES: { code: LangCode; name: string; locale: string }[] = [
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
];

// Lingua di riserva quando manca una frase o la lingua del telefono non e' supportata
export const FALLBACK_LANG: LangCode = 'en';

const CATALOGS: Record<LangCode, Dict> = MESSAGES;

let current: LangCode = FALLBACK_LANG;
const listeners = new Set<() => void>();

export function isLangCode(v: unknown): v is LangCode {
  return typeof v === 'string' && LANGUAGES.some(l => l.code === v);
}

export function getLanguage(): LangCode {
  return current;
}

export function setLanguageValue(code: LangCode) {
  if (code === current) return;
  current = code;
  listeners.forEach(fn => fn());
}

export function subscribeLanguage(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// "it-IT", "fr_CA", "de" ... -> codice supportato oppure null
export function matchLanguage(tag: string | null | undefined): LangCode | null {
  if (!tag) return null;
  const base = String(tag).toLowerCase().replace('_', '-').split('-')[0];
  return isLangCode(base) ? base : null;
}

// Sceglie la prima lingua supportata tra quelle preferite dal dispositivo
export function pickSupportedLanguage(tags: (string | null | undefined)[]): LangCode {
  for (const tag of tags) {
    const m = matchLanguage(tag);
    if (m) return m;
  }
  return FALLBACK_LANG;
}

export function getLocale(lang: LangCode = current): string {
  return LANGUAGES.find(l => l.code === lang)!.locale;
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

function lookup(lang: LangCode, key: string, count?: number): string | undefined {
  const dict = CATALOGS[lang];
  if (count !== undefined) {
    let cat = 'other';
    try {
      cat = new Intl.PluralRules(getLocale(lang)).select(count);
    } catch {
      cat = count === 1 ? 'one' : 'other';
    }
    return dict[`${key}_${cat}`] ?? dict[`${key}_other`] ?? dict[key];
  }
  return dict[key];
}

// t('chiave', { nome: 'Luca' })   -> testo con {nome} sostituito
// t('giorni', { count: 3 })       -> usa giorni_one / giorni_other secondo la lingua
export function translate(lang: LangCode, key: string, params?: Params): string {
  const count = params && typeof params.count === 'number' ? params.count : undefined;
  const text = lookup(lang, key, count) ?? lookup(FALLBACK_LANG, key, count) ?? key;
  return interpolate(text, params);
}

export function t(key: string, params?: Params): string {
  return translate(current, key, params);
}

// Per i controlli di completezza
export function getCatalog(lang: LangCode): Dict {
  return CATALOGS[lang];
}
