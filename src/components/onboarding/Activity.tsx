import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, ZoomIn, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { IMG } from '@/components/onboarding/assets';
import { useOn } from '@/components/onboarding/kit';
import { CountUp, nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { C, MOTION, R, glow, shadowSm } from '@/theme';

export type ActivityOption<T extends string> = { v: T; t: string; s: string; icon: IconName };

/** Sneakers drifting gently over a mint halo. */
export function ActivityHero() {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [y]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }, { rotate: '-4deg' }] }));
  return (
    <View style={s.hero}>
      <View style={s.halo} />
      <Animated.View style={float}>
        <Image source={IMG.activity} style={s.heroArt} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

/** Side-by-side activity cards; the chosen one fills with the brand colour and lifts. */
export function ActivityCards<T extends string>({ options, value, onChange }: { options: ActivityOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.row} accessibilityRole="radiogroup">
      {options.map((o) => (
        <ActivityCard key={o.v} o={o} on={o.v === value} onPress={() => onChange(o.v)} />
      ))}
    </View>
  );
}

function ActivityCard<T extends string>({ o, on, onPress }: { o: ActivityOption<T>; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const card = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primaryDark]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primaryDark]),
    transform: [{ translateY: -4 * p.get() }],
  }));
  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${o.t}, ${o.s}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flex: 1 }}>
      <Animated.View style={[s.card, on ? glow(C.primaryDark) : shadowSm, card]}>
        <View style={[s.icon, { backgroundColor: on ? 'rgba(255,255,255,0.14)' : C.primarySoft }]}>
          <Ionicons name={o.icon} size={26} color={on ? C.white : C.primaryDark} />
        </View>
        <Text style={[s.title, on && { color: C.white }]}>{o.t}</Text>
        <Text style={[s.sub, { color: on ? 'rgba(255,255,255,0.75)' : C.muted }]}>{o.s}</Text>
        <View style={[s.radio, on && s.radioOn]}>
          {on && (
            <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
              <Ionicons name="checkmark" size={13} color={C.primaryDark} />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

/** Daily step goal that follows the activity choice, counting and filling to the new target. */
export function StepGoal({ steps, max = 12000 }: { steps: number; max?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withSpring(steps / max, { damping: 20, stiffness: 120 }));
  }, [steps, max, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(w.get() * 100)}%` }));
  return (
    <View style={s.goal}>
      <View style={s.goalIcon}>
        <Ionicons name="footsteps" size={18} color={C.steps} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.goalKey}>Your daily step goal</Text>
        <Text style={s.goalVal}>
          <CountUp value={steps} style={s.goalNum} />
          <Text style={s.goalUnit}> steps</Text>
        </Text>
        <View style={s.track}>
          <Animated.View style={[s.fill, fill]} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', height: 170, marginTop: 8 },
  halo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: C.primarySoft },
  heroArt: { width: 160, height: 140 },

  row: { flexDirection: 'row', gap: 12 },
  card: { minHeight: 186, padding: 16, borderRadius: R.xl, borderWidth: 1.5 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3, lineHeight: 20 },
  sub: { fontSize: 12.5, fontWeight: '600', marginTop: 4, lineHeight: 17 },
  radio: { position: 'absolute', top: 14, right: 14, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: C.white, borderColor: C.white },

  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  goalIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.stepsSoft, alignItems: 'center', justifyContent: 'center' },
  goalKey: { fontSize: 12.5, fontWeight: '700', color: C.textSoft },
  goalVal: { marginTop: 1 },
  goalNum: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  goalUnit: { fontSize: 13, fontWeight: '700', color: C.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: C.borderSoft, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.steps },
});
