import { StyleSheet, View } from 'react-native';

import { CORNERS } from '@/corners';
import { Colors } from '@/theme';
import { Corner } from './Corner';

type CourtProps = {
  activeIndex: number | null;
};

/**
 * A stylised badminton court with the 6 numbered footwork targets and a
 * centre marker the player returns to between movements.
 */
export function Court({ activeIndex }: CourtProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.court}>
        {/* Court markings */}
        <View style={styles.netLine} />
        <View style={styles.centreLine} />
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
    aspectRatio: 0.72,
    backgroundColor: Colors.court,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.courtLine,
    overflow: 'hidden',
  },
  netLine: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.courtLine,
    opacity: 0.85,
  },
  centreLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: Colors.courtLine,
    opacity: 0.5,
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
