// Invio di uno screening (completo, controllo rapido o revisione del mese): calcola il
// risultato in locale (come rete di sicurezza), decide cosa tenere del piano in corso, lo
// invia al server e allinea piano, stelle e inviti. Usato da questionnaire.tsx e review.tsx.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PianoTask,
  fetchBackendTasks,
  getElapsedDays,
  syncStartDateFromServer,
} from './pianoPlan';
import { RescreenPlan, planRescreen, applyLocalRescreen, loadLocalRawTasks } from './rescreen';
import { saveCelebrated } from './rewards';
import { resetDismissed } from './cycleNotices';
import { Question } from './questionBank';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type ScreeningKind = 'full' | 'quick' | 'review';

export interface SubmittedResult {
  id: string;
  indice_iobio: number;
  area_scores: { [key: string]: number };
  weak_areas: string[];
  date: string;
  kind?: ScreeningKind;
}

export interface SubmitInput {
  questions: Question[];
  answers: number[]; // una per domanda, nello stesso ordine
  kind: ScreeningKind;
  focusAreas?: string[]; // revisione del mese: le aree scelte dalla persona (1-3)
  isGuest: boolean;
  userId: string | null;
  setScreeningResult: (result: any) => void | Promise<void>;
}

// Punteggio 0-100 di una risposta (1-5), tenendo conto di quanto la domanda e' "positiva"
const scoreAnswer = (value: number, polarity: 'positive' | 'negative') =>
  polarity === 'positive' ? ((value - 1) / 4) * 100 : ((5 - value) / 4) * 100;

export const computeLocalResult = (
  questions: Question[],
  answers: number[],
  kind: ScreeningKind,
  focusAreas?: string[]
): SubmittedResult => {
  const perArea: { [area: string]: { scores: number[]; weights: number[] } } = {};
  questions.forEach((q, index) => {
    const weight = q.weight || 1;
    const score = scoreAnswer(answers[index], q.polarity || 'positive');
    (perArea[q.area] = perArea[q.area] || { scores: [], weights: [] });
    perArea[q.area].scores.push(score * weight);
    perArea[q.area].weights.push(weight);
  });

  const averages: { [area: string]: number } = {};
  Object.keys(perArea).forEach(area => {
    const total = perArea[area].scores.reduce((a, b) => a + b, 0);
    const weights = perArea[area].weights.reduce((a, b) => a + b, 0);
    averages[area] = total / weights;
  });
  const index = Object.values(averages).reduce((a, b) => a + b, 0) / Object.keys(averages).length;

  // Nella revisione le aree le sceglie la persona; altrimenti le 3 piu' basse
  const lowest = Object.entries(averages).sort((a, b) => a[1] - b[1]).map(([area]) => area);
  const chosen = (focusAreas || []).filter((a, i, arr) => averages[a] !== undefined && arr.indexOf(a) === i);
  const weak = kind === 'review' && chosen.length >= 1 && chosen.length <= 3 ? chosen : lowest.slice(0, 3);

  return {
    id: `local_${Date.now()}`,
    indice_iobio: Math.round(index),
    area_scores: Object.fromEntries(Object.entries(averages).map(([k, v]) => [k, Math.round(v)])),
    weak_areas: weak,
    kind,
    date: new Date().toISOString(),
  };
};

export const runScreeningSubmit = async (input: SubmitInput): Promise<SubmittedResult> => {
  const { questions, answers, kind, focusAreas, isGuest, userId, setScreeningResult } = input;

  // Risultato calcolato qui, usato se il server non risponde
  const localResults = computeLocalResult(questions, answers, kind, focusAreas);
  await AsyncStorage.setItem('iobio_latest_results', JSON.stringify(localResults));

  // Piano "a scorrimento": prima di inviare decidiamo cosa tenere del piano attuale
  // (il server cancella e rigenera i giorni futuri, quindi serve saperlo prima).
  const registeredId = !isGuest && userId ? userId : null;
  let plan: RescreenPlan = { keepUntilDay: 0, closingStars: 0 };
  let existingTasks: PianoTask[] = [];
  try {
    if (registeredId) {
      await syncStartDateFromServer(registeredId);
      existingTasks = await fetchBackendTasks(registeredId);
    } else {
      existingTasks = await loadLocalRawTasks();
    }
    plan = planRescreen(existingTasks, await getElapsedDays());
  } catch (planError) {
    console.warn('Impossibile leggere il piano attuale, si riparte da zero:', planError);
  }

  try {
    const formattedAnswers = questions.map((question, index) => ({
      question_id: question.id,
      area: question.area,
      answer: answers[index],
      scale_type: question.scaleType,
      polarity: question.polarity || 'positive',
      weight: question.weight || 1,
    }));

    const response = await fetch(`${API_URL}/api/screening/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: isGuest ? null : userId,
        answers: formattedAnswers,
        keep_until_day: plan.keepUntilDay,
        closing_stars: plan.closingStars,
        kind,
        ...(kind === 'review' && focusAreas && focusAreas.length > 0 ? { focus_areas: focusAreas } : {}),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setScreeningResult(data);
      await AsyncStorage.setItem('iobio_latest_results', JSON.stringify(data));
      if (registeredId) {
        // Il server ha gia' aggiornato il piano; qui riallineiamo solo la data di inizio.
        if (plan.keepUntilDay === 0) {
          await syncStartDateFromServer(registeredId);
          await saveCelebrated([]);
          await resetDismissed();
        }
      } else {
        await applyLocalRescreen(data, plan, existingTasks);
      }
      return data;
    }

    console.warn('API returned error, using local results');
    setScreeningResult(localResults);
    if (!registeredId) await applyLocalRescreen(localResults, plan, existingTasks);
    return localResults;
  } catch (apiError) {
    console.error('API submit failed:', apiError);
    setScreeningResult(localResults);
    if (!registeredId) await applyLocalRescreen(localResults, plan, existingTasks);
    try {
      alert('Errore salvataggio: continuo in locale');
    } catch (alertError) {
      console.warn('Alert non mostrabile, continuo comunque:', alertError);
    }
    return localResults;
  }
};
