// Quando proporre il controllo rapido (7 domande, 2 minuti). Ritmo pensato per restare
// leggero: circa ogni 15 giorni dall'ultimo screening (completo o rapido) e solo mentre il
// ciclo e' in corso. A fine ciclo (oltre 30 giorni) l'invito e' un altro: rifare lo
// screening completo per aprire il ciclo successivo (vedi cycleNotices.ts).

import { loadLocalScreeningHistory, fetchBackendScreeningHistory } from './screeningHistory';

export const CHECK_INTERVAL_DAYS = 15;

// Il server manda date senza fuso ("2026-10-05T09:00:00.123"): sono UTC.
export const parseDate = (value: string): number => {
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : value + 'Z').getTime();
};

// Data (ISO) dell'ultimo screening, completo o rapido; null se non ce n'e' nessuno.
export const getLastScreeningISO = async (
  isGuest: boolean,
  userId?: string | null
): Promise<string | null> => {
  let dates: string[] = (await loadLocalScreeningHistory()).map(e => e.date);
  if (dates.length === 0 && !isGuest && userId) {
    try {
      dates = (await fetchBackendScreeningHistory(userId)).map(e => e.date);
    } catch (error) {
      console.error('Error reading screening history for check due:', error);
    }
  }
  const times = dates.map(parseDate).filter(t => !isNaN(t));
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
};

export const daysSince = (iso: string | null): number | null =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))) : null;

// Giorni passati dall'ultimo screening (completo o rapido); null se non ce n'e' nessuno.
export const getDaysSinceLastScreening = async (
  isGuest: boolean,
  userId?: string | null
): Promise<number | null> => daysSince(await getLastScreeningISO(isGuest, userId));

export const isCheckDue = (daysSince: number | null, elapsedDays: number | null): boolean =>
  daysSince !== null &&
  daysSince >= CHECK_INTERVAL_DAYS &&
  (elapsedDays === null || elapsedDays <= 30);
