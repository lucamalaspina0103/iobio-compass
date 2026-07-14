import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';

const AGE_RANGES = [
  { value: '18-24', label: '18-24 anni' },
  { value: '25-34', label: '25-34 anni' },
  { value: '35-44', label: '35-44 anni' },
  { value: '45-54', label: '45-54 anni' },
  { value: '55+', label: '55+ anni' },
  { value: 'preferisco-non-dirlo', label: 'Preferisco non dirlo' },
];

const GENDERS = [
  { value: 'donna', label: 'Donna', icon: 'woman' },
  { value: 'uomo', label: 'Uomo', icon: 'man' },
  { value: 'non-binario', label: 'Non binario/fluido', icon: 'transgender' },
  { value: 'preferisco-non-dirlo', label: 'Preferisco non dirlo', icon: 'help-circle' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { setUserProfile } = useAppContext();
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');

  const handleContinue = () => {
    setUserProfile({
      age_range: ageRange || 'preferisco-non-dirlo',
      gender: gender || 'preferisco-non-dirlo',
    });

    router.push('/screening/questionnaire');
  };

  const handleSkip = () => {
    setUserProfile({
      age_range: 'preferisco-non-dirlo',
      gender: 'preferisco-non-dirlo',
    });

    router.push('/screening/questionnaire');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="person-circle" size={64} color="#7CB342" />
            <Text style={styles.title}>Profilo Rapido</Text>
            <Text style={styles.subtitle}>
              2 domande per personalizzare i tuoi suggerimenti
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Fascia d'età (opzionale)</Text>
            <View style={styles.optionsGrid}>
              {AGE_RANGES.map((range) => (
                <TouchableOpacity
                  key={range.value}
                  style={[
                    styles.option,
                    ageRange === range.value && styles.optionSelected,
                  ]}
                  onPress={() => setAgeRange(range.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      ageRange === range.value && styles.optionTextSelected,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Genere (opzionale)</Text>
            <View style={styles.optionsColumn}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[
                    styles.optionRow,
                    gender === g.value && styles.optionRowSelected,
                  ]}
                  onPress={() => setGender(g.value)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={24}
                    color={gender === g.value ? '#7CB342' : '#999'}
                  />
                  <Text
                    style={[
                      styles.optionRowText,
                      gender === g.value && styles.optionRowTextSelected,
                    ]}
                  >
                    {g.label}
                  </Text>
                  {gender === g.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#7CB342" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#7CB342" />
            <Text style={styles.infoText}>
              Questi dati ci aiutano a personalizzare i suggerimenti. Restano privati e non influenzano il tuo punteggio.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Inizia lo Screening</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Salta per ora</Text>
          </TouchableOpacity>

          <Text style={styles.buildLabel}>Build: PROFILE-001</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  required: {
    color: '#EF5350',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: '47%',
  },
  optionSelected: {
    borderColor: '#7CB342',
    backgroundColor: '#E8F5E9',
  },
  optionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#7CB342',
    fontWeight: '600',
  },
  optionsColumn: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  optionRowSelected: {
    borderColor: '#7CB342',
    backgroundColor: '#E8F5E9',
  },
  optionRowText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  optionRowTextSelected: {
    color: '#7CB342',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  buildLabel: {
    fontSize: 11,
    color: '#7CB342',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
