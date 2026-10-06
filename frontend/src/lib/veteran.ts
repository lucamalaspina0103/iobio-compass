// "Veterano": chi ha un account ed e' nell'app da almeno 90 giorni dal primo screening.
// Per loro, a fine ciclo, al posto dello screening completo c'e' la "revisione del mese"
// (domande base + approfondimento a rotazione + riflessioni + aree scelte da loro) e il
// piano passa ai task di livello 2. Gli ospiti non arrivano mai qui: dopo il primo mese
// serve un account.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../contexts/AppContext';
import { loadLocalScreeningHistory, fetchBackendScreeningHistory, ScreeningHistoryEntry } from './screeningHistory';
import { parseDate } from './checkDue';

export const VETERAN_DAYS = 90;
const FIRST_SCREENING_CACHE_KEY = 'first_screening_cache';

const DAY_MS = 24 * 60 * 60 * 1000;

// Storico completo di un account registrato (server) unito a quello del dispositivo
export const loadFullHistory = async (userId: string): Promise<ScreeningHistoryEntry[]> => {
  const local = await loadLocalScreeningHistory();
  let remote: ScreeningHistoryEntry[] = [];
  try {
    remote = await fetchBackendScreeningHistory(userId);
  } catch (error) {
    console.error('Error loading full screening history:', error);
  }
  const byId = new Map<string, ScreeningHistoryEntry>();
  [...local, ...remote].forEach(e => byId.set(e.id, e));
  return Array.from(byId.values()).sort((a, b) => parseDate(a.date) - parseDate(b.date));
};

// Data del primo screening. Non cambia mai, quindi una volta trovata la teniamo in memoria.
export const getFirstScreeningISO = async (userId: string): Promise<string | null> => {
  try {
    const cached = await AsyncStorage.getItem(FIRST_SCREENING_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.userId === userId && parsed.iso) return parsed.iso;
    }
  } catch (error) {
    console.error('Error reading first screening cache:', error);
  }
  const history = await loadFullHistory(userId);
  if (history.length === 0) return null;
  const iso = new Date(parseDate(history[0].date)).toISOString();
  try {
    await AsyncStorage.setItem(FIRST_SCREENING_CACHE_KEY, JSON.stringify({ userId, iso }));
  } catch (error) {
    console.error('Error saving first screening cache:', error);
  }
  return iso;
};

export const isVeteranSince = (firstISO: string | null, now: Date = new Date()): boolean =>
  !!firstISO && Math.floor((now.getTime() - new Date(firstISO).getTime()) / DAY_MS) >= VETERAN_DAYS;

// true per chi ha un account ed e' nell'app da almeno 90 giorni
export const useIsVeteran = (): boolean => {
  const { user, isGuest, isBootstrapped } = useAppContext();
  const [veteran, setVeteran] = useState(false);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (isGuest || !user?.id) {
      setVeteran(false);
      return;
    }
    let cancelled = false;
    getFirstScreeningISO(user.id).then(iso => {
      if (!cancelled) setVeteran(isVeteranSince(iso));
    });
    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, isGuest, user?.id]);

  return veteran;
};
