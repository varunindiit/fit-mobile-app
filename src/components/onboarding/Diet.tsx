import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useOn } from '@/components/onboarding/kit';
import { CountUp, nativeOnly, PressableScale, tap } from '@/components/ui';
import { C, ink, MOTION, R, shadowSm } from '@/theme';

export type DietOption = { t: string; label: string; s: string; img: number };

/* ---------------- Diet type grid ---------------- */

/** Two-column food cards (an odd last one spans the row). The picked card's food does a small bounce. */
export function DietGrid({ options, value, onChange }: { options: DietOption[]; value: string; onChange: (t: string) => void }) {
  return (
    <View style={s.grid} accessibilityRole="radiogroup">
      {options.map((o, i) => (
        <DietCard key={o.t} o={o} wide={i === options.length - 1 && options.length % 2 === 1} on={o.t === value} onPress={() => onChange(o.t)} />
      ))}
    </View>
  );
}

function DietCard({ o, wide, on, onPress }: { o: DietOption; wide: boolean; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (on) pop.set(withSequence(withTiming(1.14, { duration: 140 }), withSpring(1, { damping: 9, stiffness: 220 })));
  }, [on, pop]);
  const card = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primarySoft]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primary]),
  }));
  const img = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${o.label}. ${o.s}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={wide ? s.cellWide : s.cell}>
      <Animated.View style={[s.card, wide && s.cardWide, card]}>
        <Animated.View style={[s.plate, wide && s.plateWide, img]}>
          <Image source={o.img} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
        <View style={wide ? { flex: 1 } : { alignItems: 'center' }}>
          <Text style={[s.title, !wide && { textAlign: 'center' }]}>{o.label}</Text>
          <Text style={[s.sub, !wide && { textAlign: 'center' }]}>{o.s}</Text>
        </View>
        {on && (
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[s.tick, wide && s.tickWide]}>
            <Ionicons name="checkmark" size={13} color={C.onPrimary} />
          </Animated.View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

/* ---------------- Nutrition plan (diet info step) ---------------- */

/** Diet photo with the plan name and its highlights layered on top. */
export function PlateHero({ img, label }: { img: number; label: string }) {
  return (
    <View style={s.hero}>
      <Image source={img} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={[ink(0), ink(0.85)]} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(380))} style={s.heroBadge}>
        <Ionicons name="restaurant" size={12} color={C.primaryDark} />
        <Text style={s.heroBadgeText}>{label}</Text>
      </Animated.View>
      <View style={s.heroFoot}>
        <Text style={s.heroTitle}>Meals built for your goal</Text>
        <View style={s.heroTags}>
          {['High protein', 'Smart portions', 'Foods you enjoy'].map((t, i) => (
            <Animated.View key={t} entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(520 + i * 120))} style={s.heroTag}>
              <Text style={s.heroTagText}>{t}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Daily calorie budget with the protein / carbs / fat split as a segmented bar. */
export function DailyTargets({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  const macros = [
    { k: 'Protein', g: protein, cal: protein * 4, color: C.protein },
    { k: 'Carbs', g: carbs, cal: carbs * 4, color: C.carbs },
    { k: 'Fat', g: fat, cal: fat * 9, color: C.fat },
  ];
  const total = macros.reduce((a, m) => a + m.cal, 0) || 1;
  return (
    <View style={s.targets}>
      <View style={s.targetsHead}>
        <View>
          <Text style={s.targetsKey}>Your daily target</Text>
          <Text style={s.targetsVal}>
            <CountUp value={kcal} fromZero style={s.kcal} />
            <Text style={s.kcalUnit}> kcal</Text>
          </Text>
        </View>
        <View style={s.flame}>
          <Ionicons name="flame" size={20} color={C.accent} />
        </View>
      </View>
      <View style={s.split}>
        {macros.map((m) => (
          <Segment key={m.k} share={m.cal / total} color={m.color} />
        ))}
      </View>
      <View style={s.legend}>
        {macros.map((m) => (
          <View key={m.k} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: m.color }]} />
            <Text style={s.legendKey}>{m.k}</Text>
            <Text style={s.legendVal}>{m.g} g</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Segment({ share, color }: { share: number; color: string }) {
  const g = useSharedValue(0);
  useEffect(() => {
    g.set(withSpring(share, { damping: 20, stiffness: 110 }));
  }, [share, g]);
  const style = useAnimatedStyle(() => ({ flexGrow: g.get() }));
  return <Animated.View style={[s.seg, { backgroundColor: color }, style]} />;
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.9%', flexGrow: 1 },
  cellWide: { width: '100%' },
  card: { alignItems: 'center', paddingTop: 16, paddingBottom: 14, paddingHorizontal: 10, borderRadius: R.xl, borderWidth: 1.5, ...shadowSm },
  cardWide: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  plate: { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', backgroundColor: C.white, marginBottom: 10, borderWidth: 3, borderColor: C.white, ...shadowSm },
  plateWide: { width: 56, height: 56, borderRadius: 28, marginBottom: 0 },
  title: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: C.textSoft, marginTop: 3, lineHeight: 16 },
  tick: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  tickWide: { position: 'relative', top: 0, right: 0 },

  hero: { height: 250, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.skeleton },
  heroBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, backgroundColor: C.white },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: C.primaryDark },
  heroFoot: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.4 },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  heroTagText: { fontSize: 11.5, fontWeight: '700', color: C.white },

  targets: { marginTop: 14, padding: 16, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  targetsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetsKey: { fontSize: 12.5, fontWeight: '700', color: C.textSoft },
  targetsVal: { marginTop: 2 },
  kcal: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  kcalUnit: { fontSize: 14, fontWeight: '700', color: C.muted },
  flame: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  split: { flexDirection: 'row', gap: 4, height: 10, marginTop: 14 },
  seg: { height: '100%', borderRadius: 5, flexBasis: 0 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendKey: { fontSize: 12.5, fontWeight: '600', color: C.textSoft },
  legendVal: { fontSize: 12.5, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
});
