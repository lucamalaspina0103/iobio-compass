// Preferenze sulle notifiche. Filosofia (vedi proposta "notifiche gentili"): poche, mai
// pressanti, tutte sotto il controllo della persona. Le preferenze vivono sul dispositivo e
// saranno lette dal motore di promemoria quando le notifiche locali saranno attive.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIFICATION_SETTINGS_KEY = 'iobio_notification_settings';

export interface NotificationSettings {
  enabled: boolean; // interruttore generale
  dailyMoment: boolean; // "Il tuo momento": un promemoria al giorno, solo se non hai ancora fatto la tua parte
  reminderTime: string; // 'HH:MM'
  comeback: boolean; // "Ti aspetto, senza fretta": pochi richiami se manchi per giorni, poi silenzio
  milestones: boolean; // "Momenti importanti": riepilogo settimanale, traguardi, fine ciclo (max 1 a settimana)
  pausedUntil: string | null; // ISO: notifiche in pausa fino a questa data
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyMoment: true,
  reminderTime: '09:00',
  comeback: true,
  milestones: true,
  pausedUntil: null,
};

export const REMINDER_TIME_OPTIONS = [
  { value: '08:00', label: '8:00' },
  { value: '09:00', label: '9:00' },
  { value: '13:00', label: '13:00' },
  { value: '17:00', label: '17:00' },
  { value: '20:00', label: '20:00' },
];

export const PAUSE_DAYS = 7;

// Legge solo i campi conosciuti: le vecchie preferenze (quattro interruttori che non
// facevano nulla) vengono ignorate senza errori.
export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(stored);
    const merged = { ...DEFAULT_NOTIFICATION_SETTINGS };
    (Object.keys(DEFAULT_NOTIFICATION_SETTINGS) as (keyof NotificationSettings)[]).forEach(key => {
      if (parsed[key] !== undefined && typeof parsed[key] === typeof DEFAULT_NOTIFICATION_SETTINGS[key]) {
        (merged as any)[key] = parsed[key];
      }
    });
    if (typeof parsed.pausedUntil === 'string') merged.pausedUntil = parsed.pausedUntil;
    return merged;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const saveNotificationSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
};

export const isPaused = (settings: NotificationSettings, now: Date = new Date()): boolean =>
  !!settings.pausedUntil && new Date(settings.pausedUntil).getTime() > now.getTime();
