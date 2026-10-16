import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EASE_OUT } from '@/components/ui';
import { BRAND } from '@/theme';

/** Must match the native splash in app.json (expo-splash-screen backgroundColor / image / imageWidth). */
const SPLASH_BG = '#155E50';
const ICON = require('@/assets/images/splash-icon.png');
const ICON_SIZE = 88;

const LETTER_START = 620;
const LETTER_MS = 900;
const LETTER_STEP = 0.35; // overlap between neighbouring letters (in letter durations)
const LETTER_SPAN = 1 + (BRAND.length - 1) * LETTER_STEP;
const INTRO_MS = 1900; // minimum time on screen before it may leave

function Letter({ ch, i, p }: { ch: string; i: number; p: SharedValue<number> }) {
  // Each letter rises out of a soft blur-like fade, staggered left to right.
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, p.get() * LETTER_SPAN - i * LETTER_STEP));
    return { opacity: t, transform: [{ translateY: (1 - t) * 22 }, { scale: 0.85 + t * 0.15 }] };
  });
  return <Animated.Text style={[s.letter, style]}>{ch}</Animated.Text>;
}

/**
 * Continues the native splash seamlessly (same colour, icon and size), then animates:
 * the logo mark pops with a glow ring, lifts up, the app name rises in letter by letter and the tagline fades in.
 * Leaves with a fade + gentle zoom once the intro has played and the app is `ready`; `onReveal` fires as it starts leaving.
 */
export function AnimatedSplash({ ready, onReveal, onDone }: { ready: boolean; /** Exit is starting: mount the app underneath now so its entrance plays as the splash fades. */ onReveal: () => void; onDone: () => void }) {
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);
  const lift = useSharedValue(0);
  const ring = useSharedValue(0);
  const letters = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);
  const [introDone, setIntroDone] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    // The overlay now looks identical to the native splash, so swap without a visible seam.
    SplashScreen.hideAsync().catch(() => {});
    if (reduce) {
      lift.set(1);
      letters.set(1);
      tagline.set(1);
      const t = setTimeout(() => setIntroDone(true), 500);
      return () => clearTimeout(t);
    }
    pop.set(withSequence(withTiming(0.86, { duration: 220, easing: Easing.out(Easing.quad) }), withSpring(1.08, { damping: 7, stiffness: 180 }), withSpring(1, { damping: 12, stiffness: 160 })));
    ring.set(withDelay(240, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
    lift.set(withDelay(460, withSpring(1, { damping: 14, stiffness: 120 })));
    letters.set(withDelay(LETTER_START, withTiming(1, { duration: LETTER_MS, easing: Easing.out(Easing.quad) })));
    tagline.set(withDelay(LETTER_START + LETTER_MS * 0.6, withTiming(1, { duration: 520, easing: EASE_OUT })));
    const t = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(t);
  }, [reduce, pop, ring, lift, letters, tagline]);

  useEffect(() => {
    if (!introDone || !ready || leaving.current) return;
    leaving.current = true;
    onReveal();
    exit.set(
      withTiming(1, { duration: reduce ? 200 : 420, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [introDone, ready, reduce, exit, onDone, onReveal]);

  const root = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const stage = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.get() * 0.12 }] }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.get() * 34 }, { scale: pop.get() }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.32 * (1 - ring.get()), transform: [{ translateY: -lift.get() * 34 }, { scale: 0.5 + ring.get() * 1.6 }] }));
  const name = useAnimatedStyle(() => ({ transform: [{ translateY: 26 - lift.get() * 8 }] }));
  const tag = useAnimatedStyle(() => ({ opacity: tagline.get() * 0.8, transform: [{ translateY: (1 - tagline.get()) * 8 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.root, root]} pointerEvents={introDone && ready ? 'none' : 'auto'}>
      <StatusBar style="light" />
      <Animated.View style={[s.center, stage]}>
        <Animated.View style={[s.halo, halo]} />
        <Animated.View style={icon}>
          <Image source={ICON} style={{ width: ICON_SIZE, height: ICON_SIZE }} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[s.nameWrap, name]}>
          <View style={s.nameRow} accessible accessibilityLabel={BRAND}>
            {BRAND.split('').map((ch, i) => (
              <Letter key={i} ch={ch} i={i} p={letters} />
            ))}
          </View>
          <Animated.Text style={[s.tagline, tag]}>NUTRITION + FITNESS</Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: SPLASH_BG, zIndex: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#3BE3A6' },
  nameWrap: { position: 'absolute', top: '50%', alignItems: 'center' },
  nameRow: { flexDirection: 'row' },
  letter: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  tagline: { marginTop: 6, fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 3 },
});
