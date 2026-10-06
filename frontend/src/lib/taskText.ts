// Mostra un compito del piano nella lingua scelta.
// I compiti salvati (sul telefono o sul server) hanno il testo italiano originale: lo si
// riconosce per testo esatto e si sostituisce con la traduzione. Se il testo non e' uno dei
// compiti noti (es. scritto altrove) si mostra cosi' com'e'. Il riconoscimento del tipo di
// compito (scrivere, leggere...) resta sul testo italiano originale: non va tradotto.

import { getCatalog, t } from '../i18n/core';

let reverse: Map<string, string> | null = null;

const buildReverse = (): Map<string, string> => {
  const map = new Map<string, string>();
  const it = getCatalog('it');
  for (const key of Object.keys(it)) {
    if (key.startsWith('task.') || key.startsWith('task2.') || key.startsWith('taskg.')) {
      map.set(it[key].trim(), key);
    }
  }
  return map;
};

export const taskKeyFor = (text: string): string | null => {
  if (!reverse) reverse = buildReverse();
  return reverse.get((text || '').trim()) ?? null;
};

export const taskText = (text: string): string => {
  const key = taskKeyFor(text);
  return key ? t(key) : text;
};
