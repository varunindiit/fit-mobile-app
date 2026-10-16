import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Button, CountUp, Dialog, EASE_OUT, nativeOnly, Ring, Sheet, tap, type IconName } from '@/components/ui';
import { DEFAULT_MONTHS, PlanPicker, planFor } from '@/components/plans/PlanPicker';
import { formatINR, type PlanTier } from '@/data/plans';
import { bmi, targets } from '@/lib/calc';
import type { Profile } from '@/lib/store';
import { BRAND, C, glow, MOTION, R, shadow, shadowLg, shadowSm } from '@/theme';
import { IMG } from './assets';
import { GoalCurve } from './GoalCurve';
import { GUTTER, fmtWeight, toUnit, type WeightUnit } from './kit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Calls the latest `fn` after `ms`; the timer is not reset by re-renders. */
function useTimeout(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const t = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(t);
  }, [ms]);
}

const rise = (delay: number) => nativeOnly(FadeInDown.duration(MOTION.enter + 80).delay(delay).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 18 }] }));

/* ---------------- 0 · Intro ---------------- */

const INTRO_STATS: { label: string; value: number; format: (n: number) => string }[] = [
  { label: 'workouts logged', value: 300, format: (n) => `${Math.round(n)}M+` },
  { label: 'kcal torched', value: 15, format: (n) => `${Math.round(n)}B+` },
  { label: 'user rating', value: 4.9, format: (n) => `${n.toFixed(1)}★` },
];

const LOGO = require('@/assets/images/logo-mark.png');

/** First screen: full-bleed group photo under a deep scrim, brand bar, left-aligned headline, glass stat strip and the CTA. */
export function Intro({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const reduce = useReducedMotion();
  const zoom = useSharedValue(reduce ? 1 : 1.12);
  useEffect(() => {
    if (!reduce) zoom.set(withTiming(1, { duration: 6000, easing: Easing.out(Easing.cubic) }));
  }, [zoom, reduce]);
  const photo = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, photo]}>
        <Image source={IMG.intro} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
      </Animated.View>
      <LinearGradient colors={['rgba(19,35,31,0.55)', 'rgba(19,35,31,0)']} style={st.introTopScrim} />
      <LinearGradient colors={['rgba(19,35,31,0)', 'rgba(19,35,31,0.6)', 'rgba(19,35,31,0.94)', C.navy]} locations={[0.28, 0.48, 0.66, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: GUTTER + 4 }} edges={['top', 'bottom']}>
        <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.enter).delay(100))} style={st.introBar}>
          <View style={st.introBrand} accessible accessibilityRole="header" accessibilityLabel={BRAND}>
            <View style={st.introLogo}>
              <Image source={LOGO} style={{ width: 22, height: 22 }} contentFit="contain" />
            </View>
            <Text style={st.introBrandText}>{BRAND}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Log in" onPress={() => { tap(); onLogin(); }} hitSlop={8} style={({ pressed }) => [st.introLoginPill, pressed && { opacity: 0.7 }]}>
            <Text style={st.introLoginText}>Log in</Text>
          </Pressable>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={rise(200)} style={st.introEyebrow}>
          <View style={st.introDot} />
          <Text style={st.introEyebrowText}>BUILT JUST FOR YOU</Text>
        </Animated.View>
        <Animated.Text entering={rise(300)} style={st.introTitle} accessibilityRole="header">
          Sweat today.{'\n'}
          Shine <Text style={{ color: C.gold }}>tomorrow.</Text>
        </Animated.Text>
        <Animated.Text entering={rise(420)} style={st.introSub}>
          Custom workouts, smart meal plans and daily coaching, all in one app.
        </Animated.Text>

        <Animated.View entering={rise(560)} style={st.introStats}>
          {INTRO_STATS.map((s, i) => (
            <View key={s.label} style={[st.introStat, i > 0 && st.introStatDivider]}>
              <CountUp value={s.value} format={s.format} fromZero duration={1300} style={st.introValue} />
              <Text style={st.introLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={nativeOnly(FadeInUp.duration(MOTION.enter).delay(800).easing(EASE_OUT))} style={{ marginTop: 22, paddingBottom: 8 }}>
          <Button title="Get My Plan" onPress={onStart} style={{ backgroundColor: C.white, borderColor: C.white }} textStyle={{ color: C.primaryDark }} />
          <Text style={st.introFoot}>Answer a few questions · Get your plan instantly</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const RESTORE: [IconName, string][] = [
  ['barbell', 'Your plan'],
  ['stats-chart', 'Progress'],
  ['flame', 'Streak'],
];

/** "Log in" bottom sheet on the Intro screen: what comes back with the account, then on to the log-in or sign-up screen. */
export function LoginSheet({ visible, onClose, onLogin, onSignup }: { visible: boolean; onClose: () => void; onLogin: () => void; onSignup: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: GUTTER + 4, paddingTop: 4 }}>
        <View style={st.loginMark}>
          <Image source={LOGO} style={{ width: 30, height: 30 }} contentFit="contain" />
        </View>
        <Text style={st.loginTitle}>Welcome back!</Text>
        <Text style={st.loginSub}>Log in to pick up right where you left off with your saved {BRAND} plan.</Text>
        <View style={st.loginRestore}>
          {RESTORE.map(([icon, label]) => (
            <View key={label} style={st.loginItem}>
              <View style={st.loginItemIcon}>
                <Ionicons name={icon} size={18} color={C.primaryDark} />
              </View>
              <Text style={st.loginItemText}>{label}</Text>
            </View>
          ))}
        </View>
        <Button title="Log in" icon="log-in-outline" onPress={onLogin} style={{ marginTop: 24 }} />
        <Pressable accessibilityRole="button" onPress={() => { tap(); onClose(); }} hitSlop={8} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
          <Text style={st.textBtnLabel}>Not now</Text>
        </Pressable>
        <View style={st.loginNote}>
          <Text style={st.loginNoteText}>New to {BRAND}?</Text>
          <Pressable accessibilityRole="button" onPress={() => { tap(); onSignup(); }} hitSlop={10}>
            <Text style={st.loginNoteLink}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

/* ---------------- 1 · Welcome ---------------- */

const WELCOME_MS = 2800;
const ARCH_W = 196;
const ARCH_H = 248;
const ORBIT = 292;

/** Small glass chip that floats around the coach portrait, bobbing gently once it has popped in. */
function CoachChip({ icon, label, tint, bg, delay, bob, style }: { icon: IconName; label: string; tint: string; bg: string; delay: number; bob: number; style: object }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.set(withRepeat(withSequence(withTiming(-bob, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1, false));
  }, [y, bob, reduce]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return (
    <Animated.View entering={nativeOnly(ZoomIn.springify().damping(14).delay(delay))} style={[st.wChip, shadow, style]}>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, float]}>
        <View style={[st.wChipIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
        <Text style={st.wChipText}>{label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

/** "Hey there! Meet your personal coach." Arch portrait inside a slowly orbiting ring, feature chips float in, greeting rises,
 *  and a thin timer bar shows the screen moving on by itself (a tap skips ahead). */
export function Welcome({ onNext }: { onNext: () => void }) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);
  const wave = useSharedValue(0);
  const timer = useSharedValue(0);
  useEffect(() => {
    timer.set(withTiming(1, { duration: WELCOME_MS, easing: Easing.linear }));
    if (reduce) return;
    spin.set(withRepeat(withTiming(1, { duration: 24000, easing: Easing.linear }), -1, false));
    wave.set(withDelay(700, withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(-1, { duration: 180 }), withTiming(1, { duration: 180 }), withTiming(0, { duration: 140 }), withTiming(0, { duration: 900 })), -1, false)));
  }, [spin, wave, timer, reduce]);
  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const hand = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.get() * 18}deg` }] }));
  const bar = useAnimatedStyle(() => ({ width: `${timer.get() * 100}%` }));
  useTimeout(onNext, WELCOME_MS);

  return (
    <Pressable style={st.white} onPress={onNext} accessibilityRole="button" accessibilityLabel="Hey there! Meet your personal coach. Tap to continue">
      <StatusBar style="dark" />
      <LinearGradient colors={[C.primarySoft, 'rgba(255,255,255,0)']} locations={[0, 0.62]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={st.center}>
          <View style={st.wStage}>
            <Animated.View entering={nativeOnly(FadeIn.duration(900))} style={[st.wOrbit, orbit]}>
              <Svg width={ORBIT} height={ORBIT}>
                <Circle cx={ORBIT / 2} cy={ORBIT / 2} r={ORBIT / 2 - 1} stroke={C.primaryTint} strokeWidth={1.5} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
              </Svg>
              <View style={[st.wOrbitDot, { top: -4, left: ORBIT / 2 - 4, backgroundColor: C.primary }]} />
              <View style={[st.wOrbitDot, { bottom: ORBIT * 0.14, right: ORBIT * 0.1, backgroundColor: C.accent, width: 6, height: 6 }]} />
            </Animated.View>
            <Animated.View entering={nativeOnly(FadeIn.duration(700))} style={st.wGlow} />
            <Animated.View entering={nativeOnly(FadeInUp.duration(640).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 40 }], opacity: 0 }))} style={[st.wArch, shadowLg]}>
              <Image source={IMG.coach} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={200} />
              <LinearGradient colors={['rgba(21,94,80,0)', 'rgba(21,94,80,0.28)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <CoachChip icon="barbell" label="Custom workouts" tint={C.primaryDark} bg={C.primarySoft} delay={520} bob={5} style={{ top: 96, left: -30 }} />
            <CoachChip icon="restaurant" label="Smart nutrition" tint={C.accent} bg={C.accentSoft} delay={680} bob={6} style={{ top: 178, right: -26 }} />
            <Animated.View entering={nativeOnly(ZoomIn.springify().damping(14).delay(840))} style={[st.wStatus, glow(C.primaryDark)]}>
              <View style={st.wLive} />
              <Text style={st.wStatusText}>Your plan starts here</Text>
            </Animated.View>
          </View>

          <View style={st.wCopy}>
            <Animated.View entering={rise(360)} style={st.wHelloRow}>
              <Text style={st.hello} accessibilityRole="header">
                Hey there!
              </Text>
              <Animated.View style={[st.wHand, hand]}>
                <Ionicons name="hand-left" size={24} color={C.accent} />
              </Animated.View>
            </Animated.View>
            <Animated.Text entering={rise(480)} style={st.helloSub}>
              Meet your <Text style={{ color: C.primaryDark, fontWeight: '700' }}>personal coach.</Text>
            </Animated.Text>
            <Animated.Text entering={rise(600)} style={st.wNote}>
              Answer a few quick questions and we&apos;ll craft a plan made just for you.
            </Animated.Text>
          </View>
        </View>

        <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.enter).delay(900))} style={st.wFoot}>
          <View style={st.wTrack}>
            <Animated.View style={[st.wFill, bar]} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

/* ---------------- 19 · Motivation ---------------- */

/** Full-bleed photo that slowly settles (Ken Burns), headline top-left, two choices at the bottom. */
export function Motivation({ male, onNext, goal, reward }: { male: boolean; onNext: () => void; goal?: { from: string; to: string }; reward?: string }) {
  const reduce = useReducedMotion();
  const zoom = useSharedValue(reduce ? 1 : 1.12);
  useEffect(() => {
    if (!reduce) zoom.set(withTiming(1, { duration: 6000, easing: Easing.out(Easing.cubic) }));
  }, [zoom, reduce]);
  const photo = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, photo]}>
        <Image source={male ? IMG.motivationMale : IMG.motivation} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
      </Animated.View>
      <LinearGradient colors={['rgba(19,35,31,0.7)', 'rgba(19,35,31,0)']} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(19,35,31,0)', 'rgba(19,35,31,0.94)']} locations={[0.38, 0.8]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }} edges={['top', 'bottom']}>
        <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(100))} style={st.motPill}>
          <Ionicons name="sparkles" size={12} color={C.gold} />
          <Text style={st.motPillText}>ALMOST THERE</Text>
        </Animated.View>
        <Animated.Text entering={rise(200)} style={st.motTitle}>
          Ready to meet the <Text style={{ color: C.primaryTint }}>new you</Text>?
        </Animated.Text>
        <Animated.Text entering={rise(320)} style={st.motSub}>
          Stronger, lighter, more confident. Your plan is just a few taps away.
        </Animated.Text>
        <View style={{ flex: 1 }} />
        {(goal || reward) && (
          <Animated.View entering={nativeOnly(FadeInUp.duration(MOTION.enter).delay(450).easing(EASE_OUT))} style={st.motGlass}>
            {goal && (
              <View style={st.motGoal}>
                <View>
                  <Text style={st.motKey}>Today</Text>
                  <Text style={st.motVal}>{goal.from}</Text>
                </View>
                <View style={st.motArrow}>
                  <Ionicons name="arrow-forward" size={16} color={C.navy} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.motKey}>Your goal</Text>
                  <Text style={[st.motVal, { color: C.primaryTint }]}>{goal.to}</Text>
                </View>
              </View>
            )}
            {goal && reward && <View style={st.motRule} />}
            {reward && (
              <View style={st.motReward}>
                <View style={st.motTrophy}>
                  <Ionicons name="trophy" size={14} color={C.navy} />
                </View>
                <Text style={st.motRewardText} numberOfLines={1}>
                  Then: <Text style={{ fontWeight: '800', color: C.white }}>{reward}</Text>
                </Text>
              </View>
            )}
          </Animated.View>
        )}
        <Animated.View entering={nativeOnly(FadeInUp.duration(MOTION.enter).delay(600).easing(EASE_OUT))} style={{ gap: 4, paddingTop: 16, paddingBottom: 8 }}>
          <Button title="Yes, let's do this" icon="flash" onPress={onNext} />
          <Pressable accessibilityRole="button" onPress={() => { tap(); onNext(); }} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
            <Text style={[st.textBtnLabel, { color: 'rgba(255,255,255,0.8)' }]}>Maybe later</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- 20 · Analysis ---------------- */

const TASKS: [IconName, string, string][] = [
  ['body', 'Reading your body stats', 'BMI, weight and height'],
  ['barbell', 'Designing your workouts', 'Matched to your level and rest days'],
  ['restaurant', 'Balancing your meals', 'Calories and macros for your diet'],
];
const TASK_MS = 1500;

/** Soft halo that breathes behind the progress ring while the plan is being built. */
function Halo() {
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!reduce) v.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [v, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: 0.1 + v.get() * 0.12, transform: [{ scale: 1 + v.get() * 0.08 }] }));
  return <Animated.View pointerEvents="none" style={[st.anHalo, style]} />;
}

/** One big ring fills across all tasks while the steps tick off below, then it moves on by itself. */
export function Analysis({ p, units, onDone }: { p: Profile; units: WeightUnit; onDone: () => void }) {
  const [t, setT] = useState(0); // 0 … TASKS.length, fractional
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const v = Math.min(TASKS.length, (Date.now() - start) / TASK_MS);
      setT(v);
      if (v >= TASKS.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, []);
  const done = t >= TASKS.length;
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(onDone, 700);
    return () => clearTimeout(id);
  }, [done, onDone]);

  const pct = Math.round((t / TASKS.length) * 100);
  const current = Math.min(TASKS.length - 1, Math.floor(t));
  const b = bmi(p.weightKg, p.heightCm);
  const stats: [string, string][] = [
    ['BMI', b.toFixed(1)],
    ['Weight', `${toUnit(p.weightKg, units).toFixed(0)} ${units}`],
    ['Height', `${p.heightCm} cm`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <LinearGradient colors={[C.primarySoft, C.white]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: GUTTER }} edges={['top', 'bottom']}>
        <View style={[st.center, { justifyContent: 'center' }]}>
          <Animated.Text entering={rise(0)} style={st.anEyebrow}>
            {done ? 'ALL SET' : 'HANG TIGHT'}
          </Animated.Text>
          <Animated.Text key={done ? 'ready' : 'making'} entering={rise(done ? 0 : 60)} style={st.anTitle}>
            {done ? 'Your plan is ready!' : 'Crafting your plan'}
          </Animated.Text>
          <Animated.Text entering={rise(120)} style={st.anSub}>
            {"We're turning your answers into workouts and meals made just for you."}
          </Animated.Text>

          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(200))} style={st.anRingWrap}>
            <Halo />
            <Ring size={196} stroke={12} value={t / TASKS.length} track="rgba(18,168,125,0.14)" gradient={[C.primary, C.primaryDark]}>
              <View style={st.anRingInner}>
                <Animated.View key={done ? 'done' : current} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[st.anRingIcon, done && { backgroundColor: C.primary }]}>
                  <Ionicons name={done ? 'checkmark' : TASKS[current][0]} size={20} color={done ? C.white : C.primaryDark} />
                </Animated.View>
                <Text style={st.anPctBig}>
                  {pct}
                  <Text style={st.anPctSign}>%</Text>
                </Text>
              </View>
            </Ring>
          </Animated.View>

          <Animated.View entering={rise(320)} style={st.anChips}>
            {stats.map(([k, v]) => (
              <View key={k} style={st.anChip}>
                <Text style={st.anChipKey}>{k}</Text>
                <Text style={st.anChipVal}>{v}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={rise(420)} style={st.anList}>
            {TASKS.map(([icon, label, note], i) => {
              const isDone = t >= i + 1;
              const isActive = t >= i && !isDone;
              return (
                <View key={label} style={[st.anRow, i > 0 && st.anRowLine, { opacity: isDone || isActive ? 1 : 0.45 }]}>
                  <View style={[st.anRowIcon, isDone && { backgroundColor: C.primary }]}>
                    {isDone ? (
                      <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
                        <Ionicons name="checkmark" size={15} color={C.white} />
                      </Animated.View>
                    ) : (
                      <Ionicons name={icon} size={15} color={isActive ? C.primaryDark : C.muted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.anRowText}>{label}</Text>
                    <Text style={st.anRowNote}>{note}</Text>
                  </View>
                  {isActive && <Text style={st.anPct}>{Math.round((t - i) * 100)}%</Text>}
                  {isDone && <Text style={[st.anPct, { color: C.muted }]}>Done</Text>}
                </View>
              );
            })}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- 21 · Result ---------------- */

/** Plan-ready summary: goal date, projected curve, the plan's key numbers and what it includes. */
export function PlanResult({ p, units, onBack, onNext }: { p: Profile; units: WeightUnit; onBack: () => void; onNext: () => void }) {
  const t = targets(p);
  const weeks = Math.max(t.weeks, 4);
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  const diff = toUnit(p.targetKg, units) - toUnit(p.weightKg, units);
  const changing = Math.abs(diff) >= 0.1;
  const badge = !changing ? undefined : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(Math.abs(diff) < 10 ? 1 : 0)} ${units}`;
  const age = new Date().getFullYear() - p.birthYear;
  const gender = p.gender === 'male' ? 'Male' : p.gender === 'female' ? 'Female' : 'Other';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const stats: [IconName, string, string, string][] = [
    ['calendar', `${weeks}`, 'weeks', C.steps],
    ['barbell', `${p.weeklyGoal}×`, 'workouts / wk', C.primary],
    ['flame', t.budget.toLocaleString('en-IN'), 'kcal / day', C.accent],
  ];

  return (
    <SafeAreaView style={st.white} edges={['top']}>
      <StatusBar style="dark" />
      <LinearGradient colors={[C.primarySoft, 'rgba(255,255,255,0)']} locations={[0, 0.45]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={st.bar}>
        <Pressable onPress={() => { tap(); onBack(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.5 }]}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter))} style={st.resPill}>
          <Ionicons name="checkmark-circle" size={14} color={C.primary} />
          <Text style={st.resPillText}>YOUR PLAN IS READY</Text>
        </Animated.View>
        <Animated.Text entering={rise(80)} style={st.resEyebrow}>
          {changing ? `You could reach ${fmtWeight(p.targetKg, units, 0)} by` : 'A stronger, fitter you by'}
        </Animated.Text>
        <Animated.Text entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(180).easing(EASE_OUT))} style={st.resDate}>
          {date.getDate()} {MONTHS[date.getMonth()]}
          {sameYear ? '' : ` ${date.getFullYear()}`}
        </Animated.Text>
        <Animated.View entering={rise(260)} style={[st.card, { marginTop: 18, paddingTop: 18 }]}>
          <GoalCurve from={toUnit(p.weightKg, units)} to={toUnit(p.targetKg, units)} fromText={`${fmtWeight(p.weightKg, units, 0)}\nToday`} toText={`${fmtWeight(p.targetKg, units, 0)}\nGoal`} badge={badge} height={130} />
        </Animated.View>
        <View style={st.resStats}>
          {stats.map(([icon, v, k, color], i) => (
            <Animated.View key={k} entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(380 + i * 90))} style={st.resStat}>
              <Ionicons name={icon} size={16} color={color} />
              <Text style={st.resStatVal}>{v}</Text>
              <Text style={st.resStatKey}>{k}</Text>
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={rise(560)} style={[st.card, { marginTop: 12 }]}>
          <View style={st.resWho}>
            <View style={st.resAvatar}>
              <Ionicons name={p.gender === 'female' ? 'woman' : p.gender === 'male' ? 'man' : 'person'} size={20} color={C.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.resCardTitle}>Made for you</Text>
              <Text style={st.resLine}>
                {gender} · {age} yrs · {fmtWeight(p.weightKg, units, 0)} → {fmtWeight(p.targetKg, units, 0)}
              </Text>
            </View>
          </View>
          <View style={st.resRule} />
          <Text style={[st.resCardTitle, { marginBottom: 10 }]}>{"What's inside"}</Text>
          <View style={st.resChecks}>
            <Check text="Personalized workouts for your level" />
            <Check text="Meal plan that fits your diet" />
            <Check text="Progress tracking toward your goal" />
          </View>
        </Animated.View>
        <Animated.Text entering={nativeOnly(FadeIn.delay(700))} style={st.resNote}>
          Results vary from person to person. This estimate is based on your answers and a steady weekly pace.
        </Animated.Text>
      </ScrollView>
      <Cta>
        <Button title="Unlock my plan" icon="lock-open" onPress={onNext} />
      </Cta>
    </SafeAreaView>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={st.resCheckDot}>
        <Ionicons name="checkmark" size={12} color={C.white} />
      </View>
      <Text style={st.resCheck}>{text}</Text>
    </View>
  );
}

function Cta({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.cta, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{children}</View>;
}

/* ---------------- 22 · Paywall ---------------- */

/** `onPaid` records the purchase the moment payment succeeds; `onDone` leaves after the welcome dialog. */
export function Paywall({ male, gaining, onSkip, onPaid, onDone }: { male: boolean; gaining: boolean; onSkip: () => void; onPaid: (tier: PlanTier, months: number, amount: number) => void; onDone: () => void }) {
  const [tier, setTier] = useState<PlanTier>('smart');
  const [months, setMonths] = useState(DEFAULT_MONTHS);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { plan, dur } = planFor(tier, months);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <View style={st.paywall}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={st.payHero}>
          <Image source={male ? IMG.paywallMale : IMG.paywall} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={['rgba(12,10,9,0.45)', 'rgba(12,10,9,0)', 'rgba(255,255,255,0)', C.bg]} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={st.payTop}>
            <Pressable onPress={() => { tap(); onSkip(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={st.payClose}>
              <Ionicons name="close" size={20} color={C.white} />
            </Pressable>
          </SafeAreaView>
        </View>
        <View style={st.paySheet}>
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(250))} style={st.payBadge}>
            <Ionicons name="star" size={12} color={C.white} />
            <Text style={st.payBadgeText}>Best value</Text>
          </Animated.View>
          <Animated.Text entering={rise(80)} style={st.payTitle}>
            Unlock your <Text style={{ color: C.primary }}>{gaining ? 'muscle-building' : 'fat-burning'}</Text> plan
          </Animated.Text>
          <Animated.Text entering={rise(160)} style={st.paySub}>
            Workouts, meals and progress tracking, all built around you.
          </Animated.Text>
          <Animated.View entering={rise(240)} style={st.payPerks}>
            {([['barbell', 'Workouts'], ['restaurant', 'Meal plan'], ['stats-chart', 'Progress']] as [IconName, string][]).map(([icon, label]) => (
              <View key={label} style={st.payPerk}>
                <View style={st.payPerkIcon}>
                  <Ionicons name={icon} size={16} color={C.primaryDark} />
                </View>
                <Text style={st.payPerkText}>{label}</Text>
              </View>
            ))}
          </Animated.View>
          <PlanPicker tier={tier} months={months} onTier={setTier} onMonths={setMonths} enterAt={1} titleTop={20} />
        </View>
      </ScrollView>
      <Cta>
        <Button
          title={`Start my plan · ${formatINR(dur.price)}`}
          icon="arrow-forward"
          loading={loading}
          onPress={() => {
            if (loading || confirm) return;
            // Demo payment succeeds instantly: save it now so leaving or killing the app can't lose it.
            onPaid(tier, dur.months, dur.price);
            setLoading(true);
            setTimeout(() => {
              if (!mounted.current) return;
              setLoading(false);
              setConfirm(true);
            }, 900);
          }}
          style={{ backgroundColor: C.primary, borderColor: C.primary }}
        />
        <View style={st.payFoot}>
          <Ionicons name="checkmark" size={13} color={C.primary} />
          <Text style={st.payFootText}>Cancel anytime</Text>
          <Ionicons name="shield-checkmark" size={13} color={C.primary} style={{ marginLeft: 10 }} />
          <Text style={st.payFootText}>Secure payment · No hidden fees</Text>
        </View>
      </Cta>
      <Dialog
        visible={confirm}
        iconName="gift"
        title={`Welcome to ${plan.name}!`}
        text={`Your ${dur.months}-month plan is active. Demo mode: no payment is taken.`}
        confirm="Let's go"
        onConfirm={() => {
          setConfirm(false);
          onDone();
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  white: { flex: 1, backgroundColor: C.white },
  introTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  introBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  introBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  introLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  introBrandText: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.4 },
  introLoginPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  introLoginText: { fontSize: 14, fontWeight: '700', color: C.white },
  introEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, backgroundColor: 'rgba(18,168,125,0.22)', borderWidth: 1, borderColor: 'rgba(18,168,125,0.5)' },
  introDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  introEyebrowText: { fontSize: 11, fontWeight: '800', color: C.primaryTint, letterSpacing: 1.2 },
  introTitle: { fontSize: 40, lineHeight: 44, fontWeight: '900', color: C.white, letterSpacing: -1.2, marginTop: 14 },
  introSub: { fontSize: 15.5, lineHeight: 22, color: 'rgba(255,255,255,0.78)', marginTop: 12, maxWidth: 330 },
  introStats: { flexDirection: 'row', marginTop: 24, paddingVertical: 14, borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  introStat: { flex: 1, alignItems: 'center' },
  introStatDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  introValue: { fontSize: 22, fontWeight: '900', color: C.gold, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  introLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  loginMark: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  loginTitle: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5, textAlign: 'center', marginTop: 16 },
  loginSub: { fontSize: 14.5, lineHeight: 21, color: C.textSoft, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
  loginRestore: { flexDirection: 'row', gap: 10, marginTop: 22 },
  loginItem: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: R.md, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.borderSoft },
  loginItemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  loginItemText: { fontSize: 12.5, fontWeight: '700', color: C.text },
  loginNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  loginNoteText: { fontSize: 14, color: C.textSoft, fontWeight: '600' },
  loginNoteLink: { fontSize: 14, color: C.primaryDark, fontWeight: '800' },
  introFoot: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wStage: { width: ARCH_W + 120, height: ARCH_H + 40, alignItems: 'center', justifyContent: 'center' },
  wOrbit: { position: 'absolute', width: ORBIT, height: ORBIT },
  wOrbitDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: C.white },
  wGlow: { position: 'absolute', width: ARCH_W + 40, height: ARCH_W + 40, borderRadius: (ARCH_W + 40) / 2, backgroundColor: C.primaryTint, opacity: 0.45, top: 6 },
  wArch: { width: ARCH_W, height: ARCH_H, borderTopLeftRadius: ARCH_W / 2, borderTopRightRadius: ARCH_W / 2, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl, overflow: 'hidden', backgroundColor: C.skeleton, borderWidth: 5, borderColor: C.white },
  wChip: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: R.pill, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  wChipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  wChipText: { fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: -0.1 },
  wStatus: { position: 'absolute', bottom: 2, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.primaryDark, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 3, borderColor: C.white },
  wLive: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#5EE3B3' },
  wStatusText: { fontSize: 12.5, fontWeight: '700', color: C.white, letterSpacing: 0.1 },
  wCopy: { alignItems: 'center', marginTop: 30, paddingHorizontal: GUTTER + 12 },
  wHelloRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hello: { fontSize: 44, fontWeight: '800', color: C.text, letterSpacing: -1.2 },
  wHand: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 85%' },
  helloSub: { fontSize: 19, color: C.text, marginTop: 6, fontWeight: '500', letterSpacing: -0.2 },
  wNote: { fontSize: 14.5, lineHeight: 21, color: C.muted, marginTop: 10, textAlign: 'center', maxWidth: 280 },
  wFoot: { alignItems: 'center', paddingBottom: 24 },
  wTrack: { width: 88, height: 4, borderRadius: 2, backgroundColor: C.borderSoft, overflow: 'hidden' },
  wFill: { height: 4, borderRadius: 2, backgroundColor: C.primary },

  motPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 24, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  motPillText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 1.4 },
  motTitle: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: C.white, marginTop: 14, letterSpacing: -0.8, maxWidth: 320 },
  motSub: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.85)', marginTop: 10, maxWidth: 300 },
  motGlass: { padding: 16, borderRadius: R.xl, backgroundColor: 'rgba(19,35,31,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  motGoal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  motKey: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  motVal: { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.4, marginTop: 1, fontVariant: ['tabular-nums'] },
  motArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryTint, alignItems: 'center', justifyContent: 'center' },
  motRule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 12 },
  motReward: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  motTrophy: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  motRewardText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  textBtn: { alignItems: 'center', paddingVertical: 14 },
  textBtnLabel: { fontSize: 15, fontWeight: '700', color: C.textSoft },

  anEyebrow: { fontSize: 11, fontWeight: '800', color: C.primary, letterSpacing: 1.6 },
  anTitle: { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.6, textAlign: 'center', marginTop: 6 },
  anSub: { fontSize: 14, lineHeight: 20, color: C.textSoft, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  anRingWrap: { marginTop: 28, alignItems: 'center', justifyContent: 'center' },
  anHalo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: C.primary },
  anRingInner: { width: 160, height: 160, borderRadius: 80, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  anRingIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  anPctBig: { fontSize: 44, fontWeight: '900', color: C.text, letterSpacing: -1.5, marginTop: 4, fontVariant: ['tabular-nums'] },
  anPctSign: { fontSize: 20, fontWeight: '800', color: C.primary },
  anChips: { flexDirection: 'row', gap: 8, marginTop: 26 },
  anChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.md, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  anChipKey: { fontSize: 10.5, fontWeight: '700', color: C.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  anChipVal: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 1, fontVariant: ['tabular-nums'] },
  anList: { alignSelf: 'stretch', marginTop: 22, paddingHorizontal: 14, borderRadius: R.xl, backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  anRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  anRowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  anRowIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  anRowText: { fontSize: 14.5, fontWeight: '700', color: C.text },
  anRowNote: { fontSize: 12, color: C.muted, marginTop: 1 },
  anPct: { fontSize: 13, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },

  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  resEyebrow: { fontSize: 17, fontWeight: '700', color: C.textSoft, textAlign: 'center', marginTop: 14 },
  resDate: { fontSize: 40, fontWeight: '900', color: C.primaryDark, textAlign: 'center', letterSpacing: -1.2, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  resCardTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  resLine: { fontSize: 13, color: C.textSoft, lineHeight: 19, marginTop: 2 },
  resChecks: { gap: 10 },
  resCheck: { flex: 1, fontSize: 13.5, fontWeight: '600', color: C.text },
  resPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.white, borderWidth: 1, borderColor: C.primaryTint },
  resPillText: { fontSize: 11, fontWeight: '800', color: C.primaryDark, letterSpacing: 1.2 },
  resStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  resStat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  resStatVal: { fontSize: 20, fontWeight: '900', color: C.text, marginTop: 4, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  resStatKey: { fontSize: 11.5, fontWeight: '600', color: C.muted },
  resWho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  resRule: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: 14 },
  resCheckDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  resNote: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 16, lineHeight: 15 },
  cta: { paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: C.white },

  paywall: { flex: 1, backgroundColor: C.bg },
  payHero: { height: 330, backgroundColor: C.skeleton },
  paySheet: { marginTop: -36, paddingTop: 22, paddingHorizontal: GUTTER, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, backgroundColor: C.bg },
  paySub: { fontSize: 14.5, lineHeight: 20, color: C.textSoft, marginTop: 8 },
  payPerks: { flexDirection: 'row', gap: 8, marginTop: 16 },
  payPerk: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft },
  payPerkIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  payPerkText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: C.text },
  payTop: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  payClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(12,10,9,0.35)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  payBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  payBadgeText: { color: C.white, fontWeight: '800', fontSize: 12 },
  payTitle: { fontSize: 30, lineHeight: 35, fontWeight: '900', color: C.text, letterSpacing: -0.8 },
  payFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  payFootText: { fontSize: 11.5, color: C.textSoft, fontWeight: '600' },
});

