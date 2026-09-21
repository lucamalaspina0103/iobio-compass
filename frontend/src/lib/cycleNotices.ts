// Avvisi legati al momento del percorso (mai bloccanti, mai distruttivi: il piano in corso
// non viene mai toccato):
//  - Guest dal giorno 7: invito discreto a salvare i progressi con un account
//  - Guest dai giorni 25-30: invito piu' netto, il ciclo successivo richiede un account
//  - Ciclo finito (oltre 30 giorni): Guest -> serve l'account per continuare;
//    registrato -> invito a rifare lo screening per aprire il ciclo successivo

import AsyncStorage from '@react-native-async-storage/async-storage';

export type CycleNoticeKind = 'guest_mid' | 'guest_late' | 'guest_ended' | 'registered_ended';

const DISMISSED_KEY = 'cycle_notice_dismissed';

interface Dismissed {
  kind: CycleNoticeKind;
  date: string; // YYYY-MM-DD
}

export const GUEST_MID_DAY = 7;
export const GUEST_LATE_DAY = 25;

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const loadDismissed = async (): Promise<Dismissed[]> => {
  try {
    const saved = await AsyncStorage.getItem(DISMISSED_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading dismissed notices:', error);
    return [];
  }
};

export const dismissNotice = async (kind: CycleNoticeKind): Promise<Dismissed[]> => {
  const updated = [...(await loadDismissed()).filter(d => d.kind !== kind), { kind, date: todayStr() }];
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving dismissed notice:', error);
  }
  return updated;
};

// Nuovo ciclo: gli avvisi ripartono da capo.
export const resetDismissed = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DISMISSED_KEY);
  } catch (error) {
    console.error('Error resetting dismissed notices:', error);
  }
};

export const getCycleNotice = (
  isGuest: boolean,
  currentDay: number,
  elapsedDays: number | null,
  dismissed: Dismissed[]
): CycleNoticeKind | null => {
  const ended = elapsedDays !== null && elapsedDays > 30;
  if (ended) return isGuest ? 'guest_ended' : 'registered_ended';
  if (!isGuest) return null;

  if (currentDay >= GUEST_LATE_DAY) {
    // Si puo' rimandare, ma ricompare il giorno dopo
    const seenToday = dismissed.some(d => d.kind === 'guest_late' && d.date === todayStr());
    return seenToday ? null : 'guest_late';
  }
  if (currentDay >= GUEST_MID_DAY) {
    // Invito discreto: una volta chiuso non ricompare
    return dismissed.some(d => d.kind === 'guest_mid') ? null : 'guest_mid';
  }
  return null;
};

export interface NoticeCopy {
  title: string;
  text: string;
  cta: string;
  dismissLabel?: string; // assente = non si puo' chiudere
  icon: string;
  tone: 'soft' | 'strong';
}

export const getNoticeCopy = (kind: CycleNoticeKind, currentDay: number): NoticeCopy => {
  switch (kind) {
    case 'guest_mid':
      return {
        title: 'Stai costruendo qualcosa di tuo',
        text: `Sei al giorno ${currentDay}: piano, stelle e storico sono salvati solo su questo dispositivo. Con un account gratuito non li perdi mai.`,
        cta: 'Salva i progressi',
        dismissLabel: 'Più tardi',
        icon: 'shield-checkmark',
        tone: 'soft',
      };
    case 'guest_late':
      return {
        title: 'Il tuo primo mese sta per finire',
        text: 'Per iniziare il ciclo successivo e tenere al sicuro le tue stelle serve un account gratuito. Il piano in corso resta tuo fino all\'ultimo giorno.',
        cta: 'Crea account e salva',
        dismissLabel: 'Ricordamelo domani',
        icon: 'hourglass',
        tone: 'strong',
      };
    case 'guest_ended':
      return {
        title: 'Hai completato il tuo primo mese!',
        text: 'Per iniziare il ciclo successivo e tenere al sicuro le stelle guadagnate, crea un account gratuito: porti con te tutto il percorso.',
        cta: 'Crea account e salva',
        icon: 'ribbon',
        tone: 'strong',
      };
    case 'registered_ended':
      return {
        title: 'Hai completato i 30 giorni!',
        text: 'Rifai lo screening per iniziare il prossimo ciclo: le tue stelle restano tue e il piano si aggiorna sulle tue nuove aree.',
        cta: 'Rifai lo screening',
        icon: 'ribbon',
        tone: 'strong',
      };
  }
};
