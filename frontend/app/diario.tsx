import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppContext } from '../src/contexts/AppContext';
import {
  DiaryEntry,
  loadLocalDiary,
  addLocalDiaryEntry,
  updateLocalDiaryEntry,
  deleteLocalDiaryEntry,
  fetchBackendDiary,
  addBackendDiaryEntry,
  updateBackendDiaryEntry,
  deleteBackendDiaryEntry,
} from '../src/lib/diary';
import { getAreaInfo } from '../src/lib/pianoPlan';
import DiaryEntryModal from '../src/components/DiaryEntryModal';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

export default function DiarioScreen() {
  const router = useRouter();
  const { user, isGuest, isBootstrapped } = useAppContext();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const isGuestMode = isGuest || !user?.id;

  const loadEntries = useCallback(async () => {
    try {
      const data = isGuestMode ? await loadLocalDiary() : await fetchBackendDiary(user!.id);
      setEntries(data);
    } catch (error) {
      console.error('Error loading diary:', error);
    } finally {
      setLoading(false);
    }
  }, [isGuestMode, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!isBootstrapped) return;
      loadEntries();
    }, [isBootstrapped, loadEntries])
  );

  const handleAdd = async (text: string) => {
    try {
      if (isGuestMode) {
        await addLocalDiaryEntry(text);
      } else {
        await addBackendDiaryEntry(user!.id, text);
      }
      setAdding(false);
      loadEntries();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare la voce');
    }
  };

  const handleUpdate = async (text: string) => {
    if (!editing) return;
    try {
      if (isGuestMode) {
        await updateLocalDiaryEntry(editing.id, text);
      } else {
        await updateBackendDiaryEntry(editing.id, text);
      }
      setEditing(null);
      loadEntries();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile aggiornare la voce');
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      if (isGuestMode) {
        await deleteLocalDiaryEntry(editing.id);
      } else {
        await deleteBackendDiaryEntry(editing.id);
      }
      setEditing(null);
      loadEntries();
    } catch (error) {
      Alert.alert('Errore', 'Impossibile eliminare la voce');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
        </Pressable>
        <Text style={styles.headerTitle}>Il tuo diario</Text>
        <Pressable onPress={() => setAdding(true)} style={styles.addButton}>
          <Ionicons name="add" size={26} color="#7CB342" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7CB342" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Il diario è vuoto</Text>
              <Text style={styles.emptyText}>
                Le tue riflessioni dai task del piano (o quelle scritte liberamente) appariranno qui.
              </Text>
              <Pressable style={styles.emptyButton} onPress={() => setAdding(true)}>
                <Text style={styles.emptyButtonText}>Scrivi la prima voce</Text>
              </Pressable>
            </View>
          ) : (
            entries.map(entry => {
              const info = entry.area ? getAreaInfo(entry.area) : null;
              return (
                <Pressable key={entry.id} style={styles.entryCard} onPress={() => setEditing(entry)}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    {info && (
                      <View style={[styles.areaTag, { backgroundColor: info.color + '20' }]}>
                        <Text style={[styles.areaTagText, { color: info.color }]}>{info.name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.entryText} numberOfLines={4}>{entry.text}</Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <DiaryEntryModal
        visible={adding}
        onSave={handleAdd}
        onCancel={() => setAdding(false)}
      />

      <DiaryEntryModal
        visible={!!editing}
        initialText={editing?.text}
        onSave={handleUpdate}
        onCancel={() => setEditing(null)}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: { padding: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#4A4A4A', textAlign: 'center' },
  addButton: { padding: 12 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4A4A4A', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyButton: { backgroundColor: '#7CB342', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  entryDate: { fontSize: 12, color: '#999', textTransform: 'capitalize' },
  areaTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  areaTagText: { fontSize: 11, fontWeight: '600' },
  entryText: { fontSize: 15, color: '#4A4A4A', lineHeight: 21 },
});
