import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LangCode,
  Params,
  FALLBACK_LANG,
  getLanguage,
  getLocale,
  isLangCode,
  pickSupportedLanguage,
  setLanguageValue,
  subscribeLanguage,
  translate,
} from './core';

export { LANGUAGES, t, getLanguage, getLocale } from './core';
export type { LangCode } from './core';

const LANG_KEY = 'app_language';
const CHOSEN_KEY = 'app_language_chosen';

// Lingue preferite dal dispositivo, dalla piu' gradita
export function deviceLanguageTags(): string[] {
  try {
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav) return [...(nav.languages || []), nav.language].filter(Boolean);
    }
    return [Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    return [];
  }
}

export function detectDeviceLanguage(): LangCode {
  return pickSupportedLanguage(deviceLanguageTags());
}

type Ctx = {
  language: LangCode;
  ready: boolean;
  // false finche' la persona non ha scelto la lingua alla prima apertura
  languageChosen: boolean;
  locale: string;
  setLanguage: (code: LangCode) => Promise<void>;
  t: (key: string, params?: Params) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<LangCode>(getLanguage());
  const [ready, setReady] = useState(false);
  const [languageChosen, setLanguageChosen] = useState(false);

  // la lingua puo' cambiare anche fuori da React: ci si tiene allineati
  useEffect(() => subscribeLanguage(() => setLang(getLanguage())), []);

  useEffect(() => {
    (async () => {
      try {
        const [saved, chosen, onboarded, user] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(CHOSEN_KEY),
          AsyncStorage.getItem('hasCompletedOnboarding'),
          AsyncStorage.getItem('user'),
        ]);
        if (isLangCode(saved)) {
          setLanguageValue(saved);
          setLanguageChosen(chosen === '1');
        } else if (onboarded === 'true' || user) {
          // chi usava gia' l'app la usava in italiano: niente schermata di scelta
          setLanguageValue('it');
          setLanguageChosen(true);
          await AsyncStorage.multiSet([[LANG_KEY, 'it'], [CHOSEN_KEY, '1']]);
        } else {
          // prima apertura: si propone la lingua del telefono
          setLanguageValue(detectDeviceLanguage());
        }
      } catch {
        setLanguageValue(FALLBACK_LANG);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // lingua della pagina per il sito (lettori di schermo, motori di ricerca)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback(async (code: LangCode) => {
    setLanguageValue(code);
    setLanguageChosen(true);
    try {
      await AsyncStorage.multiSet([[LANG_KEY, code], [CHOSEN_KEY, '1']]);
    } catch {
      // se non si riesce a salvare, la scelta vale comunque fino alla chiusura
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      language,
      ready,
      languageChosen,
      locale: getLocale(language),
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, ready, languageChosen, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n va usato dentro I18nProvider');
  return ctx;
}
