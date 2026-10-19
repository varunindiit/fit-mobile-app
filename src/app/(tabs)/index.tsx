import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle } from 'react-native-svg';

import { AssignedCoachCard } from '@/components/home/AssignedCoachCard';
import { CalorieCard } from '@/components/home/CalorieCard';
import { SnapPlateArt } from '@/components/home/SnapPlateArt';
import { WaterBottle } from '@/components/home/WaterBottle';
import { WeekStrip } from '@/components/home/WeekStrip';
import { WeightSparkline } from '@/components/home/WeightSparkline';
import { ChallengeCard } from '@/components/program/ChallengeCard';
import { sessionArt } from '@/components/glyphs';
import {
  Button,
  Card,
  CountUp,
  EASE_OUT,
  enter,
  IconButton,
  IconTile,
  PressableScale,
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
import { proSession } from '@/data/proDemos';
import { dayShort, fmtDate, kmFromSteps } from '@/lib/calc';
import { burnedOn, dayTotals, isPremiumActive, useStore, weekProgress, workoutStreak } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { trainerById, firstName as trainerFirstName } from '@/data/trainers';
import { useToday } from '@/lib/useToday';
import { C, G, ink, MOTION, R, shadow, shadowSm } from '@/theme';

const HERO_IMAGE = require('@/assets/images/home-hero.jpg');
/** Visible photo height below the status bar (the sheet overlaps its last ~28 px). */
const HERO_BODY = 330;
/** How far the photo runs under the first card, which floats over its bottom edge. */
const HERO_OVERLAP = 76;
/** How far down the calorie card the photo reaches. */
const HERO_CUT = 0.7;
const GLASS = 'rgba(255,255,255,0.2)';

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
const TIP_W = 248;
const TIP_TAG: Record<string, string> = { nutrition: 'Nutrition', 'pie-chart': 'Portions', walk: 'Activity', moon: 'Sleep' };
const RIA_CHIPS: { label: string; icon: IconName; q?: string }[] = [
  { label: 'Ask Saathi', icon: 'chatbubble-ellipses-outline' },
  { label: 'What should I eat?', icon: 'restaurant-outline', q: 'What should I eat next?' },
];

export default function Home() {
  const { state, targets, setWater, addWater, addSteps } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState<(typeof TIPS)[number] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const today = useToday();
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
  const premiumTier = isPremiumActive(state.premium) ? PLAN_TIERS.find((x) => x.id === state.premium!.tier) : null;
  const access = useAccess();
  // Pro members land on their coaching dashboard; Smart on the AI coach; Free on the paywall.
  const coach = trainerById(state.trainerId);
  const premiumCard = access.can('trainer')
    ? { href: '/trainer' as const, label: 'YOUR COACH', title: `${trainerFirstName(coach)} is your coach`, sub: 'Plans, chat and calls — all in one place', cta: 'Open coaching' }
    : premiumTier
      ? { href: '/coach' as const, label: 'ACTIVE PLAN', title: `You're on ${premiumTier.name}`, sub: 'Ask your coach anything, anytime', cta: 'Talk to coach' }
      : { href: '/plans' as const, label: 'FITTELO PRO', title: 'Get a personal nutritionist & trainer', sub: 'Custom plans · weekly check-ins · up to 40% off', cta: 'Explore plans' };
  const todaysWorkout = state.workouts.find((w) => w.date === today);
  const streak = workoutStreak(state);
  const program = programById(p.program);
  const doneDays = state.programProgress[program.id] ?? 0;
  const nextDay = Math.min(30, doneDays + 1);
  // Pro only trains the exercises it can demonstrate with a real athlete, so the hero card counts those.
  const nextSession = proSession(programDay(program.id, nextDay), access.can('trainer.demos'));
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

  // Photo hero: parallax + fade as you scroll, stretches on pull-down; a compact bar takes over once it's gone.
  // The photo ends partway down the calorie card, where that card is already near-opaque,
  // so its fade to the canvas is hidden and the picture keeps about its original height.
  const [heroBox, setHeroBox] = useState({ y: 0, h: 0 });
  const heroH = heroBox.h > 0 ? heroBox.y + heroBox.h * HERO_CUT : insets.top + HERO_BODY;
  const barAt = heroH - insets.top - 70;
  const scrollY = useSharedValue(0);
  const solidSV = useSharedValue(false);
  const [solid, setSolid] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    const y = e.contentOffset.y;
    scrollY.set(y);
    const v = y > barAt;
    if (v !== solidSV.get()) {
      solidSV.set(v);
      scheduleOnRN(setSolid, v);
    }
  });
  const heroStyle = useAnimatedStyle(() => {
    const y = scrollY.get();
    return {
      opacity: interpolate(y, [0, heroH * 0.8], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: y < 0 ? -y / 2 : -y * 0.45 }, { scale: y < 0 ? 1 + -y / heroH : 1 }],
    };
  });
  const barStyle = useAnimatedStyle(() => {
    const v = interpolate(scrollY.get(), [barAt - 40, barAt], [0, 1], Extrapolation.CLAMP);
    return { opacity: v, transform: [{ translateY: (1 - v) * -10 }] };
  });
  // Light status bar over the photo, dark once the compact bar is showing; reset when leaving the tab.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(solid ? 'dark' : 'light');
      return () => setStatusBarStyle('dark');
    }, [solid]),
  );
  const heroTitle = doneToday ? `Day ${doneDays} crushed!` : nextSession.restDay ? 'Rest & recharge' : `Day ${nextDay} is waiting`;
  const heroSub = doneToday ? 'Great work today. See you tomorrow.' : nextSession.restDay ? 'A light stretch or easy walk still counts.' : `${nextStats.exercises} moves · ${nextStats.minutes} min · ~${nextStats.kcal} kcal`;

  // Simulated health sync: one pending sync at a time, cancelled if Home unmounts.
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
  }, []);
  const sync = () => {
    if (syncTimer.current) return;
    setSyncing(true);
    const day = today;
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      const n = 300 + Math.round(Math.random() * 600);
      addSteps(n, day);
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
      {/* Photo hero (behind the scroll content) */}
      <Animated.View pointerEvents="none" style={[st.photoHero, { height: heroH }, heroStyle]}>
        {/* Photo + scrims stop short of the bottom edge so only the solid fade touches it (no seam line) */}
        <View style={st.photoLayer}>
          <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={250} />
          {/* Neutral ink scrims: top & bottom, darker on the left where the copy sits */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: ink(0.16) }]} />
          <LinearGradient colors={[ink(0.72), ink(0.28), ink(0.82)]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={[ink(0.55), ink(0)]} start={{ x: 0, y: 0.5 }} end={{ x: 0.85, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </View>
        <LinearGradient colors={['rgba(245,245,244,0)', C.bg, C.bg]} locations={[0, 0.82, 1]} style={st.heroFade} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}>

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
              <Ionicons name={timeIcon.name} size={14} color={C.gold} />
              <Text style={st.greet} numberOfLines={1}>
                {greet}
              </Text>
            </View>
            <Text style={st.hello} numberOfLines={1}>
              {p.name ? `Hey, ${first}` : 'Welcome back'}
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
          <IconButton icon="notifications-outline" color={C.white} bg={GLASS} style={st.glassBtn} badge={unread} onPress={() => router.push('/notifications')} />
        </Animated.View>

        {/* Calorie budget: rides the photo, its top glass letting the picture through */}
        <Animated.View entering={enter(1)} style={st.heroCopy} onLayout={(e) => setHeroBox({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
          <CalorieCard
            eaten={eaten}
            burned={burned.total}
            budget={targets.budget}
            left={left}
            over={over}
            status={status}
            macros={{ carbs: [total.carbs, targets.carbs], protein: [total.protein, targets.protein], fat: [total.fat, targets.fat], fiber: [total.fiber, targets.fiber] }}
            onPress={() => router.navigate('/diet')}
          />
        </Animated.View>

        {/* Content below the photo */}
        <View>

        {/* Today's workout */}
        <Animated.View entering={enter(1)}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              openDay();
            }}
            style={st.workout}
            accessibilityRole="button"
            accessibilityLabel={doneToday ? "View today's workout" : `Start day ${nextDay}`}>
            <Ring size={62} stroke={5} value={doneDays / 30} track="rgba(255,255,255,0.18)" gradient={[C.primaryTint, C.primary]}>
              <Text style={st.workoutDay}>{doneDays}</Text>
              <Text style={st.workoutOf}>/30</Text>
            </Ring>
            <View style={{ flex: 1 }}>
              <Text style={st.heroPillText} numberOfLines={1}>
                {program.title.toUpperCase()}
              </Text>
              <Text style={st.photoTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {heroTitle}
              </Text>
              <Text style={st.heroSub} numberOfLines={1}>
                {heroSub}
              </Text>
            </View>
            <View style={st.heroCta}>
              <Ionicons name={doneToday ? 'eye' : 'play'} size={18} color={C.primaryDark} style={doneToday ? undefined : { marginLeft: 2 }} />
            </View>
          </PressableScale>
        </Animated.View>

        {/* Pro: the coach assigned on purchase. The entitlement layer decides — Free and Smart never see it. */}
        {access.can('trainer') && (
          <Animated.View entering={enter(2)}>
            <AssignedCoachCard trainerId={state.trainerId} />
          </Animated.View>
        )}

        {/* Saathi insight (AI), as a coach message */}
        <Animated.View entering={enter(2)}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => {
              tap();
              router.push('/coach');
            }}
            style={st.ria}
            accessibilityRole="button"
            accessibilityLabel="Open Saathi, your AI coach">
            <View style={st.riaHead}>
              <LinearGradient colors={G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.riaIcon}>
                <Ionicons name="sparkles" size={15} color={C.onPrimary} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={st.riaTitle}>Saathi</Text>
                <View style={st.riaLive}>
                  <View style={st.riaDot} />
                  <Text style={st.riaSub}>Your AI coach · tip for today</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.ai} />
            </View>
            <View style={st.riaBubble}>
              <Text style={st.riaText}>{ria}</Text>
            </View>
            <View style={st.riaChips}>
              {RIA_CHIPS.map((c) => (
                <PressableScale
                  key={c.label}
                  scaleTo={0.95}
                  onPress={() => {
                    tap();
                    router.push(c.q ? { pathname: '/coach', params: { q: c.q } } : '/coach');
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
                <Ionicons name="camera" size={14} color={C.onPrimary} />
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
          <SectionTitle title="Today's workout" action="Switch plan" onAction={() => router.push('/select-plan')} />
          <ChallengeCard
            title={program.title}
            bolts={program.bolts}
            colors={program.colors}
            day={doneToday ? doneDays : nextDay}
            done={doneDays}
            stats={doneToday || nextSession.restDay ? undefined : nextStats}
            note={doneToday ? 'Done for today. Great work!' : 'Rest day · stretch & recover'}
            emoji={nextSession.emoji}
            art={sessionArt(nextSession.key)}
            footnote={`This week: ${wk.done} of ${p.weeklyGoal} sessions`}
            cta={doneToday ? "View today's workout" : nextSession.restDay ? 'Open rest day' : `Start Day ${nextDay}`}
            ctaIcon={doneToday ? 'eye' : nextSession.restDay ? 'moon' : 'play'}
            onPress={openDay}
          />
        </Animated.View>

        {/* Meals */}
        <Animated.View entering={enter(5)}>
          <SectionTitle title="Today's meals" action="View diary" onAction={() => router.navigate('/diet')} />
          <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
            {MEALS.map((m, i) => {
              const kcal = Math.round(byMeal[m.key]?.kcal ?? 0);
              const rec = Math.round(targets.budget * m.share);
              const names = mealNames[m.key] ?? [];
              const tint = MEAL_TINT[m.key] ?? MEAL_TINT.lunch;
              const logged = kcal > 0;
              return (
                <View key={m.key}>
                  <Pressable onPress={() => router.navigate('/diet')} style={({ pressed }) => [st.meal, pressed && { backgroundColor: C.surfaceAlt }]}>
                    <View>
                      <IconTile icon={m.icon as IconName} size={42} color={tint.color} bg={tint.bg} />
                      {logged && (
                        <View style={st.mealCheck}>
                          <Ionicons name="checkmark" size={10} color={C.onPrimary} />
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
                    <IconButton icon="add" size={20} bg={C.primaryDark} color={C.onPrimary} style={{ width: 34, height: 34 }} onPress={() => router.push({ pathname: '/food-search', params: { meal: m.key } })} />
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
              <IconButton icon="remove" bg={C.waterSoft} color={C.water} onPress={() => addWater(-1, today)} />
              <IconButton
                icon="add"
                bg={C.water}
                color={C.white}
                onPress={() => {
                  addWater(1, today);
                  if (water + 1 === targets.water) toast('Water goal reached!', 'trophy');
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
                    setWater(i + 1 === water ? i : i + 1, today);
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
                  <Ionicons name={todaysWorkout ? 'checkmark-circle' : 'flame'} size={17} color={C.workout} />
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
              router.push(premiumCard.href);
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
                  <Text style={st.premiumLabel}>{premiumCard.label}</Text>
                </View>
                <Text style={st.premiumTitle}>{premiumCard.title}</Text>
                <Text style={st.premiumSub}>{premiumCard.sub}</Text>
                <View style={st.premiumBtn}>
                  <Text style={st.premiumBtnText}>{premiumCard.cta}</Text>
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
            {TIPS.map((x, i) => {
              const tint = TIP_TINT[i % TIP_TINT.length];
              return (
                <PressableScale
                  key={x.title}
                  scaleTo={0.97}
                  onPress={() => {
                    tap();
                    setTip(x);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Tip: ${x.title}`}
                  style={st.tip}>
                  <LinearGradient colors={[tint.bg, C.card]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={st.tipBg}>
                    <View pointerEvents="none" style={st.tipDecor}>
                      <Ionicons name={x.icon} size={104} color={tint.color} />
                    </View>
                    <View style={st.tipHead}>
                      <View style={[st.tipIcon, { backgroundColor: C.card }]}>
                        <Ionicons name={x.icon} size={18} color={tint.color} />
                      </View>
                      <View style={[st.tipTag, { borderColor: tint.color + '33' }]}>
                        <Text style={[st.tipTagText, { color: tint.color }]}>{TIP_TAG[x.icon] ?? 'Tip'}</Text>
                      </View>
                    </View>
                    <Text style={st.tipTitle} numberOfLines={2}>
                      {x.title}
                    </Text>
                    <Text style={st.tipShort} numberOfLines={1}>
                      {x.short}
                    </Text>
                    <View style={st.tipFoot}>
                      <Ionicons name="time-outline" size={13} color={C.muted} />
                      <Text style={st.tipMeta}>1 min read</Text>
                      <View style={{ flex: 1 }} />
                      <View style={[st.tipGo, { backgroundColor: tint.color }]}>
                        <Ionicons name="arrow-forward" size={15} color={C.white} />
                      </View>
                    </View>
                  </LinearGradient>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Compact bar fades in once the photo hero has scrolled away */}
      {/* Compact bar: only takes touches once it's fully in, so the photo header stays tappable underneath */}
      <Animated.View pointerEvents={solid ? 'box-none' : 'none'} style={[st.bar, { paddingTop: insets.top, height: insets.top + 60 }, barStyle]}>
        <View style={st.barRow}>
          <PressableScale scaleTo={0.92} onPress={() => { tap(); router.push('/profile'); }} accessibilityRole="button" accessibilityLabel="Profile">
            <LinearGradient colors={G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.barAvatar}>
              <Text style={st.barAvatarText}>{(first[0] ?? 'F').toUpperCase()}</Text>
            </LinearGradient>
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Text style={st.barTitle} numberOfLines={1}>
              {p.name ? `Hey, ${first}` : greet}
            </Text>
            <Text style={st.barMeta} numberOfLines={1}>
              {dayShort(today)}, {fmtDate(today)} · <Text style={{ color: over ? C.danger : C.primaryDark, fontWeight: '800' }}>{Math.abs(left).toLocaleString('en-IN')} kcal {over ? 'over' : 'left'}</Text>
            </Text>
          </View>
          <PressableScale scaleTo={0.94} onPress={() => { tap(); router.push('/history'); }} style={st.barStreak} accessibilityRole="button" accessibilityLabel={`${streak} day streak`}>
            <Ionicons name="flame" size={14} color={C.accent} />
            <Text style={st.barStreakText}>{streak}</Text>
          </PressableScale>
          <IconButton icon="notifications-outline" color={C.text} bg={C.surfaceAlt} badge={unread} onPress={() => router.push('/notifications')} />
        </View>
        <View style={st.barTrack}>
          <View style={[st.barFill, { width: `${Math.min(100, Math.round((eaten / Math.max(1, targets.budget + burned.total)) * 100))}%`, backgroundColor: over ? C.danger : C.primary }]} />
        </View>
      </Animated.View>

      <Sheet visible={!!tip} onClose={() => setTip(null)} title={tip?.title}>
        <View style={[st.sheetArt, { backgroundColor: tipTint.bg }]}>
          <Ionicons name={tip?.icon ?? 'bulb'} size={40} color={tipTint.color} />
        </View>
        <Text style={[T.body, { marginTop: 16 }]}>{tip?.body}</Text>
        <Button
          title="Ask Saathi about this"
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
  photoHero: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: C.bg },
  photoLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 14 },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: -2, height: HERO_OVERLAP + 26 },
  heroCopy: { marginTop: 18, paddingBottom: 24 },
  heroPillText: { color: C.primaryTint, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  photoTitle: { color: C.white, fontSize: 22, lineHeight: 27, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  heroCta: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  workout: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: R.xl, backgroundColor: C.graphite, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', ...shadow },
  workoutDay: { color: C.white, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 20 },
  workoutOf: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },
  glassBtn: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.28)' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'flex-end', backgroundColor: C.card, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, overflow: 'hidden', ...shadow },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  barAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  barAvatarText: { color: C.onPrimary, fontWeight: '800', fontSize: 15 },
  barTitle: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  barMeta: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1, fontVariant: ['tabular-nums'] },
  barStreak: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 17, backgroundColor: C.accentSoft },
  barStreakText: { fontSize: 14, fontWeight: '800', color: C.accent, fontVariant: ['tabular-nums'] },
  barTrack: { height: 3, backgroundColor: C.borderSoft },
  barFill: { height: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 14 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, ...shadowSm },
  avatarRing: { width: 48, height: 48, borderRadius: 24, padding: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  avatarText: { color: C.onPrimary, fontWeight: '700', fontSize: 18 },
  premiumDot: { position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greet: { flexShrink: 1, fontSize: 13, color: 'rgba(255,255,255,0.88)', fontWeight: '600' },
  hello: { fontSize: 22, fontWeight: '800', color: C.white, letterSpacing: -0.5, marginTop: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GLASS, paddingLeft: 5, paddingRight: 12, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.28)' },
  streakIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  streakText: { fontWeight: '700', color: C.white, fontSize: 15, fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: C.primary, fontWeight: '600', fontSize: 13 },
  statVal: { fontSize: 17, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  unit: { fontSize: 12, color: C.muted, fontWeight: '500' },
  unitLg: { fontSize: 14, color: C.muted, fontWeight: '500', letterSpacing: 0 },
  ria: { marginTop: 14, backgroundColor: C.card, borderRadius: R.xl, borderWidth: 1, borderColor: C.borderSoft, padding: 16, ...shadowSm },
  riaHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riaIcon: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  riaTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  riaLive: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  riaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  riaSub: { fontSize: 12, fontWeight: '600', color: C.muted },
  riaBubble: { marginTop: 12, padding: 14, borderRadius: R.lg, borderTopLeftRadius: 6, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  riaText: { fontSize: 14, color: C.text, lineHeight: 20 },
  riaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  riaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.aiBorder },
  riaChipText: { fontSize: 13, fontWeight: '600', color: C.ai },
  snap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  snapCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, height: 32, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.primaryDark },
  snapCtaText: { color: C.onPrimary, fontWeight: '700', fontSize: 13 },
  snapArt: { width: 92, height: 84, borderRadius: R.md, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  snapTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  aiTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  aiTagText: { fontSize: 10, fontWeight: '800', color: C.ai, letterSpacing: 0.4 },
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
  tip: { width: TIP_W, borderRadius: R.lg, ...shadowSm },
  tipBg: { flex: 1, borderRadius: R.lg, padding: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  tipDecor: { position: 'absolute', right: -18, bottom: -22, opacity: 0.08, transform: [{ rotate: '-12deg' }] },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  tipTag: { paddingHorizontal: 9, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1 },
  tipTagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  tipTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: C.text, marginTop: 14, letterSpacing: -0.3 },
  tipShort: { fontSize: 13, lineHeight: 18, color: C.textSoft, marginTop: 4 },
  tipFoot: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 'auto', paddingTop: 14 },
  tipMeta: { fontSize: 12, fontWeight: '600', color: C.muted },
  tipGo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sheetArt: { width: 84, height: 84, borderRadius: 28, backgroundColor: C.surfaceAlt, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
