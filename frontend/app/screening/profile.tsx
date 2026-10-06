import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import { AGE_RANGES, GENDERS } from '../../src/lib/profileOptions';
import { useI18n } from '../../src/i18n';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useI18n();
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
            <Ionicons name="person-circle" size={64} color="#557A6D" />
            <Text style={styles.title}>{t('quickProfile.title')}</Text>
            <Text style={styles.subtitle}>{t('quickProfile.subtitle')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profile.ageLabel') + t('profile.optional')}</Text>
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
                    {t(range.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t('profile.genderLabel') + t('profile.optional')}</Text>
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
                    color={gender === g.value ? '#557A6D' : '#999'}
                  />
                  <Text
                    style={[
                      styles.optionRowText,
                      gender === g.value && styles.optionRowTextSelected,
                    ]}
                  >
                    {t(g.labelKey)}
                  </Text>
                  {gender === g.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#557A6D" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#557A6D" />
            <Text style={styles.infoText}>{t('quickProfile.note')}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>{t('quickProfile.start')}</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>{t('quickProfile.skip')}</Text>
          </TouchableOpacity>

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
    borderColor: '#557A6D',
    backgroundColor: '#E4EEEA',
  },
  optionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#557A6D',
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
    borderColor: '#557A6D',
    backgroundColor: '#E4EEEA',
  },
  optionRowText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  optionRowTextSelected: {
    color: '#557A6D',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E4EEEA',
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
    backgroundColor: '#557A6D',
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
    color: '#557A6D',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
