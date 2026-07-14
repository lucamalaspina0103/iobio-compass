import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useAppContext();
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) {
      Alert.alert('Attenzione', 'Devi accettare la privacy policy per continuare');
      return;
    }
    setHasCompletedOnboarding(true);
    router.replace('/screening/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy e Consenso</Text>
          
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>I tuoi dati sono al sicuro</Text>
            <Text style={styles.text}>
              • Utilizziamo i tuoi dati solo per fornirti un'esperienza personalizzata
            </Text>
            <Text style={styles.text}>
              • Non condivideremo mai i tuoi dati con terze parti
            </Text>
            <Text style={styles.text}>
              • Puoi eliminare il tuo account in qualsiasi momento
            </Text>
            <Text style={styles.text}>
              • I dati guest sono salvati solo sul tuo dispositivo
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
              Accetto la privacy policy e do il consenso al trattamento dei miei dati
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, !accepted && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!accepted}
          >
            <Text style={styles.buttonText}>Continua</Text>
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
    borderColor: '#7CB342',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7CB342',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7CB342',
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
