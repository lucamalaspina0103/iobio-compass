import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAppContext } from '../src/contexts/AppContext';
import { useI18n } from '../src/i18n';

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { hasCompletedOnboarding, isBootstrapped } = useAppContext();
  const { ready: i18nReady, languageChosen } = useI18n();

  useEffect(() => {
    // Wait for router to be ready
    if (!navigationState?.key) return;

    // Wait for data (and the saved language) to be loaded from AsyncStorage
    if (!isBootstrapped || !i18nReady) return;

    // Navigate based on onboarding status
    if (!hasCompletedOnboarding) {
      router.replace(languageChosen ? '/onboarding/welcome' : '/onboarding/language');
    } else {
      router.replace('/(tabs)/oggi');
    }
  }, [navigationState?.key, isBootstrapped, i18nReady, hasCompletedOnboarding, languageChosen]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#557A6D" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
