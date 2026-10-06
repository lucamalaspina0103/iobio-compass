import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES, useI18n } from '../../src/i18n';

// Prima schermata: si sceglie la lingua. Quella del telefono e' gia' selezionata.
export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/images/logo-app.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="IOBIO"
          />
          <Text style={styles.claim}>{t('brand.claim')}</Text>

          <Text style={styles.title}>{t('language.title')}</Text>
          <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

          <View style={styles.list}>
            {LANGUAGES.map(l => {
              const selected = l.code === language;
              return (
                <Pressable
                  key={l.code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => setLanguage(l.code)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{l.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={22} color="#557A6D" />}
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.button} onPress={() => router.replace('/onboarding/welcome')}>
            <Text style={styles.buttonText}>{t('language.continue')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { width: 150, height: 193, alignSelf: 'center' },
  claim: { fontSize: 16, fontWeight: '600', color: '#4A4A4A', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#4A4A4A', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  list: { marginBottom: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionSelected: { borderColor: '#557A6D', backgroundColor: '#EEF4F1' },
  optionText: { fontSize: 17, color: '#4A4A4A' },
  optionTextSelected: { fontWeight: '600', color: '#3F5E52' },
  button: { backgroundColor: '#557A6D', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
});
