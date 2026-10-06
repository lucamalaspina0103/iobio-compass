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
import { useI18n } from '../src/i18n';

const MIN_PASSWORD_LENGTH = 8;

const BENEFIT_KEYS = ['sp.b1', 'sp.b2', 'sp.b3', 'sp.b4'];

export default function SalvaProgressiScreen() {
  const router = useRouter();
  const { t } = useI18n();
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
      setError(t('sp.errEmail'));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('sp.errPwLen', { n: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (!ageRange || !gender) {
      setError(t('auth.errProfile'));
      return;
    }
    if (!accepted) {
      setError(t('auth.errPrivacy'));
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
      setError(e?.message || t('sp.errGeneric'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name="shield-checkmark" size={56} color="#557A6D" />
          </View>
          <Text style={styles.title}>{t('sp.doneTitle')}</Text>
          <Text style={styles.subtitle}>{t('sp.doneText')}</Text>
          <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/oggi')}>
            <Text style={styles.buttonText}>{t('sp.back')}</Text>
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
              <Ionicons name="cloud-upload" size={40} color="#557A6D" />
            </View>
            <Text style={styles.title}>{t('pf.saveTitle')}</Text>
            <Text style={styles.subtitle}>{t('sp.subtitle')}</Text>

            <View style={styles.benefits}>
              {BENEFIT_KEYS.map(key => (
                <View key={key} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#557A6D" />
                  <Text style={styles.benefitText}>{t(key)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('sp.pwPlaceholder', { n: MIN_PASSWORD_LENGTH })}
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
                {loading ? t('sp.saving') : t('notice.guest_late.cta')}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.back()}>
              <Text style={styles.laterText}>{t('notifPrompt.notNow')}</Text>
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
    backgroundColor: '#E4EEEA',
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
    backgroundColor: '#557A6D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  laterText: { color: '#557A6D', textAlign: 'center', marginTop: 16, fontSize: 15 },
  doneWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E4EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
});
