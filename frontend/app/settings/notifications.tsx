import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'iobio_notification_settings';

interface NotificationSettings {
  dailyReminder: boolean;
  checkinReminder: boolean;
  pianoReminder: boolean;
  soundSuggestions: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminder: true,
  checkinReminder: true,
  pianoReminder: true,
  soundSuggestions: false,
};

const OPTIONS: { key: keyof NotificationSettings; icon: string; title: string; desc: string }[] = [
  { key: 'dailyReminder', icon: 'sunny', title: 'Promemoria giornaliero', desc: 'Ricevi un promemoria ogni mattina' },
  { key: 'checkinReminder', icon: 'heart', title: 'Promemoria check-in', desc: 'Ti ricordiamo di registrare come stai' },
  { key: 'pianoReminder', icon: 'calendar', title: 'Piano 30 giorni', desc: 'Non perdere le micro-abitudini del giorno' },
  { key: 'soundSuggestions', icon: 'musical-notes', title: 'Suggerimenti Suoni', desc: 'Consigli su sessioni di suoni binaurali' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.error('Error loading notification settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (key: keyof NotificationSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Error saving notification settings:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifiche</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7CB342" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Gestisci quali promemoria vuoi ricevere per mantenere le tue abitudini di benessere.
          </Text>

          {OPTIONS.map((opt) => (
            <View key={opt.key} style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name={opt.icon as any} size={22} color="#7CB342" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{opt.title}</Text>
                <Text style={styles.cardDesc}>{opt.desc}</Text>
              </View>
              <Switch
                value={settings[opt.key]}
                onValueChange={() => toggle(opt.key)}
                trackColor={{ false: '#E0E0E0', true: '#AED581' }}
                thumbColor={settings[opt.key] ? '#7CB342' : '#f4f3f4'}
              />
            </View>
          ))}

          <View style={styles.noteBox}>
            <Ionicons name="information-circle" size={20} color="#F57C00" />
            <Text style={styles.noteText}>
              Le notifiche push richiedono un dispositivo reale e una build dell'app. Le preferenze vengono salvate localmente.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A4A4A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24 },
  intro: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, color: '#4A4A4A', fontWeight: '500' },
  cardDesc: { fontSize: 13, color: '#999', marginTop: 2 },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 13, color: '#8D6E63', marginLeft: 10, lineHeight: 19 },
});
