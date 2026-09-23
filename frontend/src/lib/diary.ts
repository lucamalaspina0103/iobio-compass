// Diario personale: scrittura libera o agganciata a un task del piano (es. "Scrivi 3 cose
// positive"). Stesso schema di storage usato per il resto dell'app: locale per i Guest
// (mai sul server, migrato con "Salva i tuoi progressi"), sul server per i registrati.

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
export const DIARY_KEY = 'diary_entries';

export interface DiaryEntry {
  id: string;
  text: string;
  area?: string | null;
  task_id?: string | null;
  date: string; // ISO 8601
}

const newId = () => `diary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ===== Guest: locale =====

export const loadLocalDiary = async (): Promise<DiaryEntry[]> => {
  try {
    const saved = await AsyncStorage.getItem(DIARY_KEY);
    const entries: DiaryEntry[] = saved ? JSON.parse(saved) : [];
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error loading local diary:', error);
    return [];
  }
};

const saveLocalDiaryList = async (entries: DiaryEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving local diary:', error);
  }
};

export const addLocalDiaryEntry = async (
  text: string,
  area?: string | null,
  taskId?: string | null
): Promise<DiaryEntry> => {
  const entry: DiaryEntry = { id: newId(), text, area, task_id: taskId, date: new Date().toISOString() };
  const existing = await loadLocalDiary();
  await saveLocalDiaryList([entry, ...existing]);
  return entry;
};

export const updateLocalDiaryEntry = async (id: string, text: string): Promise<void> => {
  const existing = await loadLocalDiary();
  await saveLocalDiaryList(existing.map(e => (e.id === id ? { ...e, text } : e)));
};

export const deleteLocalDiaryEntry = async (id: string): Promise<void> => {
  const existing = await loadLocalDiary();
  await saveLocalDiaryList(existing.filter(e => e.id !== id));
};

// ===== Registrati: server =====

export const fetchBackendDiary = async (userId: string): Promise<DiaryEntry[]> => {
  const response = await fetch(`${API_URL}/api/diary/list?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error('Impossibile caricare il diario dal server');
  return response.json();
};

export const addBackendDiaryEntry = async (
  userId: string,
  text: string,
  area?: string | null,
  taskId?: string | null
): Promise<DiaryEntry> => {
  const response = await fetch(`${API_URL}/api/diary/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, text, area, task_id: taskId }),
  });
  if (!response.ok) throw new Error('Impossibile salvare la voce di diario');
  return response.json();
};

export const updateBackendDiaryEntry = async (entryId: string, text: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/diary/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry_id: entryId, text }),
  });
  if (!response.ok) throw new Error('Impossibile aggiornare la voce di diario');
};

export const deleteBackendDiaryEntry = async (entryId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/diary/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Impossibile eliminare la voce di diario');
};
