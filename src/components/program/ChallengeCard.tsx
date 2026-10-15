import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Glyph } from '@/components/Glyph';
import { Bolts } from '@/components/program/PlanAccordion';
import { PressableScale, Ring, tap, type IconName } from '@/components/ui';
import { C, R, glow } from '@/theme';

/** Brand surface for the card, whatever the program: deep green ink with a mint glow. */
const INK: [string, string, string] = ['#1F8A6E', '#155E50', '#0E3B33'];

const DAYS = 30;

export type ChallengeCardProps = {
  title: string;
  bolts: number;
  /** Program colours, shown as the accent dot; the card itself always uses the brand green surface. */
  colors: [string, string];
  /** Day shown big on the card. */
  day: number;
  /** Days completed so far (0–30). */
  done: number;
  /** Line under the day: workout stats, or a rest / done message. */
  stats?: { exercises: number; minutes: number; kcal: number };
  note?: string;
  emoji: string;
  art?: number;
  cta: string;
  ctaIcon?: IconName;
  /** Small line above the button, e.g. this week's count. */
  footnote?: string;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * The 30-day program's "today" card: big day number, stat chips, a figure that floats out of the
 * corner, a 30-segment journey strip and a full-width start button. Used on Home and Training.
 */
export function ChallengeCard({ title, bolts, colors, day, done, stats, note, emoji, art, cta, ctaIcon = 'play', footnote, onPress, style }: ChallengeCardProps) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduce) y.set(withRepeat(withTiming(-6, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [y, reduce]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const pct = Math.round((done / DAYS) * 100);
  const press = () => {
    tap();
    onPress();
  };

  return (
    <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${title}, day ${day}. ${cta}`} onPress={press} style={[s.shell, glow(C.primaryDark), style]}>
      <LinearGradient colors={INK} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
        {/* Mint glow behind the figure + soft concentric rings */}
        <Svg pointerEvents="none" width={320} height={320} style={s.glowA}>
          <Defs>
            <RadialGradient id="chGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#3BE3A6" stopOpacity={0.35} />
              <Stop offset="1" stopColor="#3BE3A6" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#chGlow)" />
          <Circle cx={160} cy={160} r={118} fill="none" stroke={C.white} strokeOpacity={0.1} strokeWidth={1} />
          <Circle cx={160} cy={160} r={78} fill="none" stroke={C.white} strokeOpacity={0.08} strokeWidth={1} />
        </Svg>
        <View pointerEvents="none" style={s.glowB} />

        <View style={s.top}>
          <View style={s.pill}>
            <View style={[s.dot, { backgroundColor: colors[0] }]} />
            <Text style={s.pillText} numberOfLines={1}>
              {title}
            </Text>
            <Bolts n={bolts} />
          </View>
          <Ring size={42} stroke={4} value={done / DAYS} track="rgba(255,255,255,0.18)" gradient={['#3BE3A6', C.primaryTint]}>
            <Text style={s.pct}>{pct}%</Text>
          </Ring>
        </View>

        <View style={s.mid}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>DAY</Text>
            <Text style={s.day}>
              {day}
              <Text style={s.dayOf}> /{DAYS}</Text>
            </Text>
            {stats ? (
              <View style={s.chips}>
                <Chip icon="body" text={`${stats.exercises} moves`} />
                <Chip icon="time" text={`${stats.minutes} min`} />
                <Chip icon="flame" text={`~${stats.kcal} kcal`} />
              </View>
            ) : (
              !!note && <Text style={s.note}>{note}</Text>
            )}
          </View>
          <Animated.View pointerEvents="none" style={[s.art, float]}>
            <View style={s.artHalo} />
            <Glyph emoji={emoji} src={art} size={art ? 132 : 70} />
          </Animated.View>
        </View>

        {/* 30-day journey: one segment per day */}
        <View style={s.strip}>
          {Array.from({ length: DAYS }, (_, i) => (
            <View key={i} style={[s.seg, i < done ? s.segDone : i === done ? s.segNext : null]} />
          ))}
        </View>

        {!!footnote && <Text style={s.foot}>{footnote}</Text>}

        <View style={s.cta}>
          <View style={s.ctaIcon}>
            <Ionicons name={ctaIcon} size={14} color={C.white} style={ctaIcon === 'play' ? { marginLeft: 2 } : undefined} />
          </View>
          <Text style={s.ctaText}>{cta}</Text>
          <Ionicons name="arrow-forward" size={18} color={C.primaryDark} />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

function Chip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon} size={11} color={C.white} />
      <Text style={s.chipText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { borderRadius: R.xl, backgroundColor: '#155E50' },
  card: { borderRadius: R.xl, padding: 18, overflow: 'hidden' },
  glowA: { position: 'absolute', right: -110, top: -40 },
  glowB: { position: 'absolute', width: 180, height: 180, borderRadius: 90, left: -70, bottom: -90, backgroundColor: 'rgba(59,227,166,0.08)' },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 11, height: 28, borderRadius: R.pill },
  pillText: { color: C.white, fontSize: 12.5, fontWeight: '800', flexShrink: 1 },
  pct: { color: C.white, fontSize: 10.5, fontWeight: '900', fontVariant: ['tabular-nums'] },
  mid: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, minHeight: 140 },
  kicker: { color: C.primaryTint, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  day: { color: C.white, fontSize: 60, lineHeight: 64, fontWeight: '900', letterSpacing: -2.5, fontVariant: ['tabular-nums'] },
  dayOf: { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingRight: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  chipText: { color: C.white, fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { color: 'rgba(255,255,255,0.92)', fontSize: 13.5, fontWeight: '600', marginTop: 8, lineHeight: 19 },
  art: { width: 128, height: 150, alignItems: 'center', justifyContent: 'flex-end', marginRight: -10, marginBottom: -6 },
  artHalo: { position: 'absolute', bottom: 8, width: 116, height: 116, borderRadius: 58, backgroundColor: 'rgba(201,235,221,0.14)', borderWidth: 1, borderColor: 'rgba(201,235,221,0.3)' },
  strip: { flexDirection: 'row', gap: 2.5, marginTop: 16 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)' },
  segDone: { backgroundColor: '#3BE3A6' },
  segNext: { backgroundColor: C.gold },
  foot: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', marginTop: 10 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, marginTop: 14, paddingLeft: 8, paddingRight: 16, borderRadius: R.pill, backgroundColor: C.white },
  ctaIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primary },
  ctaText: { flex: 1, fontSize: 15.5, fontWeight: '900', letterSpacing: -0.2, color: C.primaryDark },
});
