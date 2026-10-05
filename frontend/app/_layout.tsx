import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { AppProvider } from '../src/contexts/AppContext';
import { configureNotificationHandling } from '../src/lib/notificationsNative';

export default function RootLayout() {
  // Toccando una notifica si apre la schermata giusta (sul sito web non fa nulla)
  useEffect(() => {
    return configureNotificationHandling(route => {
      setTimeout(() => {
        try {
          router.push(route as any);
        } catch (error) {
          console.error('Error opening notification route:', error);
        }
      }, 400);
    });
  }, []);

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProvider>
  );
}
