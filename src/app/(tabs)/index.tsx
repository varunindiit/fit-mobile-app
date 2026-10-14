import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ProgramBadge } from '@/components/home/ProgramBadge';
import { SnapPlateArt } from '@/components/home/SnapPlateArt';
import { WaterBottle } from '@/components/home/WaterBottle';
import { WeekStrip } from '@/components/home/WeekStrip';
import { WeightSparkline } from '@/components/home/WeightSparkline';
import { Bolts } from '@/components/program/PlanAccordion';
import {
  Button,
  Card,
  CountUp,
  Divider,
  EASE_OUT,
  enter,
  IconButton,
  IconTile,
  MacroBar,
  PressableScale,
  Pill,
  ProgressBar,
  Ring,
  Screen,
  SectionTitle,
  Sheet,
  T,
  tap,
  useToast,
  type IconName,
} from '@/components/ui';
import { foodById, MEALS } from '@/data/foods';
import { NOTIFICATIONS } from '@/data/notifications';
import { PLAN_TIERS } from '@/data/plans';
import { programById, programDay, sessionStats } from '@/data/program';
import { fmtDate, kmFromSteps, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore, weekProgress, workoutStreak } from '@/lib/store';
import { C, G, MOTION, R, shadow, shadowSm } from '@/theme';

const TIPS: { icon: IconName; title: string; short: string; body: string }[] = [
  { icon: 'nutrition', title: 'Protein at every meal', short: 'Keeps you fuller for longer', body: 'Add a protein source to each meal: dal, paneer, curd, eggs, sprouts or chicken. Protein keeps you full, protects muscle while you lose fat and reduces evening cravings.' },
  { icon: 'pie-chart', title: 'The ½ plate rule', short: 'Veggies first, then roti/rice', body: 'Fill half your plate with sabzi and salad, a quarter with protein and a quarter with roti or rice. You eat the same volume of food with far fewer calories.' },
  { icon: 'walk', title: '10-minute post-meal walk', short: 'Helps control blood sugar', body: 'A short walk after lunch and dinner improves digestion and blunts blood-sugar spikes. It also adds roughly 1,000 steps to your day.' },
  { icon: 'moon', title: 'Sleep 7–8 hours', short: 'Poor sleep increases hunger', body: 'Short sleep raises hunger hormones and makes you crave sugary, high-calorie food. A consistent bedtime is one of the easiest weight-loss wins.' },
];
const TIP_TINT = [
  { color: C.accent, bg: C.accentSoft },
  { color: C.primaryDark, bg: C.primarySoft },
  { color: C.steps, bg: C.stepsSoft },
  { color: C.water, bg: C.waterSoft },
];
/** One consistent tint per meal slot (icon tile + progress bar). */
const MEAL_TINT: Record<string, { color: string; bg: string; bar: string }> = {
  breakfast: { color: C.warning, bg: C.warningSoft, bar: C.carbs },
  morningSnack: { color: C.accent, bg: C.accentSoft, bar: C.accent },
  lunch: { color: C.primaryDark, bg: C.primarySoft, bar: C.primary },
  eveningSnack: { color: C.steps, bg: C.stepsSoft, bar: C.steps },
  dinner: { color: C.water, bg: C.waterSoft, bar: C.water },
};
const TIP_W = 196;
const RIA_CHIPS: { label: string; icon: IconName }[] = [
  { label: 'Chat with Ria', icon: 'chatbubble-ellipses-outline' },
  { label: 'Meal ideas', icon: 'sparkles' },
];

export default function Home() {
  const { state, targets, setWater, addSteps } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState<(typeof TIPS)[number] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const today = todayKey();
  const p = state.profile;
  const first = p.name.split(' ')[0] || 'there';

  const { total, byMeal } = useMemo(() => dayTotals(state.entries, today), [state.entries, today]);
  const burned = burnedOn(state, today);
  const eaten = Math.round(total.kcal);
  const left = targets.budget - eaten + burned.total;
  const over = left < 0;
  const water = state.water[today] ?? 0;
  const steps = state.steps[today] ?? 0;
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const timeIcon: { name: IconName; color: string } = hour < 12 ? { name: 'sunny', color: C.carbs } : hour < 17 ? { name: 'partly-sunny', color: C.warning } : { name: 'moon', color: C.steps };
  const tracksWeight = p.goal !== 'maintain' && p.goal !== 'healthy';
  const start = p.startWeightKg || p.weightKg;
  const weightProgress = tracksWeight ? Math.abs(start - p.weightKg) / Math.max(0.1, Math.abs(start - p.targetKg)) : 1;
  const proteinGap = Math.max(0, targets.protein - total.protein);
  const premiumTier = state.premium ? PLAN_TIERS.find((x) => x.id === state.premium!.tier) : null;
  const todaysWorkout = state.workouts.find((w) => w.date === today);
  const streak = workoutStreak(state);
  const program = programById(p.program);
  const doneDays = state.programProgress[program.id] ?? 0;
  const nextDay = Math.min(30, doneDays + 1);
  const nextSession = programDay(program.id, nextDay);
  const nextStats = sessionStats(nextSession, state.settings.restSeconds);
  const doneToday = state.workouts.some((w) => w.date === today && w.sessionKey?.startsWith(`program:${program.id}:`));
  const wk = weekProgress(state);
  const recentWeights = useMemo(() => state.weights.slice(-8).map((w) => w.kg), [state.weights]);
  const mealNames = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const e of state.entries) {
      if (e.date !== today) continue;
      const name = foodById(e.foodId)?.name;
      if (name) (out[e.meal] ??= []).push(name);
    }
    return out;
  }, [state.entries, today]);
  const status: { text: string; icon: IconName; color: string; bg: string } = over
    ? { text: 'Over budget', icon: 'alert-circle', color: C.danger, bg: C.dangerSoft }
    : eaten === 0
      ? { text: 'Not started', icon: 'time-outline', color: C.textSoft, bg: C.surfaceAlt }
      : left <= 150
        ? { text: 'On target', icon: 'checkmark-circle', color: C.primaryDark, bg: C.primarySoft }
        : { text: 'On track', icon: 'trending-up', color: C.primaryDark, bg: C.primarySoft };
  const tipTint = TIP_TINT[Math.max(0, tip ? TIPS.indexOf(tip) : 0) % TIP_TINT.length];
  const openDay = () => router.push({ pathname: '/program-day', params: { key: nextSession.key } });

  // Status-bar scrim fades in once content scrolls under it (the glow sits behind the bar at rest).
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, 28], [0, 1], Extrapolation.CLAMP) }));

  const sync = () => {
    setSyncing(true);
    setTimeout(() => {
      const n = 300 + Math.round(Math.random() * 600);
      addSteps(n);
      setSyncing(false);
      toast(`Synced ${n.toLocaleString('en-IN')} new steps`, 'footsteps');
    }, 1100);
  };

  const ria = proteinGap > 25
    ? `You're ${Math.round(proteinGap)} g short on protein today. A bowl of sprouts salad or 2 boiled eggs at your next meal would close the gap.`
    : left > 600
      ? `You have ${left.toLocaleString('en-IN')} kcal left. Plan a balanced dinner: 2 rotis, dal and a big bowl of sabzi fits perfectly.`
      : over
        ? `You're ${Math.abs(left)} kcal over budget. A 30-minute brisk walk burns about 140 kcal — want to try one?`
        : `Great balance today, ${first}! Keep your water up — ${Math.max(0, targets.water - water)} more glasses to go.`;

  return (
    <Screen edges={[]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}>
        <LinearGradient pointerEvents="none" colors={G.glow} style={[st.glow, { height: insets.top + 320 }]} />

        {/* Header */}
        <Animated.View entering={enter(0)} style={st.header}>
          <PressableScale
            scaleTo={0.92}
            onPress={() => {
              tap();
              router.push('/profile');
            }}
            style={st.avatarWrap}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Profile">
            <LinearGradient colors={G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.avatarRing}>
              <View style={st.avatar}>
                <Text style={st.avatarText}>{(first[0] ?? 'F').toUpperCase()}</Text>
              </View>
            </LinearGradient>
            {premiumTier && (
              <View style={st.premiumDot}>
                <Ionicons name="diamond" size={9} color={C.gold} />
              </View>
            )}
          </PressableScale>
          <View style={{ flex: 1 }}>
            <View style={st.greetRow}>
              <Ionicons name={timeIcon.name} size={14} color={timeIcon.color} />
              <Text style={st.greet} numberOfLines={1}>
                {greet} · {fmtDate(today)}
              </Text>
            </View>
            <Text style={st.hello} numberOfLines={1}>
              Hi, {first}
            </Text>
          </View>
          <PressableScale
            scaleTo={0.94}
            onPress={() => {
              tap();
              router.push('/history');
            }}
            style={st.streak}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${streak} day streak`}>
            <View style={st.streakIcon}>
              <Ionicons name="flame" size={14} color={C.accent} />
            </View>
            <Text style={st.streakText}>{streak}</Text>
          </PressableScale>
          <IconButton icon="notifications-outline" bordered badge={unread} onPress={() => router.push('/notifications')} />
        </Animated.View>

        {/* Calorie budget (hero) */}
        <Animated.View entering={enter(1)}>
          <Card onPress={() => router.push('/diary')} style={st.hero}>
            <View style={st.rowBetween}>
              <View style={st.heroTitle}>
                <Text style={T.h3} numberOfLines={1}>
                  Calorie budget
                </Text>
                <Pill text={status.text} icon={status.icon} color={status.color} bg={status.bg} />
              </View>
              <View style={st.link}>
                <Text style={st.linkText}>Diary</Text>
                <Ionicons name="chevron-forward" size={15} color={C.primary} />
              </View>
            </View>
            <View style={st.heroBody}>
              <Ring
                size={140}
                stroke={13}
                value={eaten / (targets.budget + burned.total)}
                color={over ? C.danger : C.primary}
                track={over ? C.dangerSoft : C.borderSoft}
                gradient={over ? undefined : G.brand}>
                <CountUp value={Math.abs(left)} fromZero style={[st.ringNum, over && { color: C.danger }]} />
                <Text style={[st.ringLbl, over && { color: C.danger }]}>{over ? 'KCAL OVER' : 'KCAL LEFT'}</Text>
              </Ring>
              <View style={st.statCol}>
                <Stat icon="restaurant" color={C.primaryDark} bg={C.primarySoft} label="Eaten" value={eaten} />
                <Stat icon="flame" color={C.accent} bg={C.accentSoft} label="Burned" value={burned.total} />
                <Stat icon="flag" color={C.textSoft} bg={C.surfaceAlt} label="Budget" value={targets.budget} />
              </View>
            </View>
            <Divider style={{ marginTop: 18, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <MacroBar label="Carbs" value={total.carbs} target={targets.carbs} color={C.carbs} />
              <MacroBar label="Protein" value={total.protein} target={targets.protein} color={C.protein} />
              <MacroBar label="Fat" value={total.fat} target={targets.fat} color={C.fat} />
              <MacroBar label="Fiber" value={total.fiber} target={targets.fiber} color={C.fiber} />
            </View>
          </Card>
        </Animated.View>

        {/* Ria insight (AI) */}
        <Animated.View entering={enter(2)}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              router.push('/coach');
            }}
            style={st.ria}
            accessibilityRole="button">
            <View style={st.riaHead}>
              <View style={st.riaIcon}>
                <Ionicons name="sparkles" size={15} color={C.ai} />
              </View>
              <Text style={st.riaTitle}>Ria&apos;s insight</Text>
              <Ionicons name="chevron-forward" size={16} color={C.ai} />
            </View>
            <Text style={st.riaText}>{ria}</Text>
            <View style={st.riaChips}>
              {RIA_CHIPS.map((c) => (
                <PressableScale
                  key={c.label}
                  scaleTo={0.95}
                  onPress={() => {
                    tap();
                    router.push('/coach');
                  }}
                  style={st.riaChip}>
                  <Ionicons name={c.icon} size={14} color={C.ai} />
                  <Text style={st.riaChipText}>{c.label}</Text>
                </PressableScale>
              ))}
            </View>
          </PressableScale>
        </Animated.View>

        {/* Snap CTA */}
        <Animated.View entering={enter(3)}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              router.push('/snap');
            }}
            style={st.snap}
            accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={st.snapTitle}>Snap your plate</Text>
                <View style={st.aiTag}>
                  <Text style={st.aiTagText}>AI</Text>
                </View>
              </View>
              <Text style={[T.small, { marginTop: 3 }]}>Instant calories & macros with AI</Text>
              <View style={st.snapCta}>
                <Ionicons name="camera" size={14} color={C.white} />
                <Text style={st.snapCtaText}>Scan a meal</Text>
              </View>
            </View>
            <View style={st.snapArt}>
              <SnapPlateArt />
            </View>
          </PressableScale>
        </Animated.View>

        {/* Daily challenge (30-day program) */}
        <Animated.View entering={enter(4)}>
          <SectionTitle title="Daily challenge" action="Change plan" onAction={() => router.push('/select-plan')} />
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              openDay();
            }}
            style={st.challengeWrap}
            accessibilityRole="button">
            <LinearGradient colors={program.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.challenge}>
              <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Circle cx="88%" cy="18%" r={92} fill={C.white} opacity={0.08} />
                <Circle cx="98%" cy="96%" r={64} fill={C.white} opacity={0.06} />
              </Svg>
              <View style={st.rowBetween}>
                <View style={st.chTag}>
                  <Text style={st.chTagText}>{program.title}</Text>
                  <Bolts n={program.bolts} />
                </View>
                <Text style={st.chCount}>{doneDays}/30 days</Text>
              </View>
              <View style={st.chMid}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={st.challengeDay}>Day {doneToday ? doneDays : nextDay}</Text>
                    {doneToday && <Ionicons name="checkmark-circle" size={24} color={C.white} />}
                  </View>
                  <Text style={st.challengeMeta}>
                    {doneToday ? 'Done for today — great work!' : nextSession.restDay ? 'Rest & recovery day' : `${nextStats.exercises} exercises · ${nextStats.minutes} min · ~${nextStats.kcal} kcal`}
                  </Text>
                </View>
                <ProgramBadge emoji={program.emoji} progress={doneDays / 30} />
              </View>
              <View style={[st.rowBetween, { marginTop: 16 }]}>
                <Text style={st.chWeek}>
                  This week {wk.done}/{p.weeklyGoal} workouts
                </Text>
                <View style={st.challengeBtn}>
                  <Ionicons name={doneToday ? 'eye' : 'play'} size={13} color={program.colors[1]} />
                  <Text style={[st.challengeBtnText, { color: program.colors[1] }]}>{doneToday ? 'VIEW' : 'START'}</Text>
                </View>
              </View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        {/* Meals */}
        <Animated.View entering={enter(5)}>
          <SectionTitle title="Today's meals" action="View diary" onAction={() => router.push('/diary')} />
          <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
            {MEALS.map((m, i) => {
              const kcal = Math.round(byMeal[m.key]?.kcal ?? 0);
              const rec = Math.round(targets.budget * m.share);
              const names = mealNames[m.key] ?? [];
              const tint = MEAL_TINT[m.key] ?? MEAL_TINT.lunch;
              const logged = kcal > 0;
              return (
                <View key={m.key}>
                  <Pressable onPress={() => router.push('/diary')} style={({ pressed }) => [st.meal, pressed && { backgroundColor: C.surfaceAlt }]}>
                    <View>
                      <IconTile icon={m.icon as IconName} size={42} color={tint.color} bg={tint.bg} />
                      {logged && (
                        <View style={st.mealCheck}>
                          <Ionicons name="checkmark" size={10} color={C.white} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={st.mealHead}>
                        <Text style={st.mealTitle} numberOfLines={1}>
                          {m.label}
                        </Text>
                        {logged && (
                          <Text style={st.mealKcal}>
                            {kcal}
                            <Text style={st.unit}> kcal</Text>
                          </Text>
                        )}
                      </View>
                      <Text style={[T.small, { marginTop: 1 }]} numberOfLines={1}>
                        {names.length ? names.join(', ') : `Recommended ${Math.round(rec * 0.9)}–${Math.round(rec * 1.1)} kcal`}
                      </Text>
                      <ProgressBar value={rec > 0 ? kcal / rec : 0} color={tint.bar} track={C.borderSoft} height={3} style={{ marginTop: 7 }} />
                    </View>
                    <IconButton icon="add" size={20} bg={C.primaryDark} color={C.white} style={{ width: 34, height: 34 }} onPress={() => router.push({ pathname: '/food-search', params: { meal: m.key } })} />
                  </Pressable>
                  {i < MEALS.length - 1 && <View style={st.sep} />}
                </View>
              );
            })}
          </Card>
        </Animated.View>

        {/* Water */}
        <Animated.View entering={enter(6)}>
          <SectionTitle title="Water" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <WaterBottle value={targets.water > 0 ? water / targets.water : 0} />
              <View style={{ flex: 1 }}>
                <CountUp value={water} style={st.waterNum}>
                  <Text style={st.waterOf}> / {targets.water} glasses</Text>
                </CountUp>
                <Text style={T.small} numberOfLines={1}>
                  {(water * 250).toLocaleString('en-IN')} ml of {targets.water * 250} ml
                </Text>
                <Text style={st.waterHint} numberOfLines={1}>
                  {water >= targets.water ? 'Daily goal reached' : `${targets.water - water} more to go`}
                </Text>
              </View>
              <IconButton icon="remove" bg={C.waterSoft} color={C.water} onPress={() => setWater(water - 1)} />
              <IconButton
                icon="add"
                bg={C.water}
                color={C.white}
                onPress={() => {
                  setWater(water + 1);
                  if (water + 1 === targets.water) toast('Water goal reached! 💧', 'trophy');
                }}
              />
            </View>
            <View style={st.glasses}>
              {Array.from({ length: Math.max(targets.water, water) }).map((_, i) => (
                <Glass
                  key={i}
                  index={i}
                  filled={i < water}
                  onPress={() => {
                    tap();
                    setWater(i + 1 === water ? i : i + 1);
                  }}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Steps & workout */}
        <Animated.View entering={enter(7)}>
          <SectionTitle title="Activity" action="See all" onAction={() => router.push('/fitness')} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1 }} onPress={() => router.push('/fitness')}>
              <View style={st.tileHead}>
                <IconTile icon="footsteps" color={C.steps} bg={C.stepsSoft} size={30} />
                <Text style={st.tileLabel}>Steps</Text>
              </View>
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Ring size={96} stroke={9} value={steps / targets.stepGoal} color={C.steps} track={C.stepsSoft}>
                  <CountUp value={steps} style={st.stepsNum} />
                  <Text style={T.tiny}>/ {(targets.stepGoal / 1000).toFixed(0)}k</Text>
                </Ring>
              </View>
              <Text style={[T.small, { textAlign: 'center', marginTop: 10 }]} numberOfLines={1}>
                {kmFromSteps(steps)} km · {Math.round(steps * 0.04)} kcal
              </Text>
              <View style={st.tileSpacer} />
              <Button title="Sync" small variant="outline" icon="sync" loading={syncing} onPress={sync} style={{ height: 36 }} />
            </Card>
            <Card style={{ flex: 1 }} onPress={() => router.push('/fitness')}>
              <View style={st.tileHead}>
                <IconTile icon="barbell" color={C.workout} bg={C.workoutSoft} size={30} />
                <Text style={st.tileLabel}>Workout</Text>
              </View>
              <CountUp value={wk.done} style={[T.h2, T.num, { marginTop: 12 }]}>
                <Text style={st.unitLg}> / {p.weeklyGoal}</Text>
              </CountUp>
              <Text style={T.small} numberOfLines={1}>
                this week · {burned.workoutKcal} kcal today
              </Text>
              <View style={{ marginTop: 10 }}>
                <WeekStrip week={wk.week} done={wk.days} today={today} />
              </View>
              <View style={st.workoutPill}>
                <View style={st.workoutArt}>
                  {todaysWorkout ? <Text style={{ fontSize: 18 }}>{todaysWorkout.emoji}</Text> : <Ionicons name="flame" size={17} color={C.workout} />}
                </View>
                <Text style={st.workoutName} numberOfLines={2}>
                  {todaysWorkout ? todaysWorkout.title : `${program.title} · Day ${nextDay}`}
                </Text>
              </View>
              <View style={st.tileSpacer} />
              <Button title={todaysWorkout ? 'Log more' : 'Start'} small variant="secondary" onPress={() => (todaysWorkout ? router.push('/fitness') : openDay())} style={{ height: 36 }} />
            </Card>
          </View>
        </Animated.View>

        {/* Weight */}
        <Animated.View entering={enter(8)}>
          <SectionTitle title="Weight" action="Progress" onAction={() => router.push('/progress')} />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon="scale-outline" color={C.weight} bg={C.weightSoft} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={T.tiny}>CURRENT</Text>
                <Text style={[T.h2, T.num]}>
                  {p.weightKg.toFixed(1)}
                  <Text style={st.unitLg}> kg</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={T.tiny}>{tracksWeight ? 'GOAL' : 'MAINTAIN'}</Text>
                <Text style={[T.h3, T.num, { color: C.weight, marginTop: 2 }]}>{(tracksWeight ? p.targetKg : p.weightKg).toFixed(1)} kg</Text>
              </View>
            </View>
            {recentWeights.length >= 2 && (
              <View style={{ marginTop: 14 }}>
                <WeightSparkline values={recentWeights} goal={tracksWeight ? p.targetKg : undefined} />
              </View>
            )}
            <ProgressBar value={weightProgress} color={C.weight} track={C.weightSoft} style={{ marginTop: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 }}>
              <Text style={[T.small, { flex: 1 }]}>
                {tracksWeight
                  ? `${Math.abs(start - p.weightKg).toFixed(1)} kg ${p.goal === 'lose' ? 'lost' : 'gained'} · ${Math.abs(p.weightKg - p.targetKg).toFixed(1)} kg to go`
                  : 'Keep logging weekly to stay on track'}
              </Text>
              <Button title="Log weight" small icon="add" onPress={() => router.push({ pathname: '/progress', params: { log: String(Date.now()) } })} />
            </View>
          </Card>
        </Animated.View>

        {/* Premium */}
        <Animated.View entering={enter(9)}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              router.push(premiumTier ? '/coach' : '/plans');
            }}
            style={st.premiumWrap}
            accessibilityRole="button">
            <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.premium}>
              <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Circle cx="92%" cy="10%" r={86} fill={C.gold} opacity={0.07} />
                <Circle cx="78%" cy="110%" r={70} fill={C.white} opacity={0.04} />
              </Svg>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="diamond" size={12} color={C.gold} />
                  <Text style={st.premiumLabel}>{premiumTier ? 'ACTIVE PLAN' : 'FITORA PRO'}</Text>
                </View>
                <Text style={st.premiumTitle}>{premiumTier ? `You're on ${premiumTier.name}` : 'Get a personal nutritionist & trainer'}</Text>
                <Text style={st.premiumSub}>{premiumTier ? 'Ask your coach anything, anytime' : 'Custom plans · weekly check-ins · up to 40% off'}</Text>
                <View style={st.premiumBtn}>
                  <Text style={st.premiumBtnText}>{premiumTier ? 'Talk to coach' : 'Explore plans'}</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.navy} />
                </View>
              </View>
              <View style={st.premiumArt}>
                <Ionicons name="diamond" size={30} color={C.gold} />
              </View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={enter(10)}>
          <SectionTitle title="Tips for you" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TIP_W + 12}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            style={{ marginHorizontal: -16 }}>
            {TIPS.map((x, i) => (
              <Card key={x.title} onPress={() => setTip(x)} style={st.tip}>
                <IconTile icon={x.icon} size={44} color={TIP_TINT[i % TIP_TINT.length].color} bg={TIP_TINT[i % TIP_TINT.length].bg} />
                <Text style={st.tipTitle} numberOfLines={2}>
                  {x.title}
                </Text>
                <Text style={st.tipShort} numberOfLines={2}>
                  {x.short}
                </Text>
                <View style={[st.link, { marginTop: 12 }]}>
                  <Text style={st.linkText}>Read tip</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.primary} />
                </View>
              </Card>
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.ScrollView>

      {/* Solid strip behind the status bar once content scrolls under it */}
      <Animated.View pointerEvents="none" style={[st.scrim, { height: insets.top }, scrim]} />

      <Sheet visible={!!tip} onClose={() => setTip(null)} title={tip?.title}>
        <View style={[st.sheetArt, { backgroundColor: tipTint.bg }]}>
          <Ionicons name={tip?.icon ?? 'bulb'} size={40} color={tipTint.color} />
        </View>
        <Text style={[T.body, { marginTop: 16 }]}>{tip?.body}</Text>
        <Button
          title="Ask Ria about this"
          variant="secondary"
          icon="sparkles"
          style={{ marginTop: 20 }}
          onPress={() => {
            setTip(null);
            setTimeout(() => router.push('/coach'), 250);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function Stat({ icon, color, bg, label, value }: { icon: IconName; color: string; bg: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconTile icon={icon} color={color} bg={bg} size={36} />
      <View>
        <Text style={T.tiny}>{label.toUpperCase()}</Text>
        <CountUp value={Math.round(value)} style={st.statVal}>
          <Text style={st.unit}> kcal</Text>
        </CountUp>
      </View>
    </View>
  );
}

/** One glass in the water tracker; the fill rises/falls when toggled. */
function Glass({ index, filled, onPress }: { index: number; filled: boolean; onPress: () => void }) {
  const level = useSharedValue(0);
  const seen = useRef(false);
  useEffect(() => {
    // Cascade on first mount, then respond immediately to taps.
    const delay = seen.current ? 0 : index * 45;
    seen.current = true;
    level.set(withDelay(delay, withTiming(filled ? 1 : 0, { duration: MOTION.enter, easing: EASE_OUT })));
  }, [filled, index, level]);
  const fill = useAnimatedStyle(() => ({ height: `${level.get() * 100}%` }));
  return (
    <PressableScale scaleTo={0.88} hitSlop={4} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Glass ${index + 1}`} accessibilityState={{ checked: filled }}>
      <View style={[st.glass, filled && { borderColor: C.water }]}>
        <Animated.View style={[st.glassFill, fill]} />
        <Ionicons name="water" size={12} color={filled ? C.white : C.border} />
      </View>
    </PressableScale>
  );
}

const st = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 14 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, ...shadowSm },
  avatarRing: { width: 48, height: 48, borderRadius: 24, padding: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  avatarText: { color: C.white, fontWeight: '700', fontSize: 18 },
  premiumDot: { position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greet: { flexShrink: 1, fontSize: 13, color: C.textSoft, fontWeight: '500' },
  hello: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingLeft: 5, paddingRight: 12, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, ...shadowSm },
  streakIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  streakText: { fontWeight: '700', color: C.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: C.primary, fontWeight: '600', fontSize: 13 },
  hero: { padding: 16 },
  heroTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  heroBody: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  statCol: { flex: 1, marginLeft: 16, gap: 14, alignSelf: 'stretch', justifyContent: 'center' },
  ringNum: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ringLbl: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 0.8, marginTop: 1 },
  statVal: { fontSize: 17, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  unit: { fontSize: 12, color: C.muted, fontWeight: '500' },
  unitLg: { fontSize: 14, color: C.muted, fontWeight: '500', letterSpacing: 0 },
  ria: { marginTop: 14, backgroundColor: C.aiSoft, borderRadius: R.lg, borderWidth: 1, borderColor: C.aiBorder, padding: 16 },
  riaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riaIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.card, borderWidth: 1, borderColor: C.aiBorder, alignItems: 'center', justifyContent: 'center' },
  riaTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ai },
  riaText: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 10 },
  riaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  riaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.aiBorder },
  riaChipText: { fontSize: 13, fontWeight: '600', color: C.ai },
  snap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  snapCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, height: 32, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.primaryDark },
  snapCtaText: { color: C.white, fontWeight: '700', fontSize: 13 },
  snapArt: { width: 92, height: 84, borderRadius: R.md, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  snapTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  aiTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  aiTagText: { fontSize: 10, fontWeight: '800', color: C.ai, letterSpacing: 0.4 },
  challengeWrap: { borderRadius: R.lg, ...shadow },
  challenge: { borderRadius: R.lg, padding: 16, overflow: 'hidden' },
  chTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, height: 26, borderRadius: R.pill },
  chTagText: { color: C.white, fontWeight: '700', fontSize: 12 },
  chCount: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 12, fontVariant: ['tabular-nums'] },
  chMid: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  challengeDay: { color: C.white, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  challengeMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '500', marginTop: 2 },
  chWeek: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', flex: 1 },
  challengeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 14, height: 34 },
  challengeBtnText: { fontWeight: '800', fontSize: 12, letterSpacing: 0.8 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  sep: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft, marginLeft: 70 },
  mealHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  mealTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  mealKcal: { fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  mealCheck: { position: 'absolute', right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, borderWidth: 2, borderColor: C.card, alignItems: 'center', justifyContent: 'center' },
  waterNum: { fontSize: 22, fontWeight: '800', color: C.water, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  waterOf: { fontSize: 14, color: C.muted, fontWeight: '500', letterSpacing: 0 },
  waterHint: { fontSize: 12, fontWeight: '700', color: C.water, marginTop: 3 },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'space-between' },
  glass: { width: 28, height: 36, borderWidth: 1.5, borderColor: C.border, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceAlt },
  glassFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.water },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileLabel: { fontWeight: '600', color: C.textSoft, fontSize: 14 },
  tileSpacer: { flex: 1, minHeight: 12 },
  stepsNum: { fontWeight: '800', fontSize: 17, color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  workoutPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceAlt, borderRadius: R.sm, padding: 8, marginTop: 12 },
  workoutArt: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  workoutName: { flex: 1, fontSize: 12, fontWeight: '600', color: C.text, lineHeight: 16 },
  premiumWrap: { marginTop: 26, borderRadius: R.lg, ...shadow },
  premium: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 16, overflow: 'hidden', gap: 12 },
  premiumLabel: { color: C.gold, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  premiumTitle: { color: C.white, fontWeight: '700', fontSize: 18, marginTop: 6, letterSpacing: -0.3 },
  premiumSub: { color: 'rgba(255,255,255,0.72)', marginTop: 4, fontSize: 13, lineHeight: 18 },
  premiumBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.gold, alignSelf: 'flex-start', paddingHorizontal: 14, height: 36, borderRadius: R.sm, marginTop: 14 },
  premiumBtnText: { fontWeight: '700', color: C.navy, fontSize: 14 },
  premiumArt: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(245,196,81,0.12)', borderWidth: 1, borderColor: 'rgba(245,196,81,0.28)', alignItems: 'center', justifyContent: 'center' },
  tip: { width: TIP_W },
  tipTitle: { fontSize: 15, lineHeight: 20, height: 40, fontWeight: '700', color: C.text, marginTop: 12, letterSpacing: -0.2 },
  tipShort: { fontSize: 13, lineHeight: 18, height: 36, color: C.textSoft, marginTop: 4 },
  sheetArt: { width: 84, height: 84, borderRadius: 28, backgroundColor: C.surfaceAlt, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
