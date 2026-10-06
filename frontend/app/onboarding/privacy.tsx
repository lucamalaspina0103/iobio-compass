import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import { useI18n } from '../../src/i18n';

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { setHasCompletedOnboarding } = useAppContext();
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) {
      Alert.alert(t('privacy.attention'), t('auth.errPrivacy'));
      return;
    }
    setHasCompletedOnboarding(true);
    router.replace('/screening/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('privacy.title')}</Text>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('privacy.safeTitle')}</Text>
            <Text style={styles.text}>
              {'• ' + t('privacy.b1')}
            </Text>
            <Text style={styles.text}>
              {'• ' + t('privacy.b2')}
            </Text>
            <Text style={styles.text}>
              {'• ' + t('privacy.b3')}
            </Text>
            <Text style={styles.text}>
              {'• ' + t('privacy.b4')}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAccepted(!accepted)}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxText}>
              {t('privacy.accept')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, !accepted && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!accepted}
          >
            <Text style={styles.buttonText}>{t('common.continue')}</Text>
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
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#557A6D',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#557A6D',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#557A6D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
