import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';

const ND = Platform.OS !== 'web';

/** Illustration tile: exercise emoji standing on a light-blue mat, optionally with a looping "rep" motion. */
export function ExerciseArt({ emoji, size = 64, width, height, animated = false, radius, style }: { emoji: string; size?: number; width?: DimensionValue; height?: number; animated?: boolean; radius?: number; style?: ViewStyle }) {
  const h = height ?? size;
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const ease = Easing.inOut(Easing.quad);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 850, easing: ease, useNativeDriver: ND }),
        Animated.timing(t, { toValue: 0, duration: 850, easing: ease, useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, t]);

  const fs = Math.round(h * 0.48);
  const matBottom = Math.round(h * 0.13);
  const matH = Math.max(4, Math.round(h * 0.065));
  const shadowW = Math.round(h * 0.42);
  const anim = animated
    ? {
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.06] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
        ],
      }
    : null;

  return (
    <LinearGradient colors={['#F9FBFF', '#E8F0FE']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[{ width: width ?? size, height: h, borderRadius: radius ?? Math.min(28, Math.round(h * 0.22)), overflow: 'hidden' }, style]}>
      {h > 120 && (
        <>
          <View style={[s.bubble, { width: h * 0.5, height: h * 0.5, borderRadius: h * 0.25, top: -h * 0.12, right: -h * 0.08 }]} />
          <View style={[s.bubble, { width: h * 0.3, height: h * 0.3, borderRadius: h * 0.15, top: h * 0.2, left: -h * 0.1 }]} />
        </>
      )}
      <View style={[s.mat, { bottom: matBottom, height: matH }]} />
      <View style={[s.figure, { bottom: matBottom + matH - 2 }]}>
        <Animated.View
          style={[
            s.shadow,
            { width: shadowW, height: Math.max(4, h * 0.05), borderRadius: shadowW },
            animated && { transform: [{ scaleX: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }], opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
          ]}
        />
      </View>
      <View style={[s.figure, { bottom: matBottom + matH * 0.6 }]}>
        <Animated.Text style={[{ fontSize: fs, lineHeight: Math.round(fs * 1.2), textAlign: 'center' }, anim]}>{emoji}</Animated.Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  bubble: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)' },
  mat: { position: 'absolute', left: '9%', right: '9%', borderRadius: 99, backgroundColor: '#BCD5FB' },
  shadow: { backgroundColor: 'rgba(20,27,52,0.12)' },
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
