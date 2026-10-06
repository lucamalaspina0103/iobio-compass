// I messaggi di errore del server arrivano in italiano. Qui si riconoscono per testo esatto
// (stesso metodo dei compiti) e si mostrano nella lingua scelta; se non si riconoscono, si
// mostra un messaggio generico tradotto invece di un testo in una lingua che la persona non legge.

import { getCatalog, t } from '../i18n/core';

let reverse: Map<string, string> | null = null;

const buildReverse = (): Map<string, string> => {
  const map = new Map<string, string>();
  const it = getCatalog('it');
  for (const key of Object.keys(it)) {
    if (key.startsWith('srv.')) map.set(it[key].trim(), key);
  }
  // Anche questo errore arriva dal server con lo stesso testo che l'app gia' conosce
  map.set(it['auth.errPrivacy'].trim(), 'auth.errPrivacy');
  return map;
};

export const serverMessage = (detail: unknown, fallbackKey: string = 'sp.errGeneric'): string => {
  if (typeof detail !== 'string') return t(fallbackKey);
  if (!reverse) reverse = buildReverse();
  const key = reverse.get(detail.trim());
  return key ? t(key) : t(fallbackKey);
};
