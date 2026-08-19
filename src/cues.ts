import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useMemo } from 'react';

const beepSource = require('../assets/sounds/beep.wav');
const completeSource = require('../assets/sounds/complete.wav');

/** How a switch is announced: a neutral beep, a spoken corner number, or nothing. */
export type CueMode = 'beep' | 'voice' | 'off';

/** Display labels for each cue mode, shared by the home summary and the picker. */
export const CUE_MODE_LABELS: Record<CueMode, string> = {
  beep: 'Beep',
  voice: 'Voice',
  off: 'Off',
};

/**
 * What the trainer should fire on each switch. Bundled rather than passed as
 * loose flags so adding a cue channel does not widen every call site.
 */
export type CuePreferences = {
  mode: CueMode;
  haptic: boolean;
};

const SPEECH_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  rate: 1.1,
};

/**
 * Configure the global audio session so our short cues coexist with music
 * playing from other apps (Spotify, SoundCloud, Apple Music, ...).
 *
 * `interruptionMode: 'duckOthers'` requests audio focus WITHOUT pausing other
 * apps: their volume briefly ducks while our cue plays, then restores. This is
 * the key requirement - the trainer never stops the user's music. Speech cues
 * ride the same session (expo-speech's `useApplicationAudioSession` defaults to
 * true), so spoken callouts duck music exactly as the beep does.
 */
export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
}

function fireCue(player: AudioPlayer) {
  try {
    // seekTo may return a promise; swallow rejections so a failed rewind
    // can never bubble up as an unhandled rejection mid-session.
    void Promise.resolve(player.seekTo(0)).catch(() => {});
    player.play();
  } catch {
    // A cue failing to play should never interrupt the training session.
  }
}

function say(text: string) {
  try {
    void Speech.stop().catch(() => {});
    Speech.speak(text, SPEECH_OPTIONS);
  } catch {
    // A cue failing to play should never interrupt the training session.
  }
}

function vibrate(style: Haptics.ImpactFeedbackStyle) {
  try {
    void Haptics.impactAsync(style).catch(() => {});
  } catch {
    // Taptic Engine unavailable (low-power mode, camera active, no hardware):
    // a missing buzz should never interrupt the training session.
  }
}

export type Cues = {
  /** Announce a switch to `cornerNumber`. */
  announceSwitch: (prefs: CuePreferences, cornerNumber: number) => void;
  /** Announce the end of the session. */
  announceComplete: (prefs: CuePreferences) => void;
};

/**
 * Provides imperative cue triggers backed by preloaded players. The cue volume
 * is left at the source level; ducking of external music is handled by the OS
 * audio session, not by changing our own volume.
 */
export function useCues(): Cues {
  const switchPlayer = useAudioPlayer(beepSource);
  const completePlayer = useAudioPlayer(completeSource);

  return useMemo(
    () => ({
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
