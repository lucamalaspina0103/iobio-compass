// Sistema a stelle. Regole (facili da ritoccare cambiando le costanti):
//  - 1 stella per ogni azione completata (anche le "extra": premia chi fa di piu')
//  - stelle bonus quando si raggiunge un traguardo di serie (7/14/21/30 giorni di fila)
//
// Principi (dalla ricerca su retention di app di benessere): il rinforzo non deve
// essere sempre identico (ogni traguardo ha messaggio e dato personale diversi), deve
// premiare il risultato reale e non punire mai - le stelle guadagnate restano, e la
// serie non si azzera solo perche' oggi non hai ancora fatto i task.
//
// NOTA per il futuro (upgrade sbloccato dalle stelle): oggi le stelle sono DERIVATE dal
// piano corrente. Per usarle come "moneta" cumulativa tra piani diversi e a prova di
// manomissione andranno salvate come registro persistente lato server.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PianoTask, isDaySucceeded, MILESTONES, getAreaInfo } from './pianoPlan';

export interface Streaks {
  current: number;        // giorni riusciti consecutivi fino a oggi (o a ieri, se oggi non e' ancora fatto)
  best: number;           // serie consecutiva piu' lunga mai ottenuta nel piano
  succeededDays: number;  // giornate riuscite in totale, anche non consecutive
}

export const computeStreaks = (allTasks: PianoTask[], currentDay: number): Streaks => {
  const byDay: { [day: number]: PianoTask[] } = {};
  allTasks.forEach(t => {
    (byDay[t.day] = byDay[t.day] || []).push(t);
  });
  const ok = (d: number) => !!byDay[d] && byDay[d].length > 0 && isDaySucceeded(d, byDay[d]);

  let best = 0;
  let run = 0;
  let succeededDays = 0;
  for (let d = 1; d <= currentDay; d++) {
    if (ok(d)) {
      run++;
      succeededDays++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // Se oggi non e' ancora riuscito, la serie non si interrompe: si conta da ieri.
  let current = 0;
  const start = ok(currentDay) ? currentDay : currentDay - 1;
  for (let d = start; d >= 1; d--) {
    if (ok(d)) current++;
    else break;
  }

  return { current, best, succeededDays };
};

// ===== Stelle =====

export const MILESTONE_STAR_BONUS: { [milestone: number]: number } = {
  7: 3,
  14: 5,
  21: 7,
  30: 10,
};

// Stelle del singolo giorno: una per azione completata (massimo = azioni proposte).
export const getDayStars = (dayTasks: PianoTask[]) => ({
  earned: dayTasks.filter(t => t.completed).length,
  max: dayTasks.length,
});

// Le stelle contano solo per i giorni fino a oggi: non si possono "accumulare in anticipo".
export const computeStars = (allTasks: PianoTask[], bestStreak: number, currentDay: number) => {
  const taskStars = allTasks.filter(t => t.completed && t.day <= currentDay).length;
  const bonusStars = MILESTONES.reduce(
    (sum, m) => sum + (bestStreak >= m ? MILESTONE_STAR_BONUS[m] || 0 : 0),
    0
  );
  return { taskStars, bonusStars, total: taskStars + bonusStars };
};

export const getCompletionStats = (allTasks: PianoTask[]) => {
  const completed = allTasks.filter(t => t.completed);
  const perArea: { [area: string]: number } = {};
  completed.forEach(t => {
    perArea[t.area] = (perArea[t.area] || 0) + 1;
  });
  const top = Object.entries(perArea).sort((a, b) => b[1] - a[1])[0];
  return { totalCompleted: completed.length, topArea: top ? top[0] : null };
};

// ===== Momenti di festeggiamento =====

export interface MilestoneMessage {
  title: string;
  message: string;
  icon: string;
  color: string;
}

export const MILESTONE_MESSAGES: { [milestone: number]: MilestoneMessage } = {
  7: {
    title: 'Una settimana di fila',
    message: "La parte più difficile, l'aggancio, è alle spalle. Da adesso il piano ti chiede un po' di più, perché ormai ci sei dentro.",
    icon: 'leaf',
    color: '#7CB342',
  },
  14: {
    title: 'Due settimane di fila',
    message: 'È il momento in cui la novità svanisce e molti si fermano. Tu sei ancora qui: è la tua vera forza.',
    icon: 'flame',
    color: '#FF9800',
  },
  21: {
    title: 'Tre settimane di fila',
    message: 'Le tue azioni stanno diventando automatiche: ti costano meno fatica di prima.',
    icon: 'sunny',
    color: '#FFB300',
  },
  30: {
    title: 'Un mese intero',
    message: 'Hai completato il piano. Guarda il tuo percorso per vedere quanta strada hai fatto.',
    icon: 'ribbon',
    color: '#9C27B0',
  },
};

// Dato personale diverso per ciascun utente, cosi' il traguardo non e' mai una
// frase generica uguale per tutti.
export const getMilestoneStatLine = (allTasks: PianoTask[]): string => {
  const { totalCompleted, topArea } = getCompletionStats(allTasks);
  const parts = [
    `${totalCompleted} ${totalCompleted === 1 ? 'azione completata' : 'azioni completate'} finora`,
  ];
  if (topArea) {
    parts.push(`l'area su cui hai lavorato di più è ${getAreaInfo(topArea).name}`);
  }
  return parts.join(' · ');
};

const CELEBRATED_KEY = 'celebrated_milestones';

export const loadCelebrated = async (): Promise<number[]> => {
  try {
    const saved = await AsyncStorage.getItem(CELEBRATED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading celebrated milestones:', error);
    return [];
  }
};

export const saveCelebrated = async (list: number[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CELEBRATED_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Error saving celebrated milestones:', error);
  }
};

// Il traguardo piu' alto raggiunto e non ancora festeggiato (uno solo per volta,
// per non accumulare una coda di messaggi arretrati).
export const getPendingMilestone = (bestStreak: number, celebrated: number[]): number | null => {
  const reached = MILESTONES.filter(m => bestStreak >= m && !celebrated.includes(m));
  return reached.length > 0 ? Math.max(...reached) : null;
};
