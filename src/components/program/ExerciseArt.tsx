import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Glyph } from '@/components/Glyph';
import { EXERCISE_ANIM, EXERCISE_ART } from '@/components/glyphs';

const ART: [string, string] = ['#F5FDF4', '#E2F6DF'];

/** Illustration tile: the exercise's looping animation (or its still pose / emoji glyph when there is none).
 *  Exercises with an animation play it natively; the rest keep a gentle breathing or bobbing loop. */
export function ExerciseArt({ id, emoji, size = 64, width, height, animated = false, radius, style }: { id?: string; emoji: string; size?: number; width?: DimensionValue; height?: number; animated?: boolean; radius?: number; style?: ViewStyle }) {
  const h = height ?? size;
  const reduce = useReducedMotion();
  const loop = animated && !reduce;
  const t = useSharedValue(0);
  const anim = id ? EXERCISE_ANIM[id] : undefined;
  const art = id ? EXERCISE_ART[id] : undefined;
  const mode = anim ? 'play' : art ? 'breathe' : 'bob';

  useEffect(() => {
    if (!loop || mode === 'play') {
      t.set(0);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: mode === 'breathe' ? 1400 : 850, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(t);
  }, [loop, mode, t]);

  const lift = h * 0.06;
  const figure = useAnimatedStyle(() => {
    const v = loop && mode !== 'play' ? t.get() : 0;
    if (mode === 'breathe') return { transform: [{ translateY: -lift * 0.15 * v }, { scale: 1 + 0.025 * v }, { rotate: '0deg' }] };
    if (mode === 'bob') return { transform: [{ translateY: -lift * v }, { scale: 1 + 0.07 * v }, { rotate: `${-3 + 6 * v}deg` }] };
    return { transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }] };
  });

  const fs = Math.round(h * 0.48);
  const figH = Math.round(h * 0.8);

  return (
    <LinearGradient colors={ART} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[{ width: width ?? size, height: h, borderRadius: radius ?? Math.min(28, Math.round(h * 0.22)), overflow: 'hidden' }, style]}>
      {h > 120 && (
        <>
          <View style={[s.bubble, { width: h * 0.5, height: h * 0.5, borderRadius: h * 0.25, top: -h * 0.12, right: -h * 0.08 }]} />
          <View style={[s.bubble, { width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, top: h * 0.2, left: -h * 0.1 }]} />
        </>
      )}
      <View style={[s.figure, { bottom: Math.round(h * 0.1) }]}>
        <Animated.View style={figure}>
          {anim ? (
            // libwebp decodes animated WebP with the right blending and frame rate; Apple's codec can get both wrong.
            <Image source={anim} style={{ width: figH, height: figH }} contentFit="contain" autoplay={loop} useAppleWebpCodec={false} />
          ) : art ? (
            <Image source={art} style={{ width: figH, height: figH }} contentFit="contain" />
          ) : (
            <Glyph emoji={emoji} size={Math.round(fs * 1.25)} />
          )}
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bubble: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)' },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
