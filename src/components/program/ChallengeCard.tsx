import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Glyph } from '@/components/Glyph';
import { Bolts } from '@/components/program/PlanAccordion';
import { PressableScale, tap, type IconName } from '@/components/ui';
import { C, INK, R, glow, ink } from '@/theme';

const DAYS = 30;
/** Ease-out black → transparent ramp over the photo's left part (a 2-stop linear ramp shows a hard edge). */
const EDGE_FADE = [INK, ink(0.96), ink(0.86), ink(0.68), ink(0.46), ink(0.26), ink(0.11), ink(0.03), ink(0)] as const;
const EDGE_STOPS = [0, 0.08, 0.17, 0.26, 0.36, 0.46, 0.55, 0.63, 0.7] as const;

export type ChallengeCardProps = {
  title: string;
  bolts: number;
  /** Program colours; kept for callers, the card itself is always the neutral black photo surface. */
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
  /** Athlete photography for the day, shown on the right of the card in place of the floating `art`. */
  photo?: number;
  cta: string;
  ctaIcon?: IconName;
  /** Appended to the progress line, e.g. this week's count. */
  footnote?: string;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * The 30-day program's "today" card: program and level on top, big day number, stats, a progress
 * bar and a start pill on the left, the athlete photo on the right under a black scrim that clears
 * towards them. Used on Home and Training.
 */
export function ChallengeCard({ title, bolts, day, done, stats, note, emoji, art, photo, cta, ctaIcon = 'play', footnote, onPress, style }: ChallengeCardProps) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!reduce && !photo) y.set(withRepeat(withTiming(-6, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [y, reduce, photo]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const press = () => {
    tap();
    onPress();
  };

  return (
    <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${title}, day ${day}. ${cta}`} onPress={press} style={[s.shell, glow(INK), style]}>
      <View style={s.card}>
        <View pointerEvents="none" style={s.media}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
          ) : (
            <Animated.View style={[s.art, float]}>
              <Glyph emoji={emoji} src={art} size={art ? 132 : 70} />
            </Animated.View>
          )}
          {/* Blends the photo's left edge into the card — eased stops so there's no visible seam */}
          <LinearGradient colors={EDGE_FADE} locations={EDGE_STOPS} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
        {/* Black transparent shadow behind the text, clearing to the athlete on the right */}
        <LinearGradient colors={[ink(0.92), ink(0.6), ink(0)]} locations={[0, 0.5, 0.82]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <LinearGradient colors={[ink(0), ink(0.5)]} locations={[0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={s.content}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
            <Bolts n={bolts} />
          </View>
          <Text style={s.day}>Day {day}</Text>
          <Text style={s.stats} numberOfLines={2}>
            {stats ? `${stats.exercises} exercises · ${stats.minutes} min · ${stats.kcal} kcal` : note}
          </Text>
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.min(100, (done / DAYS) * 100)}%` }]} />
          </View>
          <Text style={s.progress} numberOfLines={1}>
            {done}/{DAYS} days{footnote ? ` · ${footnote}` : ''}
          </Text>
          <View style={s.cta}>
            <Ionicons name={ctaIcon} size={13} color={C.primaryDark} />
            <Text style={s.ctaText} numberOfLines={1}>
              {cta}
            </Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  shell: { borderRadius: R.xl },
  card: { borderRadius: R.xl, overflow: 'hidden', backgroundColor: INK, padding: 20, minHeight: 210 },
  /** Right-hand photo (or mascot) panel, full card height. */
  media: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '58%', alignItems: 'center', justifyContent: 'flex-end' },
  art: { marginBottom: 6 },
  content: { width: '64%' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: C.white, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  day: { color: C.white, fontSize: 40, lineHeight: 46, fontWeight: '900', letterSpacing: -1.2, marginTop: 4, fontVariant: ['tabular-nums'] },
  stats: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontWeight: '600', marginTop: 6, lineHeight: 17 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.white },
  progress: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 10 },
  cta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, height: 38, marginTop: 16, paddingHorizontal: 16, borderRadius: R.pill, backgroundColor: C.white },
  ctaText: { fontSize: 13.5, fontWeight: '900', letterSpacing: 0.2, color: C.primaryDark, textTransform: 'uppercase' },
});
