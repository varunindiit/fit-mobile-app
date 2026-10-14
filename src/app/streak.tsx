import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientButton, PRIMARY_COLORS } from '@/components/program/GradientButton';
import { findSession, sessionMeta } from '@/components/program/session';
import { Button, IconButton, ProgressBar, Screen, Sheet, T, tap, type IconName } from '@/components/ui';
import { PROGRAM_DAYS } from '@/data/program';
import { useStore, workoutDays, workoutStreak } from '@/lib/store';
import { C, R, shadow } from '@/theme';

const ND = Platform.OS !== 'web';
const toTraining = () => router.dismissTo('/fitness');

export default function StreakScreen() {
  const p = useLocalSearchParams<{ key?: string; kcal?: string; minutes?: string; exercises?: string; advanced?: string }>();
  const { state } = useStore();
  const [details, setDetails] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  const days = workoutDays(state).size;
  const streak = workoutStreak(state);
  const cycle = days === 0 ? 0 : ((days - 1) % 7) + 1;
  const away = 7 - cycle;
  const session = findSession(String(p.key ?? ''));
  const meta = session ? sessionMeta(session) : undefined;
  const advanced = p.advanced === '1' && meta?.day !== undefined;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: ND }).start();
    const ease = Easing.inOut(Easing.quad);
    const loop = (v: Animated.Value, d: number) =>
      Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: d, easing: ease, useNativeDriver: ND }), Animated.timing(v, { toValue: 0, duration: d, easing: ease, useNativeDriver: ND })]));
    const a = loop(pulse, 1100);
    const b = loop(bob, 700);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pop, pulse, bob]);

  const stats: { icon: IconName; color: string; value: string; label: string }[] = [
    { icon: 'flame', color: C.accent, value: p.kcal ?? '0', label: 'kcal' },
    { icon: 'time', color: C.protein, value: p.minutes ?? '0', label: 'minutes' },
    { icon: 'barbell', color: C.workout, value: p.exercises ?? '0', label: 'exercises' },
  ];

  return (
    <Screen bg={C.card} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={s.top}>
        <View style={{ width: 40 }} />
        <Text style={s.topTitle}>Workout complete</Text>
        <IconButton icon="close" bg={C.bg} onPress={toTraining} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          {['✨', '⭐', '✨'].map((e, i) => (
            <Animated.Text key={i} style={[s.sparkle, [{ top: 10, left: 40 }, { top: 0, right: 50 }, { bottom: 30, right: 30 }][i], { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [1, 0.3] : [0.3, 1] }) }]}>
              {e}
            </Animated.Text>
          ))}
          <Animated.View style={[s.flameRow, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]}>
            <Animated.Text style={[s.flame, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>🔥</Animated.Text>
            <Text style={s.count}>{days}</Text>
          </Animated.View>
          <Text style={s.title}>Exercise Days</Text>
          <Text style={[T.small, { marginTop: 4 }]}>{streak > 1 ? `🔥 ${streak}-day streak — keep it burning!` : 'Every workout counts. See you tomorrow!'}</Text>
          {advanced && meta?.day !== undefined && (
            <View style={s.dayPill}>
              <Ionicons name="checkmark-circle" size={16} color={C.primaryDark} />
              <Text style={s.dayPillText}>{meta.day >= PROGRAM_DAYS ? `Day ${meta.day} complete · Program finished! 🏆` : `Day ${meta.day} complete ✓ · Next: Day ${meta.day + 1}`}</Text>
            </View>
          )}
        </View>

        <View style={s.summary}>
          {stats.map((st, i) => (
            <View key={st.label} style={[s.stat, i > 0 && { borderLeftWidth: 1, borderLeftColor: C.borderSoft }]}>
              <Ionicons name={st.icon} size={20} color={st.color} />
              <Text style={s.statVal}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.reward}>
          <Text style={s.rewardText}>
            {away === 0 ? (
              <>
                <Text style={{ fontWeight: '900', color: C.text }}>Amazing! </Text>You've unlocked this week's reward 🎉
              </>
            ) : (
              <>
                <Text style={{ fontWeight: '900', color: C.text }}>Well done! </Text>You're <Text style={{ fontWeight: '900', color: C.primary }}>{away} day{away === 1 ? '' : 's'}</Text> away from your next exciting reward!
              </>
            )}
          </Text>

          <View style={s.trackWrap}>
            <View style={s.trackBg} />
            <View style={s.nodes}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = i + 1;
                const on = d <= cycle;
                return (
                  <View key={d} style={s.nodeCol}>
                    {d === 7 ? (
                      <View style={[s.gift, on && { backgroundColor: C.gold }]}>
                        <Text style={{ fontSize: 20 }}>🎁</Text>
                      </View>
                    ) : (
                      <View style={[s.node, on && { backgroundColor: C.primary, borderColor: C.primary }]}>
                        <Ionicons name="checkmark" size={16} color={on ? C.white : C.border} />
                      </View>
                    )}
                    <Text style={[s.nodeLabel, on && { color: C.primaryDark }]}>Day {d}</Text>
                  </View>
                );
              })}
            </View>
            <Animated.View style={[s.badge, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}>
              <Text style={s.badgeText}>🏷️ 50% Off</Text>
              <View style={s.badgeTail} />
            </Animated.View>
          </View>

          <Pressable hitSlop={10} onPress={() => (tap(), setDetails(true))} style={s.details}>
            <Text style={s.detailsText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <GradientButton title="Cool!" colors={PRIMARY_COLORS} onPress={toTraining} />
      </View>

      <Sheet visible={details} onClose={() => setDetails(false)} title="Weekly reward 🎁">
        <Text style={T.body}>
          Work out for <Text style={{ fontWeight: '800', color: C.text }}>7 days</Text> to unlock <Text style={{ fontWeight: '800', color: C.accent }}>50% off Fitora Premium</Text> — personal coach, custom meal plans and every training program.
        </Text>
        <View style={{ marginTop: 16, gap: 10 }}>
          {['Any workout counts — program days, quick sessions or logged activities.', 'Days don’t need to be consecutive.', 'Your reward is applied automatically at checkout.'].map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="checkmark-circle" size={18} color={C.primary} />
              <Text style={[T.small, { flex: 1, lineHeight: 19 }]}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={T.label}>This cycle</Text>
            <Text style={{ fontWeight: '800', color: C.text }}>{cycle}/7 days</Text>
          </View>
          <ProgressBar value={cycle / 7} height={10} />
        </View>
        <Button title="Let's Go!" onPress={() => setDetails(false)} style={{ marginTop: 20, borderRadius: R.pill }} />
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.muted },
  hero: { alignItems: 'center', paddingTop: 16, paddingBottom: 8 },
  sparkle: { position: 'absolute', fontSize: 22 },
  flameRow: { flexDirection: 'row', alignItems: 'center' },
  flame: { fontSize: 112, lineHeight: 132 },
  count: { fontSize: 88, fontWeight: '900', color: C.text, marginLeft: 6, letterSpacing: -2 },
  title: { fontSize: 28, fontWeight: '900', color: C.text, marginTop: 2 },
  dayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: C.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill },
  dayPillText: { color: C.primaryDark, fontWeight: '800', fontSize: 13 },
  summary: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.lg, paddingVertical: 14, marginTop: 20 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 22, fontWeight: '900', color: C.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  reward: { marginTop: 18, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderSoft, ...shadow },
  rewardText: { fontSize: 15, color: C.textSoft, lineHeight: 22, textAlign: 'center' },
  trackWrap: { marginTop: 44 },
  trackBg: { position: 'absolute', left: 0, right: 0, top: 0, height: 46, borderRadius: R.pill, backgroundColor: C.primarySoft },
  nodes: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  nodeCol: { alignItems: 'center', width: 40 },
  node: { width: 34, height: 34, borderRadius: 17, marginVertical: 6, backgroundColor: C.white, borderWidth: 2, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  gift: { width: 40, height: 40, borderRadius: 20, marginVertical: 3, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.gold },
  nodeLabel: { fontSize: 10, fontWeight: '700', color: C.muted, marginTop: 4 },
  badge: { position: 'absolute', top: -36, right: -6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '900' },
  badgeTail: { position: 'absolute', bottom: -5, right: 22, width: 10, height: 10, backgroundColor: C.accent, transform: [{ rotate: '45deg' }] },
  details: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 2, marginTop: 14 },
  detailsText: { color: C.primary, fontWeight: '800', fontSize: 14 },
});
