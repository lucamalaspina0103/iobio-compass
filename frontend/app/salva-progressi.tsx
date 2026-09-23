import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../src/contexts/AppContext';
import { registerWithGuestData, cleanupAfterMigration, loadLocalProfile } from '../src/lib/guestMigration';
import ProfileFields from '../src/components/ProfileFields';
import PrivacyConsent from '../src/components/PrivacyConsent';

const MIN_PASSWORD_LENGTH = 8;

const BENEFITS = [
  'Il tuo piano di 30 giorni e le azioni già fatte',
  'Le tue stelle e la serie di giorni',
  'Lo storico dei tuoi screening e le voci del diario',
  'Li ritrovi anche se cambi telefono',
];

export default function SalvaProgressiScreen() {
  const router = useRouter();
  const { setUser, setIsGuest } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Se questo Guest ha gia' risposto al profilo rapido prima dello screening, pre-selezioniamo
  // le stesse scelte invece di chiedergliele due volte.
  useEffect(() => {
    loadLocalProfile().then(profile => {
      if (profile) {
        setAgeRange(profile.age_range);
        setGender(profile.gender);
      }
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`);
      return;
    }
    if (!ageRange || !gender) {
      setError('Scegli una fascia d\'età e un genere (va bene anche "Preferisco non dirlo").');
      return;
    }
    if (!accepted) {
      setError('Devi accettare la privacy policy per continuare.');
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithGuestData(cleanEmail, password, ageRange, gender);
      await cleanupAfterMigration();
      await setUser(user);
      await setIsGuest(false);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || 'Qualcosa è andato storto, riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name="shield-checkmark" size={56} color="#7CB342" />
          </View>
          <Text style={styles.title}>I tuoi progressi sono al sicuro</Text>
          <Text style={styles.subtitle}>
            Piano, stelle e storico sono ora legati al tuo account. Da adesso puoi anche rifare lo
            screening e far crescere il tuo percorso nel tempo.
          </Text>
          <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/oggi')}>
            <Text style={styles.buttonText}>Torna al tuo percorso</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Ionicons name="cloud-upload" size={40} color="#7CB342" />
            </View>
            <Text style={styles.title}>Salva i tuoi progressi</Text>
            <Text style={styles.subtitle}>
              Crea un account gratuito: non perdi niente di quello che hai costruito finora.
            </Text>

            <View style={styles.benefits}>
              {BENEFITS.map(text => (
                <View key={text} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#7CB342" />
                  <Text style={styles.benefitText}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tuaemail@esempio.it"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder={`Almeno ${MIN_PASSWORD_LENGTH} caratteri`}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <ProfileFields
              ageRange={ageRange}
              gender={gender}
              onChangeAgeRange={setAgeRange}
              onChangeGender={setGender}
              required
            />

            <PrivacyConsent accepted={accepted} onToggle={() => setAccepted(!accepted)} />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#C62828" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sto salvando...' : 'Crea account e salva'}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.back()}>
              <Text style={styles.laterText}>Non ora</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  backButton: { padding: 16, alignSelf: 'flex-start' },
  content: { paddingHorizontal: 24 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#4A4A4A', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 23, marginBottom: 20 },
  benefits: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { flex: 1, fontSize: 15, color: '#4A4A4A' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: '#4A4A4A', marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: '#C62828', fontSize: 14, lineHeight: 20 },
  button: {
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  laterText: { color: '#7CB342', textAlign: 'center', marginTop: 16, fontSize: 15 },
  doneWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
});
