import { setAudioModeAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';

const beepSource = require('../assets/sounds/beep.wav');
const completeSource = require('../assets/sounds/complete.wav');

/**
 * Configure the global audio session so our short cues coexist with music
 * playing from other apps (Spotify, SoundCloud, Apple Music, ...).
 *
 * `interruptionMode: 'duckOthers'` requests audio focus WITHOUT pausing other
 * apps: their volume briefly ducks while our cue plays, then restores. This is
 * the key requirement - the trainer never stops the user's music.
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

export type Cues = {
  playSwitch: () => void;
  playComplete: () => void;
};

/**
 * Provides imperative cue triggers backed by preloaded players. The cue volume
 * is left at the source level; ducking of external music is handled by the OS
 * audio session, not by changing our own volume.
 */
export function useCues(): Cues {
  const switchPlayer = useAudioPlayer(beepSource);
  const completePlayer = useAudioPlayer(completeSource);

  return {
    playSwitch: () => fireCue(switchPlayer),
    playComplete: () => fireCue(completePlayer),
  };
}
