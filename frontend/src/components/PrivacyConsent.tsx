import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyConsentProps {
  accepted: boolean;
  onToggle: () => void;
}

// Checkbox di consenso condivisa tra i punti di registrazione di un account (obbligatoria
// per creare l'account: email, password, eta'/genere se indicati) e l'onboarding Guest
// (obbligatoria per rispondere allo screening).
export default function PrivacyConsent({ accepted, onToggle }: PrivacyConsentProps) {
  return (
    <Pressable style={styles.container} onPress={onToggle}>
      <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
        {accepted && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
      </View>
      <Text style={styles.text}>
        Accetto la privacy policy e do il consenso al trattamento dei miei dati (email, e se
        indicati età e genere) solo per il funzionamento dell'app e per analisi interne, mai
        condivisi con terzi.
      </Text>
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
    borderColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#7CB342' },
  text: { flex: 1, fontSize: 13, color: '#4A4A4A', lineHeight: 19 },
});
