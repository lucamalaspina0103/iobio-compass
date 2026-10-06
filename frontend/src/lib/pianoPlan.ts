// Logica condivisa del Piano 30 giorni, usata sia da app/piano/index.tsx (vista
// completa) sia da app/(tabs)/oggi.tsx (vista sintetica del giorno corrente) -
// prima erano due copie indipendenti che potevano disallinearsi tra loro.
//
// Modalita' Guest: piano generato e salvato SOLO in locale (AsyncStorage), cosi'
// resta privato al dispositivo e non si mescola con quello di altri Guest.
// Modalita' registrata: piano letto/scritto sul backend, condiviso tra dispositivi.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { planDayOn } from './planDay';
import { t } from '../i18n/core';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const PIANO_TASKS_KEY = 'piano_tasks_v2';
export const PIANO_START_DATE_KEY = 'piano_start_date';

export interface PianoTask {
  id: string;
  day: number;
  task: string;
  area: string;
  completed: boolean;
  optional: boolean; // true = "extra" task oltre il minimo richiesto per il giorno
}

export interface ScreeningResultForPlan {
  weak_areas: string[];
}

// Deve corrispondere alle 7 aree reali dello screening
// (vedi screening/questionnaire.tsx AREA_INFO e backend/server.py task_templates)
export const AREA_INFO: { [key: string]: { name: string; icon: string; color: string } } = {
  energia: { name: 'Energia', icon: 'flash', color: '#FF9800' },
  sonno: { name: 'Sonno', icon: 'moon', color: '#9C27B0' },
  stress: { name: 'Stress', icon: 'alert-circle', color: '#F44336' },
  movimento: { name: 'Movimento', icon: 'walk', color: '#2196F3' },
  alimentazione: { name: 'Alimentazione', icon: 'restaurant', color: '#4CAF50' },
  pelle: { name: 'Pelle', icon: 'water', color: '#00BCD4' },
  equilibrio_mentale: { name: 'Equilibrio Mentale', icon: 'heart', color: '#E91E63' },
};

// Il nome dell'area segue la lingua scelta (la schermata che lo usa deve usare useI18n per aggiornarsi)
export const getAreaInfo = (area: string) => {
  const info = AREA_INFO[area];
  return info
    ? { ...info, name: t('area.' + area) }
    : { name: area, icon: 'ellipse', color: '#557A6D' };
};

export { TASK_TEMPLATES } from './taskTemplates';
import { TASK_TEMPLATES } from './taskTemplates';

export const DEFAULT_AREAS = ['energia', 'sonno', 'stress'];

// Fasi progressive del piano (ispirate al modello "10-20 ramp" e a Tiny Habits/BJ Fogg:
// si parte con 1 sola azione richiesta e si sale gradualmente, non tutto e subito).
export interface Phase {
  key: string;
  label: string;
  minRequired: number;
}

export const getPhaseForDay = (day: number, totalAreas: number): Phase => {
  const cap = (n: number) => Math.max(1, Math.min(n, totalAreas));
  if (day <= 7) return { key: 'aggancio', label: t('phase.aggancio'), minRequired: cap(1) };
  if (day <= 14) return { key: 'consolidamento', label: t('phase.consolidamento'), minRequired: cap(2) };
  if (day <= 21) return { key: 'automatismo', label: t('phase.automatismo'), minRequired: cap(2) };
  return { key: 'mantenimento', label: t('phase.mantenimento'), minRequired: cap(3) };
};

export const MILESTONES = [7, 14, 21, 30];

// Genera il piano locale di 30 giorni in base alle aree deboli dello screening.
// Ogni giorno propone un'opzione per ciascuna delle aree deboli (di norma 3): l'utente
// sceglie quali completare. Il numero minimo richiesto per "riuscire" la giornata sale
// progressivamente nel corso del mese (vedi getPhaseForDay).
export const generateLocalPlan = (screeningResult: ScreeningResultForPlan | null): PianoTask[] => {
  const tasks: PianoTask[] = [];

  let focusAreas =
    screeningResult?.weak_areas && screeningResult.weak_areas.length > 0
      ? screeningResult.weak_areas.slice(0, 3)
      : DEFAULT_AREAS;

  focusAreas = focusAreas.map(a => a.toLowerCase().replace(/\s+/g, '_'));

  const areaCursor: { [key: string]: number } = {};
  focusAreas.forEach(a => { areaCursor[a] = 0; });

  for (let day = 1; day <= 30; day++) {
    const { minRequired } = getPhaseForDay(day, focusAreas.length);

    focusAreas.forEach((area, idx) => {
      const pool = TASK_TEMPLATES[area] || TASK_TEMPLATES['energia'];
      const taskText = pool[areaCursor[area] % pool.length];
      areaCursor[area] += 1;

      tasks.push({
        id: `local_task_${day}_${area}`,
        day,
        task: taskText,
        area,
        completed: false,
        optional: idx >= minRequired,
      });
    });
  }

  return tasks;
};

// Un giorno "riesce" quando almeno minRequired task tra quelli proposti sono completati.
export const isDaySucceeded = (day: number, dayTasks: PianoTask[]): boolean => {
  const phase = getPhaseForDay(day, dayTasks.length || 3);
  return dayTasks.filter(t => t.completed).length >= phase.minRequired;
};

// ===== Sintesi settimanale con consigli da esperti (ogni 7 giorni, prima del check-in) =====

export const WEEKLY_CHECKPOINT_DAYS = [7, 14, 21, 28];

export interface Expert {
  name: string;
  role: string;
}

// Un esperto/fonte di riconosciuta reputazione internazionale per ciascuna delle 7 aree
// dello screening. Consigli parafrasati (non citazioni testuali) dal loro lavoro pubblico.
export const EXPERTS: { [area: string]: Expert } = {
  energia: { name: 'Andrew Huberman', role: 'Neuroscienziato, Stanford University' },
  sonno: { name: 'Matthew Walker', role: 'Neuroscienziato, UC Berkeley · autore di "Why We Sleep"' },
  stress: { name: 'Kelly McGonigal', role: 'Psicologa della salute, Stanford University' },
  movimento: { name: 'Peter Attia', role: 'Medico, specialista in longevità' },
  alimentazione: { name: 'Tim Spector', role: 'Epidemiologo, King\'s College London' },
  pelle: { name: 'Howard Murad', role: 'Dermatologo e farmacista, UCLA · fondatore della filosofia "Inclusive Health"' },
  equilibrio_mentale: { name: 'Jon Kabat-Zinn', role: 'Fondatore della Mindfulness-Based Stress Reduction' },
};

// 4 consigli per area, uno per ciascun checkpoint settimanale (giorno 7/14/21/28), cosi' non si
// ripete mai lo stesso consiglio nello stesso piano di 30 giorni. I testi sono nei cataloghi
// delle traduzioni, con chiavi tip.<area>.<0-3>.
const TIPS_PER_AREA = 4;

export interface WeeklyTip {
  area: string;
  expert: Expert;
  tip: string;
}

export interface WeeklySummary {
  weekNumber: number; // 1-4
  daysSucceededInWeek: number;
  totalDaysInWeek: number;
  tips: WeeklyTip[];
}

// Restituisce la sintesi settimanale (recap + 3 consigli, uno per area debole) solo nei
// giorni di checkpoint (7/14/21/28), altrimenti null.
export const getWeeklySummary = (
  day: number,
  weakAreas: string[],
  allTasks: PianoTask[]
): WeeklySummary | null => {
  if (!WEEKLY_CHECKPOINT_DAYS.includes(day)) return null;

  const weekNumber = day / 7; // 1, 2, 3, 4
  const weekStart = day - 6;
  const weekTasks = allTasks.filter(t => t.day >= weekStart && t.day <= day);
  const daysInWeek = Array.from(new Set(weekTasks.map(t => t.day)));
  const daysSucceededInWeek = daysInWeek.filter(d =>
    isDaySucceeded(d, weekTasks.filter(t => t.day === d))
  ).length;

  const tipIndex = weekNumber - 1; // 0-3
  const tips: WeeklyTip[] = weakAreas.slice(0, 3).map(area => {
    const tipArea = EXPERTS[area] ? area : 'equilibrio_mentale';
    const expert = { name: EXPERTS[tipArea].name, role: t('expert.role.' + tipArea) };
    return { area, expert, tip: t(`tip.${tipArea}.${tipIndex % TIPS_PER_AREA}`) };
  });

  return {
    weekNumber,
    daysSucceededInWeek,
    totalDaysInWeek: daysInWeek.length,
    tips,
  };
};

// Giorno corrente del piano (1-30), calcolato dai giorni di calendario trascorsi
// da quando il piano e' iniziato - non da quante volte apri l'app.
export const getCurrentDay = async (): Promise<number> => {
  try {
    const startDateStr = await AsyncStorage.getItem(PIANO_START_DATE_KEY);
    if (startDateStr) {
      // Il giorno cambia a mezzanotte (vedi planDay.ts), non 24 ore dopo l'ora di inizio
      const diffDays = planDayOn(new Date(startDateStr), new Date());
      return Math.min(Math.max(diffDays, 1), 30);
    }
    await AsyncStorage.setItem(PIANO_START_DATE_KEY, new Date().toISOString());
    return 1;
  } catch (error) {
    console.error('Error calculating current day:', error);
    return 1;
  }
};

// Giorni trascorsi dall'inizio del ciclo, SENZA il limite di 30 (serve a capire se il
// ciclo e' finito). null se il ciclo non e' ancora iniziato.
export const getElapsedDays = async (): Promise<number | null> => {
  try {
    const startDateStr = await AsyncStorage.getItem(PIANO_START_DATE_KEY);
    if (!startDateStr) return null;
    return planDayOn(new Date(startDateStr), new Date());
  } catch (error) {
    console.error('Error reading elapsed days:', error);
    return null;
  }
};

export const setPianoStartDate = async (iso: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(PIANO_START_DATE_KEY, iso);
  } catch (error) {
    console.error('Error saving piano start date:', error);
  }
};

// Piano "a scorrimento": tiene i giorni gia' vissuti (con quello che hai spuntato) e
// rigenera solo i giorni successivi sulle nuove aree deboli. Cosi' rifare lo screening
// a meta' percorso non azzera niente di quanto guadagnato.
export const slideLocalPlan = (
  existing: PianoTask[],
  screeningResult: ScreeningResultForPlan | null,
  keepUntilDay: number
): PianoTask[] => {
  const fresh = generateLocalPlan(screeningResult);
  return [
    ...existing.filter(t => t.day <= keepUntilDay),
    ...fresh.filter(t => t.day > keepUntilDay),
  ];
};

// ===== Modalita' Guest: piano locale =====

export const loadLocalTasks = async (
  screeningResult: ScreeningResultForPlan | null
): Promise<PianoTask[]> => {
  try {
    const saved = await AsyncStorage.getItem(PIANO_TASKS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading local piano tasks:', error);
  }
  const fresh = generateLocalPlan(screeningResult);
  try {
    await AsyncStorage.setItem(PIANO_TASKS_KEY, JSON.stringify(fresh));
  } catch (error) {
    console.error('Error saving local piano tasks:', error);
  }
  return fresh;
};

export const saveLocalTasks = async (tasks: PianoTask[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PIANO_TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving local piano tasks:', error);
  }
};

// ===== Modalita' registrata: piano sul backend =====

export const fetchBackendTasks = async (userId: string): Promise<PianoTask[]> => {
  const response = await fetch(`${API_URL}/api/piano/tasks?user_id=${userId}`);
  if (!response.ok) throw new Error('Impossibile caricare il piano dal server');
  return response.json();
};

export interface BackendPianoState {
  start_date: string | null;
  banked_stars: number;
  cycles: number;
}

export const fetchBackendState = async (userId: string): Promise<BackendPianoState | null> => {
  try {
    const response = await fetch(`${API_URL}/api/piano/state?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error('Error loading piano state:', error);
    return null;
  }
};

// Per gli utenti registrati la data di inizio ciclo vive sul server (cosi' sopravvive a
// logout e cambio dispositivo). Se il server non ce l'ha ancora (piani nati prima di
// questa funzione) gli passiamo quella locale; se ce l'ha, vince quella del server.
export const syncStartDateFromServer = async (userId: string): Promise<BackendPianoState | null> => {
  const state = await fetchBackendState(userId);
  if (!state) return null;
  if (state.start_date) {
    await setPianoStartDate(state.start_date);
    return state;
  }
  try {
    await getCurrentDay(); // crea la data locale se manca
    const local = await AsyncStorage.getItem(PIANO_START_DATE_KEY);
    if (local) {
      await fetch(`${API_URL}/api/piano/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, start_date: local }),
      });
    }
  } catch (error) {
    console.error('Error pushing piano start date:', error);
  }
  return state;
};

export const completeBackendTask = async (taskId: string, completed: boolean): Promise<void> => {
  const response = await fetch(`${API_URL}/api/piano/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, completed }),
  });
  if (!response.ok) throw new Error('Impossibile aggiornare il task sul server');
};
