import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { GradientButton, PRIMARY } from '@/components/program/GradientButton';
import { findSession, sessionMeta } from '@/components/program/session';
import { Button, CountUp, EASE_OUT, enter, IconButton, IconTile, nativeOnly, ProgressBar, Screen, Sheet, T, tap, type IconName } from '@/components/ui';
import { PROGRAM_DAYS } from '@/data/program';
import { useStore, workoutDays, workoutStreak } from '@/lib/store';
import { C, G, glow, MOTION, R, shadow } from '@/theme';

const toTraining = () => router.dismissTo('/fitness');
const fmtPlain = (n: number) => String(Math.round(n));
const MEDAL = 116;
const STAGE = 232;

const SPARKLES: { icon: IconName; size: number; color: string; style: ViewStyle; delay: number }[] = [
  { icon: 'sparkles', size: 22, color: C.gold, style: { top: 18, left: 18 }, delay: 0 },
  { icon: 'star', size: 14, color: C.accent, style: { top: 6, right: 34 }, delay: 380 },
  { icon: 'sparkles', size: 18, color: C.primary, style: { bottom: 26, right: 12 }, delay: 720 },
  { icon: 'star', size: 11, color: C.gold, style: { bottom: 40, left: 26 }, delay: 1050 },
];

export default function StreakScreen() {
  const p = useLocalSearchParams<{ key?: string; kcal?: string; minutes?: string; exercises?: string; advanced?: string }>();
  const { state, unlockReward } = useStore();
  const [details, setDetails] = useState(false);
  const reduce = useReducedMotion();
  const pop = useSharedValue(0);
  const pulse = useSharedValue(0);
  const bob = useSharedValue(0);

  const days = workoutDays(state).size;
  const streak = workoutStreak(state);
  const cycle = days === 0 ? 0 : ((days - 1) % 7) + 1;
  const away = 7 - cycle;
  // Each completed 7-day cycle unlocks a reward once (kept in the store).
  const rewardId = days > 0 && away === 0 ? `cycle-${days / 7}` : null;
  const rewardUnlocked = !!rewardId && state.unlockedRewards.includes(rewardId);
  useEffect(() => {
    if (rewardId && !rewardUnlocked) unlockReward(rewardId);
  }, [rewardId, rewardUnlocked, unlockReward]);
  const session = findSession(String(p.key ?? ''));
  const meta = session ? sessionMeta(session) : undefined;
  const advanced = p.advanced === '1' && meta?.day !== undefined;

  useEffect(() => {
    pop.set(withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 }));
    if (reduce) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
    bob.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pop, pulse, bob, reduce]);

  const medalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pop.get(), [0, 0.35], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pop.get(), [0, 1], [0.4, 1]) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.get(), [0, 1], [0.32, 0]),
    transform: [{ scale: interpolate(pulse.get(), [0, 1], [1, 1.55]) }],
  }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulse.get(), [0, 0.5, 1], [1, 1.07, 1]) }] }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bob.get(), [0, 1], [0, -4]) }] }));

  const stats: { icon: IconName; color: string; bg: string; value: string; label: string }[] = [
    { icon: 'flame', color: C.accent, bg: C.accentSoft, value: p.kcal ?? '0', label: 'kcal' },
    { icon: 'time', color: C.water, bg: C.waterSoft, value: p.minutes ?? '0', label: p.minutes === '1' ? 'minute' : 'minutes' },
    { icon: 'barbell', color: C.workout, bg: C.workoutSoft, value: p.exercises ?? '0', label: p.exercises === '1' ? 'exercise' : 'exercises' },
  ];

  return (
    <Screen bg={C.card} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <LinearGradient colors={G.glow} style={s.glow} pointerEvents="none" />
      <View style={s.top}>
        <View style={{ width: 40 }} />
        <Text style={s.topTitle}>Workout complete</Text>
        <IconButton icon="close" bordered onPress={toTraining} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.stage}>
            <Svg width={STAGE} height={STAGE} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Circle cx={STAGE / 2} cy={STAGE / 2} r={STAGE / 2 - 2} stroke={C.primaryTint} strokeOpacity={0.55} strokeWidth={1} fill="none" />
              <Circle cx={STAGE / 2} cy={STAGE / 2} r={STAGE / 2 - 30} stroke={C.primaryTint} strokeWidth={1} strokeDasharray="3 6" fill="none" />
            </Svg>
            <Animated.View pointerEvents="none" style={[s.halo, haloStyle]} />
            <Animated.View style={[s.medal, medalStyle]}>
              <LinearGradient colors={G.warm} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.medalFill}>
                <Animated.View style={flameStyle}>
                  <Ionicons name="flame" size={60} color={C.white} />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
            {SPARKLES.map((sp) => (
              <Sparkle key={`${sp.icon}${sp.delay}`} {...sp} reduce={reduce} />
            ))}
          </View>

          <Animated.View entering={enter(2)} style={{ alignItems: 'center' }}>
            <CountUp value={days} format={fmtPlain} fromZero duration={900} style={s.count} />
            <Text style={s.title}>Exercise Days</Text>
            {streak > 1 ? (
              <View style={s.streakLine}>
                <Ionicons name="flame" size={15} color={C.accent} />
                <Text style={T.small}>{`${streak}-day streak — keep it burning!`}</Text>
              </View>
            ) : (
              <Text style={[T.small, { marginTop: 6 }]}>Every workout counts. See you tomorrow!</Text>
            )}
            {advanced && meta?.day !== undefined && (
              <View style={s.dayPill}>
                <Ionicons name={meta.day >= PROGRAM_DAYS ? 'trophy' : 'checkmark-circle'} size={16} color={C.primaryDark} />
                <Text style={s.dayPillText}>{meta.day >= PROGRAM_DAYS ? `Day ${meta.day} complete · Program finished!` : `Day ${meta.day} complete · Next: Day ${meta.day + 1}`}</Text>
              </View>
            )}
          </Animated.View>
        </View>

        <Animated.View entering={enter(4)} style={s.summary}>
          {stats.map((st, i) => {
            const num = Number(st.value);
            return (
              <View key={st.label} style={[s.stat, i > 0 && s.statBorder]}>
                <IconTile icon={st.icon} color={st.color} bg={st.bg} size={36} iconSize={18} />
                {Number.isInteger(num) ? <CountUp value={num} format={fmtPlain} fromZero style={s.statVal} /> : <Text style={s.statVal}>{st.value}</Text>}
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={enter(5)} style={s.reward}>
          <Text style={s.rewardText}>
            {rewardId ? (
              <>
                <Text style={s.rewardStrong}>Amazing! </Text>
                {"You've unlocked this week's reward"}
              </>
            ) : (
              <>
                <Text style={s.rewardStrong}>Well done! </Text>
                {"You're "}
                <Text style={[s.rewardStrong, { color: C.primary }]}>
                  {away} day{away === 1 ? '' : 's'}
                </Text>{' '}
                away from your next exciting reward!
              </>
            )}
          </Text>

          <RewardTrack cycle={cycle} badgeStyle={badgeStyle} />

          <Pressable hitSlop={10} onPress={() => (tap(), setDetails(true))} style={({ pressed }) => [s.details, pressed && { opacity: 0.6 }]}>
            <Text style={s.detailsText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </Pressable>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.enter).delay(420))} style={s.ctaBar}>
        <GradientButton {...PRIMARY} title="Cool!" onPress={toTraining} />
      </Animated.View>

      <Sheet visible={details} onClose={() => setDetails(false)} title="Weekly reward">
        <View style={s.sheetHero}>
          <IconTile icon="gift" color={C.white} bg={C.accent} size={44} />
          <Text style={[T.body, { flex: 1 }]}>
            Work out for <Text style={{ fontWeight: '700', color: C.text }}>7 days</Text> to unlock <Text style={{ fontWeight: '700', color: C.accent }}>50% off Fittelo Premium</Text> — every program day, full analytics and a personal trainer on Pro.
          </Text>
        </View>
        <View style={{ marginTop: 16, gap: 10 }}>
          {['Any workout counts — program days, quick sessions or logged activities.', 'Days don’t need to be consecutive.', 'Your reward is applied automatically at checkout.'].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={C.primary} />
              <Text style={[T.small, { flex: 1, lineHeight: 19 }]}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={s.cycleBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={T.label}>This cycle</Text>
            <Text style={s.cycleVal}>{cycle}/7 days</Text>
          </View>
          <ProgressBar value={cycle / 7} height={10} />
          {state.unlockedRewards.length > 0 && (
            <Text style={[T.small, { marginTop: 8 }]}>
              {state.unlockedRewards.length} reward{state.unlockedRewards.length === 1 ? '' : 's'} unlocked so far
            </Text>
          )}
        </View>
        <Button title="Let's Go!" onPress={() => setDetails(false)} style={{ marginTop: 20, borderRadius: R.pill }} />
      </Sheet>
    </Screen>
  );
}

/** Floating sparkle around the medal: pops in, then drifts + twinkles (static when reduced motion is on). */
function Sparkle({ icon, size, color, style, delay, reduce }: { icon: IconName; size: number; color: string; style: ViewStyle; delay: number; reduce: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [t, delay, reduce]);
  const float = useAnimatedStyle(() => ({
    opacity: reduce ? 0.9 : interpolate(t.get(), [0, 1], [0.35, 1]),
    transform: [{ translateY: interpolate(t.get(), [0, 1], [0, -7]) }, { scale: interpolate(t.get(), [0, 1], [0.85, 1.12]) }],
  }));
  return (
    <Animated.View pointerEvents="none" entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(260 + delay / 3))} style={[s.sparkle, style]}>
      <Animated.View style={float}>
        <Ionicons name={icon} size={size} color={color} />
      </Animated.View>
    </Animated.View>
  );
}

/** 7-day reward track: mint rail with an animated progress fill, staggered day nodes and a bobbing offer badge. */
function RewardTrack({ cycle, badgeStyle }: { cycle: number; badgeStyle: ReturnType<typeof useAnimatedStyle> }) {
  const [w, setW] = useState(0);
  const fill = useSharedValue(0);
  // Fill reaches the centre of the current day's node (nodes: 40 wide, 4px rail padding, space-between).
  const target = w > 0 && cycle > 0 ? Math.min(w, 4 + 20 + ((cycle - 1) * (w - 48)) / 6 + 23) : 0;
  useEffect(() => {
    fill.set(withDelay(450, withTiming(target, { duration: MOTION.progress, easing: EASE_OUT })));
  }, [target, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() }));

  return (
    <View style={s.trackWrap} onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))}>
      <View style={s.trackBg}>
        <Animated.View style={[s.trackFill, fillStyle]} />
      </View>
      <View style={s.nodes}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = i + 1;
          const on = d <= cycle;
          return (
            <Animated.View key={d} entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(380 + i * MOTION.stagger))} style={s.nodeCol}>
              {d === 7 ? (
                <View style={[s.gift, on && s.giftOn]}>
                  <Ionicons name="gift" size={19} color={on ? C.white : C.gold} />
                </View>
              ) : (
                <View style={[s.node, on && s.nodeOn]}>
                  <Ionicons name="checkmark" size={16} color={on ? C.onPrimary : C.border} />
                </View>
              )}
              <Text style={[s.nodeLabel, on && { color: C.primaryDark }]}>Day {d}</Text>
            </Animated.View>
          );
        })}
      </View>
      <Animated.View style={[s.badge, badgeStyle]}>
        <Ionicons name="pricetag" size={11} color={C.white} />
        <Text style={s.badgeText}>50% Off</Text>
        <View style={s.badgeTail} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: C.textSoft },
  hero: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, backgroundColor: C.accent },
  medal: { width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, backgroundColor: C.accent, ...glow(C.accent) },
  medalFill: { flex: 1, borderRadius: MEDAL / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.55)', overflow: 'hidden' },
  sparkle: { position: 'absolute' },
  count: { fontSize: 64, fontWeight: '800', color: C.text, letterSpacing: -2, fontVariant: ['tabular-nums'], marginTop: -6, lineHeight: 72 },
  title: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
  streakLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  dayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: C.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill },
  dayPillText: { color: C.primaryDark, fontWeight: '700', fontSize: 13 },
  summary: { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: R.lg, paddingVertical: 16, marginTop: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: C.border },
  statVal: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 8, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  reward: { marginTop: 16, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  rewardText: { fontSize: 15, color: C.textSoft, lineHeight: 22, textAlign: 'center' },
  rewardStrong: { fontWeight: '800', color: C.text },
  trackWrap: { marginTop: 44 },
  trackBg: { position: 'absolute', left: 0, right: 0, top: 0, height: 46, borderRadius: R.pill, backgroundColor: C.primarySoft, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: R.pill, backgroundColor: C.primaryTint },
  nodes: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  nodeCol: { alignItems: 'center', width: 40 },
  node: { width: 34, height: 34, borderRadius: 17, marginVertical: 6, backgroundColor: C.white, borderWidth: 2, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  nodeOn: { backgroundColor: C.primary, borderColor: C.primary },
  gift: { width: 40, height: 40, borderRadius: 20, marginVertical: 3, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.gold },
  giftOn: { backgroundColor: C.gold },
  nodeLabel: { fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 4 },
  badge: { position: 'absolute', top: -36, right: -6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
  badgeTail: { position: 'absolute', bottom: -5, right: 22, width: 10, height: 10, backgroundColor: C.accent, transform: [{ rotate: '45deg' }] },
  details: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 2, marginTop: 14 },
  detailsText: { color: C.primary, fontWeight: '700', fontSize: 14 },
  ctaBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  sheetHero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cycleBox: { marginTop: 18, backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14 },
  cycleVal: { fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
});
