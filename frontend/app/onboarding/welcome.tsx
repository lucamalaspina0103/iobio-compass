import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/images/logo-app.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="IOBIO"
            />
          </View>

          <Text style={styles.title}>Compass</Text>
          <Text style={styles.subtitle}>Benessere Olistico</Text>
          
          <View style={styles.card}>
            <Text style={styles.disclaimerTitle}>Benvenuto!</Text>
            <Text style={styles.disclaimer}>
              IOBIO Compass è uno strumento di screening per il benessere olistico.
            </Text>
            <Text style={styles.disclaimer}>
              Questo strumento non sostituisce diagnosi o pareri medici professionali.
            </Text>
            <Text style={styles.disclaimer}>
              Per qualsiasi dubbio sulla tua salute, consulta sempre un medico qualificato.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/onboarding/auth')}
          >
            <Text style={styles.buttonText}>Inizia</Text>
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 200,
    height: 257,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#557A6D',
    textAlign: 'center',
    marginBottom: 32,
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
  disclaimerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#557A6D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
