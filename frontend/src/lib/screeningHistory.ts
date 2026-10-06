// Storico degli screening, usato dalla vista "Il tuo percorso" per mostrare
// l'andamento dell'Indice IOBIO (e delle singole aree) nel tempo.
//
// Modalita' Guest: lo storico si accumula in locale (AsyncStorage), visibile solo
// su questo dispositivo. Modalita' registrata: lo storico vive sul backend
// (ogni screening inviato viene gia' salvato li'), letto tramite /api/screening/history.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n/core';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const SCREENING_HISTORY_KEY = 'screening_history';

export interface ScreeningHistoryEntry {
  id: string;
  indice_iobio: number;
  area_scores: { [key: string]: number };
  weak_areas: string[];
  date: string;
  kind?: 'full' | 'quick' | 'review';
}

// Aggiunge un nuovo screening allo storico locale (chiamato ogni volta che
// l'utente completa il questionario, sia Guest sia registrato - non fa mai male
// tenerlo anche in locale, anche se per i registrati la fonte "vera" e' il server).
export const appendLocalScreeningHistory = async (entry: ScreeningHistoryEntry): Promise<void> => {
  try {
    const existing = await loadLocalScreeningHistory();
    // Evita doppioni se lo stesso screening viene salvato due volte (es. retry di rete)
    const withoutDup = existing.filter(e => e.id !== entry.id);
    const updated = [...withoutDup, entry].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    await AsyncStorage.setItem(SCREENING_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error appending local screening history:', error);
  }
};

export const loadLocalScreeningHistory = async (): Promise<ScreeningHistoryEntry[]> => {
  try {
    const saved = await AsyncStorage.getItem(SCREENING_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading local screening history:', error);
    return [];
  }
};

export const fetchBackendScreeningHistory = async (userId: string): Promise<ScreeningHistoryEntry[]> => {
  const response = await fetch(`${API_URL}/api/screening/history?user_id=${userId}`);
  if (!response.ok) throw new Error(t('sp.errGeneric'));
  return response.json();
};

// L'ultimo screening PRIMA di quello appena fatto, per mostrare il confronto ("rispetto
// all'ultimo controllo"). Prima lo storico del dispositivo; se e' vuoto e c'e' un account,
// quello sul server. null se e' il primo screening.
export const loadPreviousScreening = async (
  currentId: string,
  isGuest: boolean,
  userId?: string | null
): Promise<ScreeningHistoryEntry | null> => {
  let entries = await loadLocalScreeningHistory();
  if (entries.filter(e => e.id !== currentId).length === 0 && !isGuest && userId) {
    try {
      entries = await fetchBackendScreeningHistory(userId);
    } catch (error) {
      console.error('Error loading previous screening:', error);
    }
  }
  const toTime = (d: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(d) ? d : d + 'Z').getTime();
  const others = entries.filter(e => e.id !== currentId).sort((a, b) => toTime(b.date) - toTime(a.date));
  return others[0] || null;
};
