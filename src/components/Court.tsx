import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CORNERS } from '@/corners';
import { Colors } from '@/theme';
import { Corner } from './Corner';

// Native court markings come baked into the image, so we just overlay the
// numbered targets and the centre recovery marker on top of it.
const courtImage = require('../../assets/images/court.png');

// Keep the container's aspect ratio identical to the source image (719x800)
// so the painted lines never stretch.
const COURT_ASPECT_RATIO = 719 / 800;

type CourtProps = {
  activeIndex: number | null;
};

/**
 * A badminton court (rendered from the court artwork) with the 6 numbered
 * footwork targets and a centre marker the player returns to between movements.
 */
export function Court({ activeIndex }: CourtProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.court}>
        <Image
          source={courtImage}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />

        <View style={styles.centreMark} />

        {CORNERS.map((corner, index) => (
          <Corner
            key={corner.number}
            number={corner.number}
            x={corner.x}
            y={corner.y}
            active={index === activeIndex}
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
