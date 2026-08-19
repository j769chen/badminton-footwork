# Badminton Footwork Trainer

A cross-platform (iOS + Android) mobile app that drills badminton footwork. The
six corners of the court are numbered 1-6; one lights up at a time on a
configurable interval. React to the highlight, move to that corner, and recover
to the centre. A short audio cue accompanies each switch and **ducks** any music
playing from Spotify, SoundCloud, Apple Music, etc. (briefly lowering it) rather
than stopping it.

## Features

- **Up to 6 numbered corners** drawn on a stylised court (front / mid / rear,
  left / right). The active corner pulses and glows.
- **Pick the corners you want to drill.** All six are in play by default;
  deselect any you are not working on and only the rest are called out - a
  rear-court-only drill, one diagonal, or a single corner repeated. Deselected
  corners are hidden from the court, and both switch orders respect the
  selection.
- **Music-friendly audio cues.** The audio session uses `duckOthers`, so your
  music keeps playing and only dips for each cue. Three modes: **Beep** (a short
  tone), **Voice** (the corner number spoken out loud, so you can put the phone
  down instead of watching it), or **Off** for a visual-only drill. Spoken cues
  ride the same audio session, so they duck music exactly as the beep does.
- **Optional haptic cue.** A vibration on each call, independent of the audio
  mode. Pair it with **Off** to drill silently in a shared space, or add it to
  Beep/Voice for a cue you can feel as well as hear.
- **Get-ready countdown.** A configurable lead-in (default 3s) counted off
  before the first corner lights, so you can take your stance instead of being
  caught flat-footed. Each second is cued like a switch is, and it can be set to
  Off to start immediately.
- **Session countdown.** The workout runs for a set number of minutes, then
  stops with a "session complete" cue - or drill untimed ("No limit"), where the
  clock counts up and the session ends only when you stop it.
- **Distance-aware dwell.** A called corner stays lit for the configured
  interval plus up to 15% extra for the longest cross-court move, so distant
  targets stay reachable without slowing the whole drill down.
- **Unpredictable cadence.** An optional random variation either side of the
  interval, so you cannot settle into the rhythm and pre-move before the corner
  lights. It is symmetric, so the average cadence - and the rep count a session
  delivers - still matches the interval you set.
- **Configurable settings** (persisted between launches, and re-validated on
  load so a stored value that is out of range can never drive a session):
  - Time between switches (0.5-10s, in tenths of a second)
  - Cadence variation (0-50%, 0 = exact)
  - Session length (30s-15 min, or no limit)
  - Corners in play (any subset, minimum one)
  - Switch order: random (no immediate repeats) or sequential
  - Audio cue: beep, voice (spoken corner number), or off
  - Vibrate on switch on/off
  - Get-ready countdown (0-10s, 0 = off)
- **Pause / resume / stop** controls and a keep-awake screen during sessions.

## Tech stack

- [Expo](https://expo.dev/) (SDK 54) + React Native + TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- [`expo-audio`](https://docs.expo.dev/versions/latest/sdk/audio/) for the cue and
  audio-session ducking
- [`expo-speech`](https://docs.expo.dev/versions/latest/sdk/speech/) for spoken
  corner callouts
- [`expo-haptics`](https://docs.expo.dev/versions/latest/sdk/haptics/) for the
  optional vibration cue
- [`expo-keep-awake`](https://docs.expo.dev/versions/latest/sdk/keep-awake/) to
  keep the screen on during a session
- [`expo-image`](https://docs.expo.dev/versions/latest/sdk/image/) for the court
  backdrop
- [`@react-native-community/slider`](https://github.com/callstack/react-native-slider)
  for the settings sliders
- [Zustand](https://github.com/pmndrs/zustand) + AsyncStorage for persisted
  settings

## Getting started

```bash
npm install
npx expo start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, or scan the QR
code with the Expo Go / a dev client app on your phone.

> Background audio (`UIBackgroundModes: ["audio"]` on iOS) and the `expo-audio`
> config plugin require a native build, so use a
> [development build](https://docs.expo.dev/develop/development-builds/introduction/)
> (`npx expo run:ios` / `npx expo run:android`) rather than Expo Go for the full
> audio behaviour.

## How to use

1. Start your music in Spotify / SoundCloud / Apple Music first.
2. Open the app, adjust settings if needed, and tap **Start Session**.
   Take your stance during the get-ready countdown.
3. Move to whichever corner is highlighted, then recover to the centre. Repeat
   until the countdown ends.

## Project structure

```
src/
  app/
    _layout.tsx     Stack navigator + audio-session setup
    index.tsx       Home (summary + Start)
    train.tsx       Active session (court, countdown, controls)
    settings.tsx    Configurable settings
  components/
    Court.tsx       Court diagram + corner layout
    Corner.tsx      A single numbered, animated target
  hooks/
    useTrainer.ts   Drift-free timing engine (switches + countdown)
  store/
    settings.ts     Persisted settings (Zustand + AsyncStorage)
  cues.ts           Audio session config + beep / voice / haptic cues
  corners.ts        Corner definitions + next-corner selection
  format.ts         Clock / cadence / duration / lead-in formatting
  theme.ts          Design tokens
assets/
  images/           court.png (court backdrop)
  sounds/           beep.wav, complete.wav (generated tones)
```

## Notes

This app does not integrate the Spotify/SoundCloud SDKs or control playback. It
only ensures their background audio is not interrupted - you control music from
the music app, lock screen, or Control Centre.
