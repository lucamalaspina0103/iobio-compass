// Collegamento tra il motore delle notifiche (reengagement.ts) e il telefono: permesso,
// programmazione delle notifiche locali e tocco sulla notifica. Sul sito web non fa nulla
// (le notifiche arrivano con l'app per telefono). Ogni funzione e' a prova di errore: una
// notifica che non parte non deve mai rompere l'app.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadNotificationSettings } from './notificationSettings';
import { t } from '../i18n/core';
import {
  EngineSnapshot,
  EngineState,
  EMPTY_ENGINE_STATE,
  planNotifications,
} from './reengagement';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const SNAPSHOT_KEY = 'notif_engine_snapshot';
const STATE_KEY = 'notif_engine_state';
const PROMPT_KEY = 'notif_prompt_state';
const PROMPT_RETRY_DAYS = 14; // dopo un "non ora" non richiediamo per due settimane
const CHANNEL_ID = 'default';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

// Caricamento "pigro": il modulo nativo esiste solo sul telefono.
const getModule = (): any | null => {
  if (!notificationsSupported) return null;
  try {
    return require('expo-notifications');
  } catch (error) {
    console.error('expo-notifications non disponibile:', error);
    return null;
  }
};

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error('Error reading', key, error);
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing', key, error);
  }
};

// ===== Permesso =====

export const getPermissionState = async (): Promise<PermissionState> => {
  const N = getModule();
  if (!N) return 'unsupported';
  try {
    const res = await N.getPermissionsAsync();
    if (res.granted || res.status === 'granted') return 'granted';
    if (res.status === 'denied') return 'denied';
    return 'undetermined';
  } catch (error) {
    console.error('Error reading notification permission:', error);
    return 'undetermined';
  }
};

export const requestPermission = async (): Promise<boolean> => {
  const N = getModule();
  if (!N) return false;
  try {
    const res = await N.requestPermissionsAsync();
    return !!(res.granted || res.status === 'granted');
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// ===== Programmazione =====

export const saveSnapshot = async (snapshot: EngineSnapshot): Promise<void> =>
  writeJson(SNAPSHOT_KEY, snapshot);

export const loadSnapshot = async (): Promise<EngineSnapshot | null> =>
  readJson<EngineSnapshot | null>(SNAPSHOT_KEY, null);

// Ricalcola e riprogramma tutto: si chiama ad ogni apertura, a ogni giornata completata e
// a ogni cambio di preferenze. Prima cancella le notifiche gia' programmate, cosi' non
// restano mai promemoria vecchi (es. quello di oggi se hai gia' fatto la tua parte).
export const syncNotifications = async (): Promise<void> => {
  const N = getModule();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();

    const permission = await getPermissionState();
    if (permission !== 'granted') return;

    const settings = await loadNotificationSettings();
    const snapshot = await loadSnapshot();
    const state = await readJson<EngineState>(STATE_KEY, EMPTY_ENGINE_STATE);
    const { notifications, state: nextState } = planNotifications({
      now: new Date(),
      settings,
      snapshot,
      state,
    });
    if (notifications.length === 0) {
      await writeJson(STATE_KEY, nextState);
      return;
    }

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: t('notif.channel'),
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    for (const n of notifications) {
      await N.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, data: { route: n.route } },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: n.fireAt,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
    }
    await writeJson(STATE_KEY, nextState);
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
};

// ===== Tocco sulla notifica =====

// Mostra le notifiche anche con l'app aperta e porta alla schermata giusta quando le tocchi.
// Restituisce la funzione per smettere di ascoltare.
export const configureNotificationHandling = (openRoute: (route: string) => void): (() => void) => {
  const N = getModule();
  if (!N) return () => {};
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    const routeOf = (response: any): string | null => {
      const route = response?.notification?.request?.content?.data?.route;
      return typeof route === 'string' && route.startsWith('/') ? route : null;
    };

    const subscription = N.addNotificationResponseReceivedListener((response: any) => {
      const route = routeOf(response);
      if (route) openRoute(route);
    });

    // App aperta toccando una notifica a app chiusa
    try {
      const last = N.getLastNotificationResponse ? N.getLastNotificationResponse() : null;
      const route = routeOf(last);
      if (route) openRoute(route);
    } catch (error) {
      console.error('Error reading last notification response:', error);
    }

    return () => subscription?.remove?.();
  } catch (error) {
    console.error('Error configuring notification handling:', error);
    return () => {};
  }
};

// ===== Quando chiedere il permesso =====

interface PromptState {
  declinedAt: string | null;
}

// Si chiede dopo la prima giornata riuscita (la persona ha gia' visto il valore), mai prima,
// e dopo un "non ora" non si richiede per due settimane.
export const shouldAskPermission = async (hasSucceededDay: boolean): Promise<boolean> => {
  if (!notificationsSupported || !hasSucceededDay) return false;
  const settings = await loadNotificationSettings();
  if (!settings.enabled) return false;
  if ((await getPermissionState()) !== 'undetermined') return false;
  const prompt = await readJson<PromptState>(PROMPT_KEY, { declinedAt: null });
  if (prompt.declinedAt) {
    const days = (Date.now() - new Date(prompt.declinedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days < PROMPT_RETRY_DAYS) return false;
  }
  return true;
};

export const rememberPromptDeclined = async (): Promise<void> =>
  writeJson(PROMPT_KEY, { declinedAt: new Date().toISOString() } as PromptState);
