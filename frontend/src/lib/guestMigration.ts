// "Salva i tuoi progressi": un Guest crea un account dall'interno dell'app e porta con se'
// tutto quello che ha costruito sul dispositivo (storico screening, piano con le spunte,
// data di inizio, cassaforte stelle). Il trasferimento avviene lato server nella stessa
// richiesta di registrazione, cosi' o va tutto a buon fine o non resta nulla a meta'.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PIANO_START_DATE_KEY, PIANO_TASKS_KEY } from './pianoPlan';
import { loadLocalScreeningHistory } from './screeningHistory';
import { loadLocalRawTasks, loadLocalVault } from './rescreen';
import { loadLocalDiary, DIARY_KEY } from './diary';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STARS_VAULT_KEY = 'stars_vault';

export interface RegisteredUser {
  id: string;
  email: string;
}

// Profilo eventualmente gia' scelto in precedenza (screening/profile.tsx), usato per
// pre-selezionare le stesse risposte quando questo Guest ora salva i progressi.
export const loadLocalProfile = async (): Promise<{ age_range: string; gender: string } | null> => {
  try {
    const saved = await AsyncStorage.getItem('iobio_user_profile');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading local profile:', error);
    return null;
  }
};

export const buildGuestData = async () => {
  const history = await loadLocalScreeningHistory();
  const screenings = history.map(s => ({
    indice_iobio: s.indice_iobio,
    area_scores: s.area_scores,
    weak_areas: s.weak_areas,
    date: s.date,
  }));

  // L'ultimo risultato potrebbe non essere nello storico (screening fatti prima che lo
  // storico esistesse): lo aggiungiamo se manca.
  try {
    const savedLatest = await AsyncStorage.getItem('screeningResult');
    if (savedLatest) {
      const latest = JSON.parse(savedLatest);
      const alreadyThere = history.some(s => s.id === latest.id || s.date === latest.date);
      if (!alreadyThere) {
        screenings.push({
          indice_iobio: latest.indice_iobio,
          area_scores: latest.area_scores,
          weak_areas: latest.weak_areas,
          date: latest.date,
        });
      }
    }
  } catch (error) {
    console.error('Error reading latest screening for migration:', error);
  }

  const tasks = (await loadLocalRawTasks()).map(t => ({
    day: t.day,
    task: t.task,
    area: t.area,
    completed: t.completed,
    optional: t.optional,
  }));

  const vault = await loadLocalVault();
  const startDate = await AsyncStorage.getItem(PIANO_START_DATE_KEY);

  const diary = (await loadLocalDiary()).map(d => ({
    text: d.text,
    area: d.area,
    task_id: d.task_id,
    date: d.date,
  }));

  return {
    screenings,
    tasks,
    start_date: startDate,
    banked_stars: vault.banked,
    cycles: vault.cycles,
    diary,
  };
};

// Registra l'account portando i dati del Guest. Lancia un Error con un messaggio gia'
// leggibile dall'utente se qualcosa non va.
export const registerWithGuestData = async (
  email: string,
  password: string,
  ageRange: string,
  gender: string
): Promise<RegisteredUser> => {
  const guestData = await buildGuestData();

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        privacy_accepted: true,
        age_range: ageRange,
        gender,
        guest_data: guestData,
      }),
    });
  } catch (error) {
    throw new Error('Non riesco a collegarmi al server. Controlla la connessione e riprova.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null;
    // Errori di validazione (es. email non valida) arrivano come lista: messaggio semplice
    throw new Error(detail || 'Controlla che l\'email sia scritta correttamente e riprova.');
  }
  return data as RegisteredUser;
};

// Dopo il trasferimento i dati vivono sul server: togliamo le copie locali del piano e
// della cassaforte, che altrimenti resterebbero orfane (l'app registrata legge dal server).
export const cleanupAfterMigration = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([PIANO_TASKS_KEY, STARS_VAULT_KEY, DIARY_KEY]);
  } catch (error) {
    console.error('Error cleaning local data after migration:', error);
  }
};
