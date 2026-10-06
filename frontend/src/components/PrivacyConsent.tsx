import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';

interface PrivacyConsentProps {
  accepted: boolean;
  onToggle: () => void;
}

// Checkbox di consenso condivisa tra i punti di registrazione di un account (obbligatoria
// per creare l'account: email, password, eta'/genere se indicati) e l'onboarding Guest
// (obbligatoria per rispondere allo screening).
export default function PrivacyConsent({ accepted, onToggle }: PrivacyConsentProps) {
  const { t } = useI18n();
  return (
    <Pressable style={styles.container} onPress={onToggle}>
      <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
        {accepted && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
      </View>
      <Text style={styles.text}>{t('consent.text')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#557A6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#557A6D' },
  text: { flex: 1, fontSize: 13, color: '#4A4A4A', lineHeight: 19 },
});
