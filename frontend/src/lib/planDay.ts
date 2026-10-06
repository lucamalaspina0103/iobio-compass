// Il "giorno del piano" cambia a MEZZANOTTE (ora locale), non 24 ore dopo l'ora esatta in cui
// e' iniziato il piano. Prima contava blocchi di 24 ore dall'avvio: chi iniziava di sera
// vedeva ancora i task di ieri (gia' spuntati) fino alla sera dopo.

const DAY_MS = 24 * 60 * 60 * 1000;

// Mezzanotte locale di quel giorno, espressa in UTC cosi' i cambi dell'ora legale non
// sfalsano il conteggio dei giorni.
const localDayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

// Giorni di calendario trascorsi tra l'inizio del piano e adesso (0 = lo stesso giorno).
export const calendarDaysBetween = (start: Date, now: Date): number =>
  Math.round((localDayNumber(now) - localDayNumber(start)) / DAY_MS);

// Numero del giorno del piano (1 = il giorno in cui e' iniziato), senza tetto a 30.
export const planDayOn = (start: Date, now: Date): number => calendarDaysBetween(start, now) + 1;

// Millisecondi alla prossima mezzanotte locale (per aggiornare l'app quando cambia il giorno).
export const msUntilNextMidnight = (now: Date = new Date()): number => {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return Math.max(1000, next.getTime() - now.getTime());
};
