import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { EASE_OUT } from '@/components/ui';
import { C } from '@/theme';
import { BODY } from './assets';

/** Number of body-shape levels, from 0 (cut) to SHAPES - 1 (extra). */
export const SHAPES = 7;

function Layer({ i, pos, src }: { i: number; pos: SharedValue<number>; src: number }) {
  // Each photo is fully visible at its own level and cross-fades with its neighbours in between.
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - Math.abs(pos.get() - i)) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
    </Animated.View>
  );
}

/** Midsection photo for a body-fat level; moving the level cross-fades smoothly between neighbouring photos. */
export function BodyShape({ level, gender, style }: { level: number; gender: 'male' | 'female' | 'other'; style?: StyleProp<ViewStyle> }) {
  const set = gender === 'male' ? BODY.male : BODY.female;
  const pos = useSharedValue(level);
  useEffect(() => {
    pos.set(withTiming(level, { duration: 380, easing: EASE_OUT }));
  }, [level, pos]);
  return (
    <View style={[s.box, style]}>
      {set.map((src, i) => (
        <Layer key={i} i={i} pos={pos} src={src} />
      ))}
    </View>
  );
}

/** Approximate body-fat range and verdict for a shape level. */
export function bodyFat(level: number, gender: 'male' | 'female' | 'other') {
  const male = gender === 'male';
  const ranges = male ? ['6%–9%', '10%–14%', '15%–19%', '20%–24%', '25%–29%', '30%–34%', '35%+'] : ['12%–15%', '16%–19%', '20%–25%', '26%–30%', '31%–35%', '36%–40%', '40%+'];
  const verdicts = ['Very lean', 'Athletic', 'Healthy', 'Average', 'A bit high', 'High', 'Very high'];
  const i = Math.max(0, Math.min(SHAPES - 1, Math.round(level)));
  return { range: ranges[i], verdict: verdicts[i], tone: i <= 2 ? ('good' as const) : i === 3 ? ('ok' as const) : ('high' as const) };
}

const s = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: C.skeleton },
});
