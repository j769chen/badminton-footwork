import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { configureAudioSession } from '@/cues';
import { Colors } from '@/theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    configureAudioSession().catch(() => {
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Footwork Trainer' }} />
        <Stack.Screen
          name="train"
          options={{ title: 'Session', headerBackTitle: 'Stop' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
