// Alcuni task del piano chiedono di scrivere ("Scrivi...", "...annota...") o di leggere/
// ascoltare qualcosa senza dire cosa ("Leggi qualcosa di ispirazionale"). Lasciati cosi',
// il primo tipo costringe a usare un altro strumento (note del telefono, carta...) e il
// secondo da' per scontato che la persona sappia gia' cosa fare - altrimenti se ne
// dimentica nella giornata. Qui riconosciamo questi task per offrire, nello stesso
// momento in cui si tocca il task, un modo di soddisfarli subito, dentro l'app.

import { IDEA_CATEGORIES, IDEAS, Idea, IdeaKind } from './ideaLibrary';

export type TaskInteractionType = 'write' | 'idea' | null;

// Word-boundary aware: "Scrivi" deve essere una parola intera, non un pezzo di un'altra
// (es. "Descrivi" non deve far scattare il diario).
const WRITE_PATTERN = /\b(scrivi|annota)\b/i;

// Task in cui la persona potrebbe non sapere cosa fare: l'app offre subito un'idea pronta
// (vedi ideaLibrary.ts, un gruppo di idee per ogni tipo di task).
export const getIdeaCategory = (taskText: string) =>
  IDEA_CATEGORIES.find(c => c.pattern.test(taskText)) || null;

export const getTaskInteractionType = (taskText: string): TaskInteractionType => {
  if (WRITE_PATTERN.test(taskText)) return 'write';
  if (getIdeaCategory(taskText)) return 'idea';
  return null;
};

export const getResourceKind = (taskText: string): IdeaKind => {
  return getIdeaCategory(taskText)?.kind || 'read';
};

export const getIdeaTitle = (taskText: string): string => {
  return getIdeaCategory(taskText)?.title || "Un'idea per te";
};

// Idea numero `index` per questo task (cicla sulle idee disponibili). L'indice parte dal
// giorno del piano e sale con "un'altra idea", cosi' non si ripete nello stesso mese.
export const getIdea = (taskText: string, area: string, index: number): Idea => {
  const category = getIdeaCategory(taskText);
  const pool = category ? IDEAS[category.key] : null;
  if (pool && pool.length > 0) {
    return pool[((index % pool.length) + pool.length) % pool.length];
  }
  const fallback = getCuratedResource(area, index);
  return { text: fallback.passage, pointer: fallback.pointer };
};

export interface CuratedResource {
  passage: string; // pronto da leggere subito, soddisfa il task senza uscire dall'app
  pointer?: string; // fonte reale e verificabile, solo quando siamo sicuri che esista con questo nome
}

// Passaggi originali (non citazioni), nello spirito del lavoro pubblico degli esperti gia'
// scelti per la sintesi settimanale (vedi EXPERTS in pianoPlan.ts) - stessa cautela: mai
// citazioni testuali, mai titoli di episodi specifici che potremmo indovinare male.
export const CURATED_RESOURCES: { [area: string]: CuratedResource[] } = {
  energia: [
    { passage: "La luce naturale dei primi minuti dopo il risveglio è il segnale più forte per il tuo corpo: vale più di qualsiasi caffè per impostare l'energia della giornata.", pointer: 'Podcast "Huberman Lab" di Andrew Huberman' },
    { passage: "L'energia non è una quantità fissa che si esaurisce: è più simile a un ritmo. Piccole pause regolari la mantengono più di uno sforzo continuo senza soste." },
  ],
  sonno: [
    { passage: "Il sonno non è tempo perso: è il momento in cui il corpo consolida la memoria e ripara i tessuti. Dormire bene stanotte è già un investimento su come starai domani.", pointer: 'Libro "Why We Sleep" di Matthew Walker' },
    { passage: "Andare a letto e svegliarsi sempre alla stessa ora, anche nel weekend, aiuta il corpo più di qualsiasi altra abitudine legata al sonno." },
    { passage: "Una stanza fresca e buia manda al cervello lo stesso segnale della notte: è il momento di rallentare." },
  ],
  stress: [
    { passage: "Il cuore che batte forte prima di una sfida non è un segnale di pericolo: è il corpo che si prepara a dare il meglio. Vederlo così ne cambia davvero l'effetto.", pointer: 'TED Talk "How to Make Stress Your Friend" di Kelly McGonigal' },
    { passage: "Se qualcosa ti crea tensione, spesso è perché conta davvero per te. Lo stress, visto così, è anche una bussola." },
  ],
  movimento: [
    { passage: "Non serve un allenamento perfetto: una camminata a ritmo in cui riesci ancora a parlare, fatta con costanza, conta più di uno sforzo intenso ma sporadico.", pointer: 'Podcast "The Drive" di Peter Attia' },
    { passage: "Il corpo è fatto per muoversi un po' per volta durante il giorno, non solo per un'ora in palestra: alzarsi ogni tanto conta più di quanto pensi." },
  ],
  alimentazione: [
    { passage: "Non esiste un solo cibo miracoloso: la varietà di ciò che mangi, settimana dopo settimana, conta più della singola scelta di oggi." },
    { passage: "Mangiare con calma, senza distrazioni, cambia il modo in cui il corpo riconosce fame e sazietà - non solo cosa mangi, ma come." },
  ],
  pelle: [
    { passage: "La pelle riflette tutto il corpo: sonno, stress e alimentazione contano quanto la crema che applichi. Prendersene cura è prendersi cura di te nell'insieme." },
    { passage: "Bere a sufficienza e proteggerti dal sole restano, tra tutte le abitudini, quelle con l'effetto più duraturo sulla pelle nel tempo." },
  ],
  equilibrio_mentale: [
    { passage: "Non serve trovare altro tempo: basta portare piena attenzione a qualcosa che già fai oggi, come bere un caffè senza pensare ad altro.", pointer: 'Libro "Wherever You Go, There You Are" di Jon Kabat-Zinn' },
    { passage: "La mindfulness non è svuotare la mente: è notare cosa succede in questo momento, senza doverlo giudicare o cambiare subito." },
    { passage: "Anche un solo minuto concentrato sul respiro è già una pratica completa, non un'anticipazione di qualcosa di più lungo." },
  ],
};

// Ciclano per non ripetere sempre lo stesso passaggio nello stesso piano di 30 giorni.
export const getCuratedResource = (area: string, seed: number): CuratedResource => {
  const pool = CURATED_RESOURCES[area] || CURATED_RESOURCES['equilibrio_mentale'];
  return pool[((seed % pool.length) + pool.length) % pool.length];
};
