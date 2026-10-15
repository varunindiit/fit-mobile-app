import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Glyph } from '@/components/Glyph';
import { EXERCISE_ART, EXERCISE_ART_B } from '@/components/glyphs';
import { C } from '@/theme';

const ART: [string, string] = ['#F6FBF8', '#E1F2EA'];
/** 2-frame rep loop: hold each pose, then a quick cross-fade — reads like a GIF. */
const HOLD = 420;
const SWAP = 160;

/** Illustration tile: the exercise's 3D figure (or its emoji glyph) standing on a soft mint mat, optionally with a looping "rep" motion
 *  (2-frame pose swap when a second keyframe exists, gentle breathing for static holds). */
export function ExerciseArt({ id, emoji, size = 64, width, height, animated = false, radius, style }: { id?: string; emoji: string; size?: number; width?: DimensionValue; height?: number; animated?: boolean; radius?: number; style?: ViewStyle }) {
  const h = height ?? size;
  const reduce = useReducedMotion();
  const loop = animated && !reduce;
  const t = useSharedValue(0);
  const art = id ? EXERCISE_ART[id] : undefined;
  const artB = art && id ? EXERCISE_ART_B[id] : undefined;
  const mode = !art ? 'bob' : artB ? 'frames' : 'breathe';

  useEffect(() => {
    if (!loop) {
      t.set(0);
      return;
    }
    if (mode === 'frames') {
      const swap = (to: number) => withDelay(HOLD, withTiming(to, { duration: SWAP, easing: Easing.inOut(Easing.quad) }));
      t.set(withRepeat(withSequence(swap(1), swap(0)), -1));
    } else {
      t.set(withRepeat(withTiming(1, { duration: mode === 'breathe' ? 1400 : 850, easing: Easing.inOut(Easing.quad) }), -1, true));
    }
    return () => cancelAnimation(t);
  }, [loop, mode, t]);

  const lift = h * 0.06;
  const figure = useAnimatedStyle(() => {
    const v = loop ? t.get() : 0;
    if (mode === 'frames') return { opacity: 1 - v, transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }] };
    if (mode === 'breathe') return { opacity: 1, transform: [{ translateY: -lift * 0.15 * v }, { scale: 1 + 0.025 * v }, { rotate: '0deg' }] };
    return { opacity: 1, transform: [{ translateY: -lift * v }, { scale: 1 + 0.07 * v }, { rotate: `${-3 + 6 * v}deg` }] };
  });
  const figureB = useAnimatedStyle(() => ({ opacity: loop ? t.get() : 0 }));
  const shade = useAnimatedStyle(() => {
    const v = loop && mode !== 'frames' ? t.get() : 0;
    return { opacity: 1 - 0.45 * v, transform: [{ scaleX: 1 - 0.28 * v }] };
  });

  const fs = Math.round(h * 0.48);
  const figH = Math.round(h * 0.8);
  const matBottom = Math.round(h * 0.13);
  const matH = Math.max(4, Math.round(h * 0.065));
  const shadowW = Math.round(h * 0.42);

  return (
    <LinearGradient colors={ART} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[{ width: width ?? size, height: h, borderRadius: radius ?? Math.min(28, Math.round(h * 0.22)), overflow: 'hidden' }, style]}>
      {h > 120 && (
        <>
          <View style={[s.bubble, { width: h * 0.5, height: h * 0.5, borderRadius: h * 0.25, top: -h * 0.12, right: -h * 0.08 }]} />
          <View style={[s.bubble, { width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, top: h * 0.2, left: -h * 0.1 }]} />
        </>
      )}
      <View style={[s.mat, { bottom: matBottom, height: matH }]} />
      <View style={[s.figure, { bottom: matBottom + matH - 2 }]}>
        <Animated.View style={[s.shadow, { width: shadowW, height: Math.max(4, h * 0.05), borderRadius: shadowW }, shade]} />
      </View>
      <View style={[s.figure, { bottom: matBottom + matH * 0.6 }]}>
        <Animated.View style={figure}>
          {art ? <Image source={art} style={{ width: figH, height: figH }} contentFit="contain" /> : <Glyph emoji={emoji} size={Math.round(fs * 1.25)} />}
        </Animated.View>
        {artB && loop && (
          <Animated.View style={[s.frameB, figureB]}>
            <Image source={artB} style={{ width: figH, height: figH }} contentFit="contain" />
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bubble: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)' },
  mat: { position: 'absolute', left: '9%', right: '9%', borderRadius: 99, backgroundColor: C.primaryTint },
  shadow: { backgroundColor: 'rgba(19,35,31,0.12)' },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  frameB: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
});
