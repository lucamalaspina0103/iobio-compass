import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../src/contexts/AppContext';
import { I18nProvider } from '../src/i18n';
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
    <I18nProvider>
      <AppProvider>
        {/* L'app ha sempre fondo chiaro: icone di stato scure anche se il telefono e' in modalita' scura */}
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AppProvider>
    </I18nProvider>
  );
}
