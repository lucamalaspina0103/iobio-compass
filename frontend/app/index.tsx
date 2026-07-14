import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAppContext } from '../src/contexts/AppContext';

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { hasCompletedOnboarding, isBootstrapped } = useAppContext();

  useEffect(() => {
    // Wait for router to be ready
    if (!navigationState?.key) return;
    
    // Wait for data to be loaded from AsyncStorage
    if (!isBootstrapped) return;

    // Navigate based on onboarding status
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding/welcome');
    } else {
      router.replace('/(tabs)/oggi');
    }
  }, [navigationState?.key, isBootstrapped, hasCompletedOnboarding]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7CB342" />
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
