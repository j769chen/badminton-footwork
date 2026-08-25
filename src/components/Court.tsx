import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { enabledCornerList, type Corner as CornerModel } from '@/corners';
import { useSettings } from '@/store/settings';
import { Colors } from '@/theme';
import { Corner } from './Corner';

const courtImage = require('../../assets/images/court.png');

const COURT_ASPECT_RATIO = 719 / 800;

type CourtProps = {
  activeCorner: CornerModel | null;
};

export function Court({ activeCorner }: CourtProps) {
  const enabledCorners = useSettings((s) => s.enabledCorners);

  return (
    <View style={styles.outer}>
      <View
        accessible
        accessibilityLabel={
          activeCorner
            ? `Court. Corner ${activeCorner.number}, ${activeCorner.label}, is lit.`
            : 'Court. No corner lit.'
        }
        style={styles.court}
      >
        <Image
          source={courtImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.centreMark} />

        {enabledCornerList(enabledCorners).map((corner) => (
          <Corner
            key={corner.number}
            number={corner.number}
            x={corner.x}
            y={corner.y}
            active={corner === activeCorner}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  court: {
    width: '100%',
    aspectRatio: COURT_ASPECT_RATIO,
    backgroundColor: Colors.court,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.courtLine,
    overflow: 'hidden',
  },
  centreMark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 16,
    height: 16,
    marginTop: -8,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: Colors.courtLine,
    opacity: 0.5,
  },
});
