import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../src/contexts/AppContext';
import ProfileFields from '../../src/components/ProfileFields';
import PrivacyConsent from '../../src/components/PrivacyConsent';
import { useI18n } from '../../src/i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AuthScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { setUser, setIsGuest, setUserProfile, setScreeningResult, setHasCompletedOnboarding } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    // Messaggio a schermo e non Alert.alert: su web Alert.alert non mostra nulla
    setError(null);
    if (!email || !password) {
      setError(t('auth.errFields'));
      return;
    }
    // Chi crea un account sceglie sempre eta'/genere (anche "preferisco non dirlo" va bene)
    // e accetta la privacy PRIMA che l'account venga creato, non dopo.
    if (!isLogin) {
      if (!ageRange || !gender) {
        setError(t('auth.errProfile'));
        return;
      }
      if (!accepted) {
        setError(t('auth.errPrivacy'));
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body: Record<string, unknown> = { email, password };
      if (!isLogin) {
        body.privacy_accepted = true;
        body.age_range = ageRange;
        body.gender = gender;
      }
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(typeof data.detail === 'string' ? data.detail : t('auth.errGeneric'));
        return;
      }

      await setUser(data);
      await setIsGuest(false);

      if (!isLogin) {
        // Consenso e profilo gia' dati qui: si salta la privacy (Guest-only) e si va
        // direttamente allo screening, senza richiedere di nuovo eta'/genere.
        await setUserProfile({ age_range: ageRange, gender });
        await setHasCompletedOnboarding(true);
        router.replace('/screening/questionnaire');
        return;
      }

      // Login di un account gia' esistente: se ha gia' uno screening non lo rifacciamo mai
      // (su un dispositivo nuovo altrimenti si ritroverebbe a ripartire da zero).
      try {
        const latestRes = await fetch(`${API_URL}/api/screening/latest?user_id=${data.id}`);
        const latest = latestRes.ok ? await latestRes.json() : null;
        if (latest) {
          await setScreeningResult(latest);
          await setHasCompletedOnboarding(true);
          router.replace('/(tabs)/oggi');
          return;
        }
      } catch (latestError) {
        console.error('Error checking existing screening on login:', latestError);
      }
      // Nessuno screening trovato (account creato prima di questa versione, o mai completato):
      // percorso guidato come per un nuovo account.
      router.push('/onboarding/privacy');
    } catch (error) {
      setError(t('auth.errConnect'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    setIsGuest(true);
    setUser(null);
    router.push('/onboarding/privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>{isLogin ? t('auth.login') : t('auth.register')}</Text>

            <View style={styles.form}>
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
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              {!isLogin && (
                <>
                  <ProfileFields
                    ageRange={ageRange}
                    gender={gender}
                    onChangeAgeRange={setAgeRange}
                    onChangeGender={setGender}
                    required
                  />
                  <PrivacyConsent accepted={accepted} onToggle={() => setAccepted(!accepted)} />
                </>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? t('auth.loading') : (isLogin ? t('auth.login') : t('auth.register'))}
                </Text>
              </Pressable>

              <Pressable onPress={() => { setIsLogin(!isLogin); setError(null); }}>
                <Text style={styles.switchText}>
                  {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={styles.guestButton}
              onPress={handleGuest}
            >
              <Text style={styles.guestButtonText}>{t('auth.guest')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#557A6D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  switchText: {
    color: '#557A6D',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  guestButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#557A6D',
  },
  guestButtonText: {
    color: '#557A6D',
    fontSize: 18,
    fontWeight: '600',
  },
});
