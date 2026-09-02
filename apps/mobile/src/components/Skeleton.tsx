import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

export function Skeleton({ width, height, style, circle }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle>; circle?: boolean }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width ?? '100%', height: height ?? 14, opacity, borderRadius: circle ? (height ?? 14) / 2 : radius.sm },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.bgAlt },
});
