import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'iobio_privacy_settings';

interface PrivacySettings {
  analytics: boolean;
  personalization: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  analytics: false,
  personalization: true,
};

export default function PrivacyScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch (e) {
        console.error('Error loading privacy settings:', e);
      }
    })();
  }, []);

  const toggle = async (key: keyof PrivacySettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Error saving privacy settings:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={40} color="#7CB342" />
          </View>
          <Text style={styles.heroText}>
            La tua privacy è importante. Controlla come vengono utilizzati i tuoi dati.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Preferenze</Text>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="bar-chart" size={22} color="#7CB342" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Dati anonimi di utilizzo</Text>
            <Text style={styles.cardDesc}>Aiutaci a migliorare l'app con statistiche anonime</Text>
          </View>
          <Switch
            value={settings.analytics}
            onValueChange={() => toggle('analytics')}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={settings.analytics ? '#7CB342' : '#f4f3f4'}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={22} color="#7CB342" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Personalizzazione</Text>
            <Text style={styles.cardDesc}>Consigli su misura in base al tuo screening</Text>
          </View>
          <Switch
            value={settings.personalization}
            onValueChange={() => toggle('personalization')}
            trackColor={{ false: '#E0E0E0', true: '#AED581' }}
            thumbColor={settings.personalization ? '#7CB342' : '#f4f3f4'}
          />
        </View>

        <Text style={styles.sectionTitle}>Come gestiamo i tuoi dati</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoParagraph}>
            • I tuoi dati di screening, check-in e piano sono salvati in modo sicuro e associati solo al tuo account.
          </Text>
          <Text style={styles.infoParagraph}>
            • In modalità Guest i dati restano sul dispositivo e non vengono condivisi.
          </Text>
          <Text style={styles.infoParagraph}>
            • Non vendiamo mai i tuoi dati personali a terze parti.
          </Text>
          <Text style={styles.infoParagraph}>
            • Puoi cancellare tutti i dati in qualsiasi momento dalla schermata Profilo → "Reset app".
          </Text>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="lock-closed" size={20} color="#7CB342" />
          <Text style={styles.noteText}>
            IOBIO Compass è uno strumento di benessere e non sostituisce il parere medico professionale.
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: 24 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroText: { fontSize: 15, color: '#666', lineHeight: 22, textAlign: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoParagraph: { fontSize: 14, color: '#4A4A4A', lineHeight: 22, marginBottom: 10 },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 13, color: '#558B2F', marginLeft: 10, lineHeight: 19 },
});
