import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { nativeOnly } from '@/components/ui';
import { bmiLabel } from '@/lib/calc';
import { C, MOTION, R as RADII, shadowSm } from '@/theme';

const W = 264;
const RAD = 112; // arc radius (stroke centre)
const STROKE = 14;
const CX = W / 2;
const CY = RAD + STROKE / 2 + 4;
const KNOB = 24;
const NOW = 12;
const MIN = 15;
const MAX = 35;
const SPRING = { damping: 18, stiffness: 140, mass: 0.9 };

/** BMI zones on the dial; colours come from `bmiLabel` so the dial and the verdict always agree. */
const ZONES = [
  [MIN, 18.5],
  [18.5, 23],
  [23, 27.5],
  [27.5, MAX],
].map(([a, b]) => ({ a, b, ...bmiLabel((a + b) / 2) }));

const frac = (v: number) => Math.min(1, Math.max(0, (v - MIN) / (MAX - MIN)));
const xy = (t: number, r = RAD) => {
  const th = Math.PI - t * Math.PI;
  return { x: CX + r * Math.cos(th), y: CY - r * Math.sin(th) };
};
const pt = (t: number) => {
  const { x, y } = xy(t);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
};
const arc = (t0: number, t1: number) => `M ${pt(t0)} A ${RAD} ${RAD} 0 0 1 ${pt(t1)}`;

/**
 * Half-dial of BMI zones with the weight readout in its centre. A knob springs along the arc to the
 * current BMI; the active zone is drawn solid and the others recede. With `from` (the current BMI on the
 * target step) a "Now" pin marks the start and a dotted trail runs to the goal, with `badge` above the value.
 */
export function BmiGauge({ value, unit, bmi, from, badge }: { value: string; unit: string; bmi: number; from?: number; badge?: string }) {
  const l = bmiLabel(bmi);
  const now = from === undefined ? null : frac(from);
  const goal = frac(bmi);
  const nowPin = now === null ? null : xy(now);
  // Sweeps in from the low end on arrival, then follows the ruler.
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(frac(bmi), SPRING));
  }, [bmi, t]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.get() * 180}deg` }] }));

  return (
    <View style={s.card}>
      <View style={s.dial}>
        <Svg width={W} height={CY + 2}>
          {ZONES.map((z, i) => (
            <Path
              key={z.label}
              d={arc(frac(z.a) + (i ? 0.008 : 0), frac(z.b) - (i < ZONES.length - 1 ? 0.008 : 0))}
              stroke={z.color}
              strokeOpacity={z.label === l.label ? 1 : 0.22}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
          {now !== null && Math.abs(goal - now) > 0.01 && (
            <Path d={arc(Math.min(now, goal), Math.max(now, goal))} stroke={C.text} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="0.1 7" strokeLinecap="round" fill="none" />
          )}
        </Svg>
        {nowPin && <View pointerEvents="none" style={[s.nowPin, { left: nowPin.x - NOW / 2, top: nowPin.y - NOW / 2 }]} />}
        <Animated.View pointerEvents="none" style={[s.spinner, spin]}>
          <View style={[s.knob, { borderColor: l.color }]} />
        </Animated.View>

        <View style={s.center}>
          {badge && (
            <Animated.View key={badge} entering={nativeOnly(FadeIn.duration(MOTION.fast))} style={s.badge}>
              <Text style={s.badgeText}>{badge}</Text>
            </Animated.View>
          )}
          <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite">
            {value}
            <Text style={s.unit}> {unit}</Text>
          </Text>
        </View>
      </View>

      <View style={s.ends}>
        {now === null ? (
          <Text style={s.endText}>Low</Text>
        ) : (
          <View style={s.legend}>
            <View style={[s.nowPin, s.legendDot]} />
            <Text style={s.endText}>Now</Text>
          </View>
        )}
        <Animated.View key={l.label} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[s.verdict, { backgroundColor: l.color }]}>
          <Text style={s.verdictText}>
            {l.label} · BMI {bmi.toFixed(1)}
          </Text>
        </Animated.View>
        {now === null ? (
          <Text style={s.endText}>High</Text>
        ) : (
          <View style={s.legend}>
            <View style={[s.legendGoal, { borderColor: l.color }]} />
            <Text style={s.endText}>Goal</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { alignItems: 'center', paddingTop: 22, paddingBottom: 18, paddingHorizontal: 16, borderRadius: RADII.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  dial: { width: W, height: CY + 2 },
  spinner: { position: 'absolute', left: CX - RAD, top: CY - RAD, width: RAD * 2, height: RAD * 2 },
  knob: { position: 'absolute', left: -KNOB / 2, top: RAD - KNOB / 2, width: KNOB, height: KNOB, borderRadius: KNOB / 2, borderWidth: 5, backgroundColor: C.card, ...shadowSm },
  nowPin: { position: 'absolute', width: NOW, height: NOW, borderRadius: NOW / 2, backgroundColor: C.text, borderWidth: 2.5, borderColor: C.white },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { position: 'relative', borderWidth: 0, width: 8, height: 8 },
  legendGoal: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, backgroundColor: C.card },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADII.pill, backgroundColor: C.primarySoft, marginBottom: 2 },
  badgeText: { fontSize: 12.5, fontWeight: '800', color: C.primaryDark, fontVariant: ['tabular-nums'] },
  center: { position: 'absolute', left: 40, right: 40, bottom: 0, alignItems: 'center' },
  value: { fontSize: 50, fontWeight: '800', color: C.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 17, fontWeight: '700', color: C.textSoft, letterSpacing: 0 },
  ends: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 6 },
  endText: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  verdict: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.pill },
  verdictText: { fontSize: 12.5, fontWeight: '800', color: C.white, fontVariant: ['tabular-nums'] },
});
