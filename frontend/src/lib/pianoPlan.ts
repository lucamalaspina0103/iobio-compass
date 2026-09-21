// Logica condivisa del Piano 30 giorni, usata sia da app/piano/index.tsx (vista
// completa) sia da app/(tabs)/oggi.tsx (vista sintetica del giorno corrente) -
// prima erano due copie indipendenti che potevano disallinearsi tra loro.
//
// Modalita' Guest: piano generato e salvato SOLO in locale (AsyncStorage), cosi'
// resta privato al dispositivo e non si mescola con quello di altri Guest.
// Modalita' registrata: piano letto/scritto sul backend, condiviso tra dispositivi.

import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const getAreaInfo = (area: string) =>
  AREA_INFO[area] || { name: area, icon: 'ellipse', color: '#7CB342' };

// Pool di 15 micro-azioni per area. Stesso identico testo del backend
// (backend/server.py) per restare sincronizzati tra modalita' Guest (locale) e
// modalita' registrata (server).
export const TASK_TEMPLATES: { [key: string]: string[] } = {
  energia: [
    "Fai 5 minuti di stretching al risveglio",
    "Bevi un bicchiere d'acqua appena sveglio",
    "Esci all'aria aperta per 10 minuti",
    "Fai una pausa di 5 minuti ogni 2 ore",
    "Mangia uno snack energetico a metà mattina",
    "Evita caffeina dopo le 15:00",
    "Fai 10 respiri profondi durante la giornata",
    "Prendi il sole per 15 minuti",
    "Ascolta musica energizzante per 10 minuti",
    "Fai una breve passeggiata dopo pranzo",
    "Fai una doccia rivitalizzante al mattino",
    "Apri le tende appena sveglio per la luce naturale",
    "Fai 2 minuti di jumping jack per svegliarti",
    "Prepara la colazione la sera prima per non correre",
    "Alzati e stiracchiati ogni ora di lavoro",
  ],
  sonno: [
    "Vai a letto alla stessa ora",
    "Spegni gli schermi 30 minuti prima di dormire",
    "Leggi 10 pagine di un libro rilassante",
    "Prepara la camera per la notte (buio, fresco)",
    "Fai un bagno caldo serale",
    "Evita pasti pesanti dopo le 20:00",
    "Pratica 5 minuti di meditazione serale",
    "Scrivi 3 cose positive della giornata",
    "Bevi una tisana rilassante",
    "Fai stretching leggero prima di dormire",
    "Metti il telefono in un'altra stanza la sera",
    "Fai una doccia tiepida prima di coricarti",
    "Scrivi la lista delle cose da fare domani per liberare la mente",
    "Riduci le luci in casa un'ora prima di dormire",
    "Evita alcol nella serata",
  ],
  stress: [
    "Pratica 2 minuti di respirazione profonda",
    "Scrivi i tuoi pensieri per 5 minuti",
    "Ascolta musica rilassante per 10 minuti",
    "Fai una pausa consapevole senza multitasking",
    "Esci per una camminata di 15 minuti",
    "Chiama un amico per 10 minuti",
    "Pratica la gratitudine: annota 3 cose positive",
    "Fai stretching per rilassare le tensioni",
    "Disconnettiti dai social per 1 ora",
    "Dedica 10 minuti a un hobby che ami",
    "Fai una lista delle priorità del giorno",
    "Prova la tecnica di respirazione 4-7-8",
    "Concediti 5 minuti di silenzio senza distrazioni",
    "Scrivi su carta un pensiero negativo per ridimensionarlo",
    "Fai una risata guardando qualcosa di divertente",
  ],
  movimento: [
    "Cammina per 10 minuti",
    "Fai 10 squat durante una pausa",
    "Prendi le scale invece dell'ascensore",
    "Fai stretching per 5 minuti",
    "Balla per 5 minuti su una canzone che ami",
    "Fai una passeggiata dopo cena",
    "Pratica yoga per 10 minuti",
    "Fai 5 minuti di esercizi a corpo libero",
    "Alzati e muoviti ogni ora",
    "Prova un nuovo sport per 15 minuti",
    "Fai 5000 passi oggi",
    "Parcheggia più lontano e cammina un po' di più",
    "Fai 10 minuti di camminata veloce",
    "Fai qualche piegamento durante la giornata",
    "Fai una sessione di bici o camminata all'aperto",
  ],
  alimentazione: [
    "Mangia una porzione di verdura a pranzo",
    "Bevi 8 bicchieri d'acqua, distribuiti dalla mattina alla sera",
    "Fai uno snack con frutta fresca e qualche mandorla o noce, per non far salire troppo la glicemia",
    "Prepara un pasto sano con ingredienti freschi",
    "Evita cibi processati oggi",
    "Mangia consapevolmente senza distrazioni",
    "Aggiungi alla colazione una fonte proteica sana (uova, yogurt greco, frutta secca o legumi)",
    "Riduci lo zucchero raffinato",
    "Prova una nuova ricetta salutare",
    "Mangia noci o semi come snack",
    "Fai la spesa con una lista per evitare acquisti impulsivi",
    "Mastica lentamente ad ogni pasto",
    "Sostituisci una bevanda zuccherata con acqua o tisana",
    "Porta con te uno snack sano fuori casa",
    "Aggiungi una nuova verdura alla tua dieta",
  ],
  pelle: [
    "Applica crema idratante mattina e sera",
    "Bevi acqua regolarmente durante il giorno",
    "Usa protezione solare",
    "Detergi il viso mattina e sera",
    "Mangia cibi ricchi di antiossidanti",
    "Evita di toccarti il viso",
    "Dormi su una federa pulita",
    "Fai uno scrub delicato",
    "Applica una maschera idratante",
    "Limita l'esposizione allo stress",
    "Bevi un tè verde ricco di antiossidanti",
    "Cambia la federa del cuscino questa settimana",
    "Applica il contorno occhi prima di dormire",
    "Evita docce troppo calde che seccano la pelle",
    "Prenditi 5 minuti per un automassaggio al viso",
  ],
  equilibrio_mentale: [
    "Medita per 5 minuti al mattino",
    "Scegli un'attività qualsiasi (mangiare, camminare, lavarti i denti) e falla concentrandoti solo su di essa, senza distrazioni",
    "Scrivi una sola frase che racchiude come ti senti in questo momento",
    "Guardati allo specchio e dì 3 affermazioni positive su di te: una sul fisico, una sul carattere, una su un tuo traguardo",
    "Disconnettiti dai social per 2 ore",
    "Pratica la gratitudine",
    "Leggi qualcosa di ispirazionale",
    "Ascolta un podcast motivazionale",
    "Passa tempo nella natura",
    "Pratica il perdono verso te stesso",
    "Fai 3 respiri consapevoli prima di iniziare la giornata",
    "Scrivi una cosa che ti rende orgoglioso/a di te",
    "Concediti una pausa senza sensi di colpa",
    "Sorridi a te stesso/a allo specchio",
    "Condividi un pensiero con una persona di fiducia",
  ],
};

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
  if (day <= 7) return { key: 'aggancio', label: 'Settimana 1 · Aggancio', minRequired: cap(1) };
  if (day <= 14) return { key: 'consolidamento', label: 'Settimana 2 · Consolidamento', minRequired: cap(2) };
  if (day <= 21) return { key: 'automatismo', label: 'Settimana 3 · Automatismo', minRequired: cap(2) };
  return { key: 'mantenimento', label: 'Settimana 4 · Mantenimento', minRequired: cap(3) };
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

// 4 consigli per area, uno per ciascun checkpoint settimanale (giorno 7/14/21/28),
// cosi' non si ripete mai lo stesso consiglio nello stesso piano di 30 giorni.
export const WEEKLY_TIPS: { [area: string]: string[] } = {
  energia: [
    "Esponiti a luce naturale nei primi minuti dopo il risveglio: è il segnale più forte per il ritmo del tuo corpo.",
    "Evita luce intensa dagli schermi nell'ora prima di dormire, per non compromettere l'energia del giorno dopo.",
    "Pasti a orari regolari aiutano il corpo a mantenere un'energia più stabile durante il giorno.",
    "Una breve pausa attiva ogni 90 minuti circa aiuta a mantenere concentrazione ed energia.",
  ],
  sonno: [
    "Andare a letto e svegliarsi sempre alla stessa ora è l'abitudine singola più efficace per dormire meglio.",
    "Anche un solo caffè nel tardo pomeriggio può ridurre sensibilmente la qualità del sonno profondo.",
    "Una stanza fresca (intorno ai 18°C) aiuta il corpo ad addormentarsi più facilmente.",
    "Riduci le luci in casa nell'ultima ora prima di dormire, per favorire la melatonina naturale.",
  ],
  stress: [
    "Vedere lo stress come una sfida da affrontare, e non una minaccia, ne cambia l'effetto sul corpo.",
    "Se qualcosa ti crea stress, spesso significa che quella cosa conta davvero per te.",
    "Condividere ciò che ti pesa con qualcuno riduce l'impatto dello stress: non serve affrontarlo da solo.",
    "Il cuore che batte forte è il corpo che si prepara ad affrontare la sfida, non a scappare.",
  ],
  movimento: [
    "Una camminata a ritmo \"puoi ancora parlare\" alcune volte a settimana conta più di sessioni intense sporadiche.",
    "La costanza nel muoversi conta più dell'intensità: meglio poco e spesso che tanto e raramente.",
    "Muoversi regolarmente aiuta il corpo a usare meglio l'energia disponibile durante la giornata.",
    "Anche solo alzarsi e camminare ogni ora spezza gli effetti dello stare seduti a lungo.",
  ],
  alimentazione: [
    "Varia il più possibile i vegetali che mangi: conta più della singola \"dieta\" che segui.",
    "Legumi, cereali integrali e semi contano come \"piante\" tanto quanto frutta e verdura.",
    "I cibi fermentati (yogurt, kefir, crauti) supportano l'equilibrio dei batteri intestinali.",
    "Preferisci cibi il più possibile vicini al loro stato naturale, riducendo gli ultra-processati.",
  ],
  pelle: [
    "La salute della pelle riflette la salute di tutto il corpo: contano anche alimentazione, sonno e stress, non solo i prodotti che applichi.",
    "Bere a sufficienza e mangiare cibi ricchi d'acqua aiuta le cellule della pelle a restare idratate anche dall'interno.",
    "Gli antiossidanti della dieta (frutta e verdura colorata) proteggono la pelle tanto quanto una buona crema.",
    "Il benessere emotivo si vede sulla pelle: prendersi cura dello stress fa parte della cura della pelle.",
  ],
  equilibrio_mentale: [
    "Non serve aggiungere tempo: basta portare piena attenzione a qualcosa che già fai, come lavarti i denti.",
    "La mindfulness è notare il momento presente senza giudicarlo, non \"svuotare la mente\".",
    "Bastano pochi minuti al mattino per cambiare il tono di tutta la giornata.",
    "Anche solo concentrarsi sul respiro per un minuto è già una forma completa di pratica.",
  ],
};

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
    const pool = WEEKLY_TIPS[area] || WEEKLY_TIPS['equilibrio_mentale'];
    const expert = EXPERTS[area] || EXPERTS['equilibrio_mentale'];
    return { area, expert, tip: pool[tipIndex % pool.length] };
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
      const startDate = new Date(startDateStr);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
    const diffTime = new Date().getTime() - new Date(startDateStr).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
