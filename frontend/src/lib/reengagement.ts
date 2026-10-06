// Motore delle "notifiche gentili". Funzioni pure (nessun accesso al telefono): dato quello
// che sappiamo dell'utente, decide QUALI notifiche programmare e QUANDO. Il collegamento con
// il telefono sta in notificationsNative.ts.
//
// Regole (approvate):
//  - massimo una notifica al giorno, solo tra le 8 e le 21;
//  - "Il tuo momento": oggi (se la tua parte non e' ancora fatta) e domani, all'orario scelto;
//  - se manchi: un richiamo dopo 3, 7 e 14 giorni, poi silenzio finche' non torni tu;
//  - "Momenti importanti" (sintesi settimanale, traguardo vicino, controllo dei 15 giorni,
//    fine ciclo) prendono il posto del messaggio del giorno, solo per oggi/domani;
//  - niente se spente o in pausa; mai colpa, mai dati sensibili nel testo.
// Ad ogni apertura dell'app (e a ogni cambio) la sequenza viene ricalcolata da zero.

import { NotificationSettings, isPaused } from './notificationSettings';
import { planDayOn } from './planDay';

export type MessageFamily = 'moment' | 'comeback' | 'milestone';

export interface PlannedNotification {
  id: string;
  family: MessageFamily;
  messageId: string;
  fireAt: Date;
  title: string;
  body: string;
  route: string; // dove porta il tocco sulla notifica
}

// Quello che l'app sa e salva (da Oggi) per far lavorare il motore anche quando e' chiusa.
export interface EngineSnapshot {
  planStart: string | null; // ISO inizio del ciclo
  succeededDays: number[]; // giorni del piano "riusciti"
  stars: number;
  lastScreening: string | null; // ISO dell'ultimo screening
  savedAt: string;
}

// Memoria del motore, per non ripetere gli stessi messaggi e non insistere.
// Un promemoria "una volta sola": vale per una certa chiave (es. l'ultimo screening) e resta
// valido finche' non e' scattato; solo dopo non lo riproponiamo (cosi' riaprire l'app due
// volte nello stesso giorno non lo cancella).
export interface OneShot {
  for: string;
  fireAt: string; // ISO
}

export interface EngineState {
  lastIds: { [family: string]: string };
  checkNudge: OneShot | null; // proposta del controllo dei 15 giorni
  cycleEndNudge: OneShot | null; // festeggiamento della fine ciclo
}

export const EMPTY_ENGINE_STATE: EngineState = { lastIds: {}, checkNudge: null, cycleEndNudge: null };

const isSpent = (shot: OneShot | null, key: string | null, now: Date) =>
  !!shot && shot.for === key && new Date(shot.fireAt).getTime() <= now.getTime();

const DAY_MS = 24 * 60 * 60 * 1000;
export const MILESTONE_DAYS = [7, 14, 21, 30];
export const WEEKLY_DAYS = [7, 14, 21, 28];
export const COMEBACK_OFFSETS = [3, 7, 14]; // giorni dopo l'ultima apertura
export const CHECK_INTERVAL = 15;
const QUIET_FROM = 8; // prima di questa ora mai
const QUIET_TO = 21; // da questa ora in poi mai

// ===== Messaggi =====

interface MessageVariant {
  id: string;
  title: string;
  body: string; // puo' usare {stars} {n} {m} {days}
  route?: string;
  needsStars?: boolean;
}

const OGGI = '/(tabs)/oggi';

export const MOMENT_MESSAGES: MessageVariant[] = [
  { id: 'm1', title: 'Il tuo momento', body: 'Un gesto piccolo oggi basta. Ne scegli uno?' },
  { id: 'm2', title: 'Due minuti per te', body: "Scegli l'azione che ti va di più oggi: anche una sola conta." },
  { id: 'm3', title: "C'è un'idea pronta per te", body: 'Una ricetta, un po\' di respiro o un pensiero da leggere: scegli tu.' },
  { id: 'm4', title: 'Come stai oggi?', body: "Un check-in di un minuto e poi l'azione del giorno, senza fretta." },
  { id: 'm5', title: 'Il piano ti aspetta, con calma', body: 'Per far riuscire la giornata ne bastano poche.' },
  { id: 'm6', title: 'Un momento per respirare', body: '5 minuti con i Suoni o una piccola azione: come preferisci.' },
  { id: 'm7', title: 'Piccoli passi', body: "Hai già {stars} stelle. Oggi ce n'è un'altra che ti aspetta.", needsStars: true },
  { id: 'm8', title: 'Fermarsi un minuto', body: 'Il tuo diario è lì, se ti va di scrivere due righe.', route: '/diario' },
];

export const COMEBACK_MESSAGES: { [offset: number]: MessageVariant[] } = {
  3: [
    { id: 'c3a', title: 'Le tue stelle ti aspettano', body: 'Sono al sicuro. Quando vuoi, riparti da dove eri: un gesto basta.' },
    { id: 'c3b', title: 'Nessuna fretta', body: 'Il tuo percorso è fermo ad aspettarti. Non si è perso niente.' },
    { id: 'c3c', title: 'Un gesto piccolo?', body: 'Anche solo uno è un buon modo per rimetterti in cammino.' },
  ],
  7: [
    { id: 'c7a', title: 'Quando ti va', body: "Il piano è come l'hai lasciato. Scegli l'azione più leggera e riparti." },
    { id: 'c7b', title: 'Ci siamo, quando vorrai', body: 'Ripartire è più facile di quanto sembri: bastano due minuti.' },
  ],
  14: [
    { id: 'c14a', title: 'Una porta aperta', body: "Qui trovi tutto com'era, per quando vorrai tornare." },
  ],
};

const MILESTONE_COPY = {
  weekly: { id: 'w', title: 'La tua settimana {n}', body: 'La sintesi con i consigli degli esperti è pronta per te.', route: OGGI },
  streak: { id: 's', title: 'Quasi un traguardo', body: 'Oggi puoi arrivare a {m} giorni di fila.', route: OGGI },
  check: { id: 'k', title: 'Come stai andando?', body: 'Sono passati {days} giorni: 2 minuti per vedere i tuoi progressi.', route: '/screening/questionnaire?mode=quick' },
  cycle: { id: 'e', title: 'Un mese intero!', body: 'Hai completato i tuoi 30 giorni. Vieni a vedere quanta strada hai fatto.', route: OGGI },
};

const fill = (text: string, vars: { [k: string]: number | string }) =>
  text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// Sceglie una variante in modo stabile per quel giorno, evitando la precedente e quelle
// gia' usate in questa sequenza.
const pickVariant = (
  pool: MessageVariant[],
  seed: string,
  avoid: string[],
  stars: number
): MessageVariant => {
  const eligible = pool.filter(v => !v.needsStars || stars >= 1);
  const fresh = eligible.filter(v => !avoid.includes(v.id));
  const list = fresh.length > 0 ? fresh : eligible;
  return list[hash(seed) % list.length];
};

// ===== Utilita' di data =====

// Numero del giorno del piano in un certo momento (cambia a mezzanotte, come nell'app)
export const planDayAt = (planStart: Date, when: Date): number => planDayOn(planStart, when);

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseTime = (value: string): { h: number; m: number } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  let h = match ? parseInt(match[1], 10) : 9;
  const m = match ? parseInt(match[2], 10) : 0;
  if (h < QUIET_FROM || h >= QUIET_TO) h = 9; // mai di notte, qualunque cosa sia salvata
  return { h, m: Math.min(59, m) };
};

const atTime = (base: Date, offsetDays: number, h: number, m: number) => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays, h, m, 0, 0);
  return d;
};

// Serie corrente fino al giorno `upToDay` incluso (stessa logica delle stelle in rewards.ts)
const streakEndingAt = (ok: Set<number>, upToDay: number): number => {
  let n = 0;
  for (let d = upToDay; d >= 1; d--) {
    if (ok.has(d)) n++;
    else break;
  }
  return n;
};

// ===== Il motore =====

export interface EngineInput {
  now: Date;
  settings: NotificationSettings;
  snapshot: EngineSnapshot | null;
  state: EngineState;
}

export interface EngineOutput {
  notifications: PlannedNotification[];
  state: EngineState;
}

export const planNotifications = ({ now, settings, snapshot, state }: EngineInput): EngineOutput => {
  const nextState: EngineState = {
    lastIds: { ...state.lastIds },
    checkNudge: state.checkNudge,
    cycleEndNudge: state.cycleEndNudge,
  };
  if (!settings.enabled) return { notifications: [], state: nextState };

  const { h, m } = parseTime(settings.reminderTime);
  const planStart = snapshot?.planStart ? new Date(snapshot.planStart) : null;
  const hasPlan = !!planStart && !isNaN(planStart.getTime());
  const ok = new Set<number>(snapshot?.succeededDays || []);
  const stars = snapshot?.stars || 0;
  const earliest = new Date(now.getTime() + 60 * 1000); // almeno un minuto nel futuro

  const planDayNow = hasPlan ? planDayAt(planStart!, now) : 0;
  const daysSinceCheck = snapshot?.lastScreening
    ? Math.floor((now.getTime() - new Date(snapshot.lastScreening).getTime()) / DAY_MS)
    : null;
  const checkDue = daysSinceCheck !== null && daysSinceCheck >= CHECK_INTERVAL && planDayNow <= 30;

  const byDay = new Map<string, PlannedNotification>(); // una sola per giorno
  const usedIds: string[] = [];
  let checkNudgeUsed = false;
  let cycleNudgeUsed = false;

  const add = (n: PlannedNotification) => {
    const key = dayKey(n.fireAt);
    if (byDay.has(key)) return;
    byDay.set(key, n);
    usedIds.push(n.messageId);
  };

  // --- Oggi e domani: "Il tuo momento" oppure un "momento importante" ---
  for (const offset of [0, 1]) {
    const fireAt = atTime(now, offset, h, m);
    if (fireAt < earliest) continue;
    const p = hasPlan ? planDayAt(planStart!, fireAt) : 0;
    if (hasPlan && ok.has(p)) continue; // la parte di quel giorno e' gia' fatta

    // Momenti importanti (prendono il posto del messaggio del giorno)
    let milestone: PlannedNotification | null = null;
    if (settings.milestones && hasPlan) {
      const vars = { n: p / 7, m: 0, days: daysSinceCheck ?? 0 };
      if (WEEKLY_DAYS.includes(p)) {
        const c = MILESTONE_COPY.weekly;
        milestone = { id: `milestone-${dayKey(fireAt)}`, family: 'milestone', messageId: `${c.id}${p}`, fireAt, title: fill(c.title, vars), body: fill(c.body, vars), route: c.route };
      } else if (p >= 30) {
        if (!cycleNudgeUsed && !isSpent(state.cycleEndNudge, snapshot!.planStart, now)) {
          const c = MILESTONE_COPY.cycle;
          milestone = { id: `milestone-${dayKey(fireAt)}`, family: 'milestone', messageId: c.id, fireAt, title: c.title, body: c.body, route: c.route };
          cycleNudgeUsed = true;
        }
      } else if (checkDue && !checkNudgeUsed && !isSpent(state.checkNudge, snapshot!.lastScreening, now)) {
        const c = MILESTONE_COPY.check;
        milestone = { id: `milestone-${dayKey(fireAt)}`, family: 'milestone', messageId: c.id, fireAt, title: c.title, body: fill(c.body, vars), route: c.route };
        checkNudgeUsed = true;
      } else if (p >= 1 && p <= 30 && p - 1 <= planDayNow) {
        const mile = streakEndingAt(ok, p - 1) + 1;
        if (MILESTONE_DAYS.includes(mile)) {
          const c = MILESTONE_COPY.streak;
          milestone = { id: `milestone-${dayKey(fireAt)}`, family: 'milestone', messageId: `${c.id}${mile}`, fireAt, title: c.title, body: fill(c.body, { m: mile }), route: c.route };
        }
      }
    }
    if (milestone) {
      add(milestone);
      continue;
    }

    // Il tuo momento (solo durante il ciclo)
    if (settings.dailyMoment && hasPlan && p <= 30) {
      const v = pickVariant(MOMENT_MESSAGES, `moment-${dayKey(fireAt)}`, [state.lastIds.moment, ...usedIds].filter(Boolean) as string[], stars);
      add({ id: `moment-${dayKey(fireAt)}`, family: 'moment', messageId: v.id, fireAt, title: v.title, body: fill(v.body, { stars }), route: v.route || OGGI });
    }
  }

  // --- Richiami se manchi: dopo 3, 7 e 14 giorni, poi silenzio ---
  if (settings.comeback && snapshot) {
    for (const offset of COMEBACK_OFFSETS) {
      const fireAt = atTime(now, offset, h, m);
      const pool = COMEBACK_MESSAGES[offset];
      const v = pickVariant(pool, `comeback-${dayKey(fireAt)}`, [state.lastIds.comeback, ...usedIds].filter(Boolean) as string[], stars);
      add({ id: `comeback-${dayKey(fireAt)}`, family: 'comeback', messageId: v.id, fireAt, title: v.title, body: fill(v.body, { stars }), route: OGGI });
    }
  }

  let notifications = Array.from(byDay.values()).sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  // Pausa: niente prima della data indicata
  if (isPaused(settings, now) && settings.pausedUntil) {
    const until = new Date(settings.pausedUntil).getTime();
    notifications = notifications.filter(n => n.fireAt.getTime() >= until);
  }

  // Memoria: ultimo messaggio per famiglia e promemoria gia' fatti una volta sola
  for (const n of notifications) nextState.lastIds[n.family] = n.messageId;
  const checkN = notifications.find(n => n.messageId === MILESTONE_COPY.check.id);
  if (checkN && snapshot?.lastScreening) nextState.checkNudge = { for: snapshot.lastScreening, fireAt: checkN.fireAt.toISOString() };
  const cycleN = notifications.find(n => n.messageId === MILESTONE_COPY.cycle.id);
  if (cycleN && snapshot?.planStart) nextState.cycleEndNudge = { for: snapshot.planStart, fireAt: cycleN.fireAt.toISOString() };

  return { notifications, state: nextState };
};
