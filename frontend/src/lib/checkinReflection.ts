// Riflessione giornaliera generata dal check-in (energia/umore/sonno).
// Diversa dai consigli degli esperti (che arrivano ogni 7 giorni, quando c'e'
// abbastanza tempo/dati per essere significativi): qui non diamo una risposta,
// ma una domanda breve che aiuta l'utente a fermarsi un attimo sul "perché"
// del proprio risultato di oggi.

import { t } from '../i18n/core';

export interface CheckinData {
  energia: number;
  umore: number;
  sonno: number;
}

// Quante domande esistono per ogni fascia (i testi sono nei cataloghi: reflect.<dimensione>.<fascia>.<n>)
const PROMPT_COUNT: { [key in keyof CheckinData]: { low: number; mid: number; high: number } } = {
  energia: { low: 2, mid: 1, high: 1 },
  umore: { low: 2, mid: 1, high: 1 },
  sonno: { low: 2, mid: 1, high: 1 },
};

const bucket = (value: number): 'low' | 'mid' | 'high' => {
  if (value <= 2) return 'low';
  if (value >= 4) return 'high';
  return 'mid';
};

// Sceglie la dimensione (energia/umore/sonno) con il punteggio più basso di oggi -
// e' quella su cui una riflessione ha più senso - e restituisce una domanda per
// quella dimensione. In caso di parità: energia, poi umore, poi sonno.
export const getDailyReflection = (data: CheckinData): { area: keyof CheckinData; questionKey: string; question: string } => {
  const order: (keyof CheckinData)[] = ['energia', 'umore', 'sonno'];
  const lowest = order.reduce((min, key) => (data[key] < data[min] ? key : min), order[0]);

  const bucketKey = bucket(data[lowest]);
  const count = PROMPT_COUNT[lowest][bucketKey];
  // Scelta deterministica ma variabile in base al giorno, cosi' non e' sempre la stessa domanda
  const dayIndex = new Date().getDate() % count;
  const questionKey = `reflect.${lowest}.${bucketKey}.${dayIndex}`;

  // Si salva la chiave: se cambi lingua la domanda di oggi si traduce con te
  return { area: lowest, questionKey, question: t(questionKey) };
};
