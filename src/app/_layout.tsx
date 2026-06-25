import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { configureAudioSession } from '@/audio';
import { Colors } from '@/theme';
import React from 'react';

// Anchor every route to the home screen so deep links / page refreshes (e.g.
// landing directly on /settings or /train on web) still render a back button
// to "/" instead of stranding the user with no way home.
export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    // Configure once so cues duck (not stop) any music from Spotify/SoundCloud.
    configureAudioSession().catch(() => {
      // Non-fatal: the app still works visually if the session can't be set.
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
