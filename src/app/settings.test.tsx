import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings';

jest.mock('expo-audio', () => ({}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const SLIDER_LABELS = [
  'Time between switches',
  'Cadence variation',
  'Session length',
  'Get-ready countdown',
];

beforeEach(() => {
  useSettings.setState({ ...DEFAULT_SETTINGS });
});

describe('SettingsScreen sliders', () => {
  it('gives every native slider the same 0-1 range', async () => {
    await render(<SettingsScreen />);
    for (const label of SLIDER_LABELS) {
      expect(screen.getByLabelText(label).props).toMatchObject({
        minimumValue: 0,
        maximumValue: 1,
      });
    }
  });

  it('positions the thumb by where the value sits in its range', async () => {
    useSettings.setState({ switchIntervalSec: 2.4, sessionDurationSec: 900 });
    await render(<SettingsScreen />);
    expect(
      screen.getByLabelText('Time between switches').props.value,
    ).toBeCloseTo(0.2);
    expect(screen.getByLabelText('Session length').props.value).toBe(1);
  });

  it('maps a released position back to a value on the step grid', async () => {
    await render(<SettingsScreen />);
    await fireEvent(
      screen.getByLabelText('Cadence variation'),
      'slidingComplete',
      0.33,
    );
    await fireEvent(
      screen.getByLabelText('Time between switches'),
      'slidingComplete',
      0.2,
    );
    await fireEvent(
      screen.getByLabelText('Get-ready countdown'),
      'slidingComplete',
      0.67,
    );
    expect(useSettings.getState()).toMatchObject({
      switchJitterPct: 15,
      switchIntervalSec: 2.4,
      leadInSec: 7,
    });
  });
});
