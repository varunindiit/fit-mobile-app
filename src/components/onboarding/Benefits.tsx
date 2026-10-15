import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { IMG } from '@/components/onboarding/assets';
import { nativeOnly, type IconName } from '@/components/ui';
import { BRAND, C, G, MOTION, R, glow, shadowSm } from '@/theme';

/** Fitora vs typical apps, one row per thing the plan is built from. */
const ROWS: { icon: IconName; label: string }[] = [
  { icon: 'person-circle-outline', label: 'Plan built from your answers' },
  { icon: 'barbell-outline', label: 'Workouts matched to your level' },
  { icon: 'restaurant-outline', label: 'Meals that fit your diet' },
  { icon: 'trending-up-outline', label: 'Progress you can track' },
];

/** Slow up-and-down drift for the floating chips; `delay` offsets them so they never move in step. */
function useFloat(delay: number) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withDelay(delay, withRepeat(withTiming(-5, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [delay, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
}

function FloatChip({ icon, text, delay, style }: { icon: IconName; text: string; delay: number; style: StyleProp<ViewStyle> }) {
  const float = useFloat(delay);
  return (
    <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(500 + delay / 2))} style={[s.chip, style]}>
      <Animated.View style={[s.chipInner, float]}>
        <View style={s.chipIcon}>
          <Ionicons name={icon} size={12} color={C.primaryDark} />
        </View>
        <Text style={s.chipText}>{text}</Text>
      </Animated.View>
    </Animated.View>
  );
}

/** Brand card with the cut-out photo breaking out of its top edge and two drifting feature chips. */
export function BenefitsHero({ male }: { male: boolean }) {
  return (
    <View style={s.hero}>
      <LinearGradient colors={G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.heroBg]} />
      <View style={s.heroCopy}>
        <Text style={s.heroEyebrow}>YOUR {BRAND.toUpperCase()} PLAN</Text>
        <Text style={s.heroTitle}>Made for{'\n'}your body</Text>
        <Text style={s.heroSub}>Not a one-size-fits-all routine.</Text>
      </View>
      <Image source={male ? IMG.benefitsMale : IMG.benefits} style={s.heroPhoto} contentFit="contain" contentPosition="bottom" transition={200} />
      <FloatChip icon="sparkles" text="Personalized" delay={0} style={{ right: 6, top: 100 }} />
      <FloatChip icon="flash" text="Daily guidance" delay={700} style={{ right: 70, bottom: 14 }} />
    </View>
  );
}

/** Two-column comparison: Fitora ticks every row, typical apps none. */
export function CompareTable() {
  return (
    <View style={s.table}>
      <View style={s.headRow}>
        <Text style={s.headLabel}>What you get</Text>
        <View style={[s.col, s.brandHead]}>
          <Text style={s.brandHeadText}>{BRAND}</Text>
        </View>
        <View style={s.col}>
          <Text style={s.otherHead}>Others</Text>
        </View>
      </View>
      {ROWS.map((r, i) => (
        <View key={r.label} style={[s.row, i < ROWS.length - 1 && s.rowLine]}>
          <View style={s.rowIcon}>
            <Ionicons name={r.icon} size={16} color={C.primaryDark} />
          </View>
          <Text style={s.rowText}>{r.label}</Text>
          <View style={[s.col, s.brandCol]}>
            <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(600 + i * 110))} style={s.yes}>
              <Ionicons name="checkmark" size={14} color={C.white} />
            </Animated.View>
          </View>
          <View style={s.col}>
            <Ionicons name="close" size={16} color="#C9C5C1" />
          </View>
        </View>
      ))}
    </View>
  );
}

const COL = 62;

const s = StyleSheet.create({
  hero: { height: 196, marginTop: 34 },
  heroBg: { borderRadius: R.xl, ...glow(C.primary) },
  heroCopy: { position: 'absolute', left: 20, top: 22, width: '52%' },
  heroEyebrow: { fontSize: 10.5, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.4 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: C.white, letterSpacing: -0.6, lineHeight: 30, marginTop: 6 },
  heroSub: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 8, lineHeight: 17 },
  heroPhoto: { position: 'absolute', right: -6, bottom: 0, width: 180, height: 240 },
  chip: { position: 'absolute' },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: R.pill, backgroundColor: C.white, ...shadowSm },
  chipIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 11.5, fontWeight: '800', color: C.text },

  table: { marginTop: 16, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', ...shadowSm },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6, paddingTop: 12 },
  headLabel: { flex: 1, fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  col: { width: COL, alignItems: 'center', justifyContent: 'center' },
  brandHead: { paddingVertical: 5, borderTopLeftRadius: R.sm, borderTopRightRadius: R.sm, backgroundColor: C.primarySoft },
  brandHeadText: { fontSize: 12, fontWeight: '900', color: C.primaryDark },
  otherHead: { fontSize: 12, fontWeight: '700', color: C.muted },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowIcon: { width: 30, height: 30, marginRight: 10, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: C.text, paddingVertical: 14, paddingRight: 8, lineHeight: 18 },
  brandCol: { alignSelf: 'stretch', backgroundColor: C.primarySoft },
  yes: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
