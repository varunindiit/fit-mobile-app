import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { C, MOTION, R } from '@/theme';

/** Standard ease-out curve for entrances and value changes. */
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Layout animations (`entering` / `exiting` / `layout`) run natively only.
 * On web, Reanimated deletes custom keyframes on a timer (duration + delay); when a screen
 * transition delays the CSS animation, the keyframe is gone before it starts and the node is
 * stranded as `position: absolute`, stacking later content on top. Wrap every builder with this.
 */
export function nativeOnly<T>(animation: T): T | undefined {
  return Platform.OS === 'web' ? undefined : animation;
}

/** Sibling re-flow animation for lists that add, remove or expand items. */
export const layoutTransition = nativeOnly(LinearTransition.duration(MOTION.base).easing(EASE_OUT));

const APressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Scale while pressed (default 0.97). */
  scaleTo?: number;
};

/** Pressable with a native-thread spring scale on press. The base for every tappable surface. */
export function PressableScale({ scaleTo = 0.97, style, children, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, MOTION.pressSpring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, MOTION.pressSpring));
        onPressOut?.(e);
      }}
      style={[style, anim]}>
      {children}
    </APressable>
  );
}

/** Entrance used for staggered content: short rise + fade. Index is capped so long lists don't wait. */
export const enter = (index = 0) =>
  nativeOnly(
    FadeInDown.duration(MOTION.enter)
      .delay(Math.min(index, 8) * MOTION.stagger)
      .easing(EASE_OUT)
      .withInitialValues({ transform: [{ translateY: 14 }] }),
  );

/** Plain fade entrance (no movement) for overlays and swaps. */
export const fadeEnter = (delay = 0) => nativeOnly(FadeIn.duration(MOTION.base).delay(delay));

/** Wraps children in a staggered entrance animation. */
export function Enter({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={enter(index)} style={style}>
      {children}
    </Animated.View>
  );
}

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Number that eases between values (and optionally counts up on mount). */
export function CountUp({
  value,
  format = fmtInt,
  style,
  duration = MOTION.count,
  fromZero = false,
  children,
}: {
  value: number;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  fromZero?: boolean;
  /** Trailing nodes rendered inside the same Text (e.g. a unit). */
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(fromZero ? 0 : value);
  const current = useRef(fromZero ? 0 : value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const total = reduce ? 0 : duration;
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const t = total === 0 ? 1 : Math.min(1, (Date.now() - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = t === 1 ? value : from + (value - from) * eased;
      current.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);

  return (
    <Text style={style}>
      {format(shown)}
      {children}
    </Text>
  );
}

/** Pulsing placeholder block for loading states. */
export function Skeleton({ width = '100%', height = 14, radius = R.sm, style }: { width?: ViewStyle['width']; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.set(withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: C.skeleton }, style, anim]} />;
}

/** Keeps an overlay mounted while its exit animation plays. */
export function usePresence(visible: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (visible || !mounted) return;
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [visible, mounted, exitMs]);
  return mounted;
}

/** Holds the last value seen while `visible`, so closing overlays don't flash empty content. */
export function useHeldWhileVisible<T>(value: T, visible: boolean) {
  const [held, setHeld] = useState(value);
  if (visible && held !== value) setHeld(value);
  return visible ? value : held;
}
