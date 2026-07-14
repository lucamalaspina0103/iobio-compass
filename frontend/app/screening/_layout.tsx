import React from 'react';
import { Stack } from 'expo-router';

export default function ScreeningLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="profile" />
      <Stack.Screen name="questionnaire" />
      <Stack.Screen name="results" />
    </Stack>
  );
}
