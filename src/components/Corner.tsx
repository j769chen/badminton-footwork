import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { Colors } from '@/theme';

export const CORNER_SIZE = 60;

type CornerProps = {
  number: number;
  /** Position as a fraction of the parent (0..1). */
  x: number;
  y: number;
  active: boolean;
};

export function Corner({ number, x, y, active }: CornerProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  return (
    <Animated.View
      style={[
        styles.corner,
        active ? styles.cornerActive : styles.cornerIdle,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          transform: [
            { translateX: -CORNER_SIZE / 2 },
            { translateY: -CORNER_SIZE / 2 },
            { scale: active ? scale : 1 },
          ],
        },
      ]}
    >
      <Text
        style={[
          styles.number,
          active ? styles.numberActive : styles.numberIdle,
        ]}
      >
        {number}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderRadius: CORNER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cornerIdle: {
    backgroundColor: Colors.cornerIdle,
    borderColor: Colors.courtLine,
    opacity: 0.65,
  },
  cornerActive: {
    backgroundColor: Colors.cornerActive,
    borderColor: Colors.cornerActiveGlow,
    shadowColor: Colors.cornerActiveGlow,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  number: {
    fontSize: 26,
    fontWeight: '800',
  },
  numberIdle: {
    color: Colors.cornerText,
  },
  numberActive: {
    color: Colors.cornerActiveText,
  },
});
