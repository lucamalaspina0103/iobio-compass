// Cosa succede al piano quando l'utente rifa' lo screening ("piano a scorrimento"):
//  - ciclo in corso: i giorni gia' vissuti restano com'erano (spunte, serie, stelle,
//    traguardi festeggiati) e cambiano solo i giorni da oggi in poi, sulle nuove aree deboli;
//  - ciclo finito (oltre 30 giorni): si apre un nuovo ciclo da capo e le stelle di quello
//    chiuso vanno in "cassaforte", cosi' non si perdono mai.
//
// Cassaforte: Guest = locale (AsyncStorage), registrato = server (tabella piano_state).

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PianoTask,
  ScreeningResultForPlan,
  PIANO_TASKS_KEY,
  fetchBackendState,
  generateLocalPlan,
  setPianoStartDate,
  slideLocalPlan,
} from './pianoPlan';
import { computeStreaks, computeStars, saveCelebrated } from './rewards';
import { resetDismissed } from './cycleNotices';

const STARS_VAULT_KEY = 'stars_vault';

export interface StarVault {
  banked: number; // stelle dei cicli gia' chiusi
  cycles: number; // quanti cicli chiusi
}

export const loadLocalVault = async (): Promise<StarVault> => {
  try {
    const saved = await AsyncStorage.getItem(STARS_VAULT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading stars vault:', error);
  }
  return { banked: 0, cycles: 0 };
};

const addToLocalVault = async (stars: number): Promise<void> => {
  if (stars <= 0) return;
  const vault = await loadLocalVault();
  try {
    await AsyncStorage.setItem(
      STARS_VAULT_KEY,
      JSON.stringify({ banked: vault.banked + stars, cycles: vault.cycles + 1 })
    );
  } catch (error) {
    console.error('Error saving stars vault:', error);
  }
};

// Stelle gia' in cassaforte (cicli precedenti), da sommare a quelle del ciclo in corso.
export const getBankedStars = async (isGuest: boolean, userId?: string | null): Promise<number> => {
  if (isGuest || !userId) {
    return (await loadLocalVault()).banked;
  }
  const state = await fetchBackendState(userId);
  return state?.banked_stars ?? 0;
};

export interface RescreenPlan {
  keepUntilDay: number; // giorni da conservare; 0 = nuovo ciclo
  closingStars: number; // stelle del ciclo chiuso da mettere in cassaforte (solo se keepUntilDay = 0)
}

// Decide come trattare il piano esistente, a partire dai task attuali e dai giorni trascorsi.
export const planRescreen = (tasks: PianoTask[], elapsedDays: number | null): RescreenPlan => {
  if (tasks.length === 0 || elapsedDays === null) {
    return { keepUntilDay: 0, closingStars: 0 };
  }

  if (elapsedDays > 30) {
    const { best } = computeStreaks(tasks, 30);
    return { keepUntilDay: 0, closingStars: computeStars(tasks, best, 30).total };
  }

  // Oggi si cambia subito, a meno che tu abbia gia' spuntato qualcosa: in quel caso la
  // giornata di oggi resta com'e' (le stelle di oggi non sparirebbero) e si cambia da domani.
  const todayHasProgress = tasks.some(t => t.day === elapsedDays && t.completed);
  const keep = todayHasProgress ? elapsedDays : elapsedDays - 1;
  if (keep <= 0) {
    return { keepUntilDay: 0, closingStars: 0 };
  }
  return { keepUntilDay: keep, closingStars: 0 };
};

// Modalita' Guest: applica il nuovo screening al piano locale.
export const applyLocalRescreen = async (
  screening: ScreeningResultForPlan,
  plan: RescreenPlan,
  existing: PianoTask[]
): Promise<void> => {
  try {
    if (plan.keepUntilDay > 0) {
      const slid = slideLocalPlan(existing, screening, plan.keepUntilDay);
      await AsyncStorage.setItem(PIANO_TASKS_KEY, JSON.stringify(slid));
      return;
    }
    await addToLocalVault(plan.closingStars);
    await AsyncStorage.setItem(PIANO_TASKS_KEY, JSON.stringify(generateLocalPlan(screening)));
    await startNewCycleLocally();
  } catch (error) {
    console.error('Error applying rescreen to local plan:', error);
  }
};

// Nuovo ciclo: la data di inizio riparte da adesso e i traguardi si possono festeggiare di nuovo.
export const startNewCycleLocally = async (): Promise<void> => {
  await setPianoStartDate(new Date().toISOString());
  await saveCelebrated([]);
  await resetDismissed();
};

export const loadLocalRawTasks = async (): Promise<PianoTask[]> => {
  try {
    const saved = await AsyncStorage.getItem(PIANO_TASKS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error reading local plan:', error);
    return [];
  }
};
