import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useMemo } from 'react';

const beepSource = require('../assets/sounds/beep.wav');
const completeSource = require('../assets/sounds/complete.wav');

export type CueMode = 'beep' | 'voice' | 'off';

export const CUE_MODE_LABELS: Record<CueMode, string> = {
  beep: 'Beep',
  voice: 'Voice',
  off: 'Off',
};

export type CuePreferences = {
  mode: CueMode;
  haptic: boolean;
};

const SPEECH_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  rate: 1.1,
};

export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
}

function fireCue(player: AudioPlayer) {
  try {
    void Promise.resolve(player.seekTo(0)).catch(() => {});
    player.play();
  } catch {
  }
}

function say(text: string) {
  try {
    void Speech.stop().catch(() => {});
    Speech.speak(text, SPEECH_OPTIONS);
  } catch {
  }
}

function vibrate(style: Haptics.ImpactFeedbackStyle) {
  try {
    void Haptics.impactAsync(style).catch(() => {});
  } catch {
  }
}

export type Cues = {
  announceCountdown: (prefs: CuePreferences, secondsLeft: number) => void;
  announceSwitch: (prefs: CuePreferences, cornerNumber: number) => void;
  announceComplete: (prefs: CuePreferences) => void;
};

export function useCues(): Cues {
  const switchPlayer = useAudioPlayer(beepSource);
  const completePlayer = useAudioPlayer(completeSource);

  return useMemo(
    () => ({
      announceCountdown: ({ mode, haptic }, secondsLeft) => {
        if (mode === 'beep') fireCue(switchPlayer);
        else if (mode === 'voice') say(String(secondsLeft));
        if (haptic) vibrate(Haptics.ImpactFeedbackStyle.Light);
      },
      announceSwitch: ({ mode, haptic }, cornerNumber) => {
        if (mode === 'beep') fireCue(switchPlayer);
        else if (mode === 'voice') say(String(cornerNumber));
        if (haptic) vibrate(Haptics.ImpactFeedbackStyle.Medium);
      },
      announceComplete: ({ mode, haptic }) => {
        if (mode === 'beep') fireCue(completePlayer);
        else if (mode === 'voice') say('Session complete');
        if (haptic) vibrate(Haptics.ImpactFeedbackStyle.Heavy);
      },
    }),
    [switchPlayer, completePlayer],
  );
}
