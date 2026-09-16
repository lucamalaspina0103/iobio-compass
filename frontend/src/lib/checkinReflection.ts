// Riflessione giornaliera generata dal check-in (energia/umore/sonno).
// Diversa dai consigli degli esperti (che arrivano ogni 7 giorni, quando c'e'
// abbastanza tempo/dati per essere significativi): qui non diamo una risposta,
// ma una domanda breve che aiuta l'utente a fermarsi un attimo sul "perché"
// del proprio risultato di oggi.

export interface CheckinData {
  energia: number;
  umore: number;
  sonno: number;
}

interface ReflectionPrompts {
  low: string[];   // valore 1-2
  mid: string[];   // valore 3
  high: string[];  // valore 4-5
}

const PROMPTS: { [key in keyof CheckinData]: ReflectionPrompts } = {
  energia: {
    low: [
      "Cosa pensi abbia pesato di più sulla tua energia oggi?",
      "C'è stato un momento preciso in cui l'energia è calata di più?",
    ],
    mid: [
      "Cosa renderebbe la tua energia anche solo un po' migliore domani?",
    ],
    high: [
      "Cosa hai fatto oggi che ti ha dato più energia? Vale la pena ripeterlo.",
    ],
  },
  umore: {
    low: [
      "C'è un pensiero preciso dietro l'umore di oggi, o è più una sensazione diffusa?",
      "Cosa ti aiuterebbe adesso, anche una piccola cosa?",
    ],
    mid: [
      "Cosa cambierebbe il tuo umore in meglio, anche di poco, domani?",
    ],
    high: [
      "Cosa ha contribuito di più al tuo buon umore oggi?",
    ],
  },
  sonno: {
    low: [
      "Cosa pensi ti abbia disturbato il sonno la notte scorsa?",
      "Cosa era diverso ieri sera rispetto alle notti in cui dormi meglio?",
    ],
    mid: [
      "Cosa potresti provare a cambiare stasera per dormire un po' meglio?",
    ],
    high: [
      "Cosa hai fatto ieri sera che potrebbe aver aiutato il sonno?",
    ],
  },
};

const LABELS: { [key in keyof CheckinData]: string } = {
  energia: 'energia',
  umore: 'umore',
  sonno: 'sonno',
};

const bucket = (value: number): 'low' | 'mid' | 'high' => {
  if (value <= 2) return 'low';
  if (value >= 4) return 'high';
  return 'mid';
};

// Sceglie la dimensione (energia/umore/sonno) con il punteggio più basso di oggi -
// e' quella su cui una riflessione ha più senso - e restituisce una domanda per
// quella dimensione. In caso di parità: energia, poi umore, poi sonno.
export const getDailyReflection = (data: CheckinData): { area: keyof CheckinData; question: string } => {
  const order: (keyof CheckinData)[] = ['energia', 'umore', 'sonno'];
  const lowest = order.reduce((min, key) => (data[key] < data[min] ? key : min), order[0]);

  const bucketKey = bucket(data[lowest]);
  const pool = PROMPTS[lowest][bucketKey];
  // Scelta deterministica ma variabile in base al giorno, cosi' non e' sempre la stessa domanda
  const dayIndex = new Date().getDate() % pool.length;

  return { area: lowest, question: pool[dayIndex] };
};

export const CHECKIN_LABELS = LABELS;
