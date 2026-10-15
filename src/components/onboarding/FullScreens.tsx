import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CountUp, Dialog, EASE_OUT, nativeOnly, Ring, tap, type IconName } from '@/components/ui';
import { DEFAULT_MONTHS, pctOff, PlanPicker, planFor } from '@/components/plans/PlanPicker';
import { formatINR, type PlanTier } from '@/data/plans';
import { bmi, targets } from '@/lib/calc';
import type { Profile } from '@/lib/store';
import { C, MOTION, R, shadow, shadowSm } from '@/theme';
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
  { label: 'Total Workouts Completed', value: 300, format: (n) => `${Math.round(n)} Million+` },
  { label: 'Total Calories Burned', value: 15, format: (n) => `${Math.round(n)} Billion+` },
  { label: 'App Store Rating', value: 4.9, format: (n) => `${n.toFixed(1)} Stars` },
];

/** First screen: full-bleed group photo melting into the brand colour, headline, counting stats and the CTA. */
export function Intro({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const reduce = useReducedMotion();
  const zoom = useSharedValue(reduce ? 1 : 1.1);
  useEffect(() => {
    if (!reduce) zoom.set(withTiming(1, { duration: 5000, easing: Easing.out(Easing.cubic) }));
  }, [zoom, reduce]);
  const photo = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  return (
    <View style={{ flex: 1, backgroundColor: C.primaryDark }}>
      <StatusBar style="light" />
      <Animated.View style={[st.introPhoto, photo]}>
        <Image source={IMG.intro} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
      </Animated.View>
      <LinearGradient colors={['rgba(21,94,80,0)', 'rgba(21,94,80,0.45)', C.primaryDark]} locations={[0.3, 0.47, 0.62]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }} />
        <Animated.Text entering={rise(200)} style={st.introTitle}>
          EVERY WORKOUT{'\n'}REDEFINES WHO YOU ARE!
        </Animated.Text>
        <View style={{ gap: 14, marginTop: 26 }}>
          {INTRO_STATS.map((s, i) => (
            <Animated.View key={s.label} entering={rise(380 + i * 140)} style={{ alignItems: 'center' }}>
              <Text style={st.introLabel}>{s.label}</Text>
              <CountUp value={s.value} format={s.format} fromZero duration={1200} style={st.introValue} />
            </Animated.View>
          ))}
        </View>
        <Animated.View entering={nativeOnly(FadeInUp.duration(MOTION.enter).delay(900).easing(EASE_OUT))} style={{ marginTop: 32, paddingBottom: 4 }}>
          <Button title="Get My Plan" onPress={onStart} style={{ backgroundColor: C.white, borderColor: C.white }} textStyle={{ color: C.primaryDark }} />
          <Pressable accessibilityRole="button" onPress={() => { tap(); onLogin(); }} hitSlop={8} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
            <Text style={st.introLogin}>
              Already our user? <Text style={st.introLoginLink}>Log in</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- 1 · Welcome ---------------- */

/** "Hello! I'm your personal coach." Coach pops in, greeting rises, then it moves on by itself (tap to skip). */
export function Welcome({ onNext }: { onNext: () => void }) {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    pulse.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1, false));
  }, [pulse, reduce]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.get()), transform: [{ scale: 1 + pulse.get() * 0.35 }] }));
  useTimeout(onNext, 2800);

  return (
    <Pressable style={st.white} onPress={onNext} accessibilityRole="button" accessibilityLabel="Continue">
      <StatusBar style="dark" />
      <View style={st.center}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[st.halo, halo]} />
          <Animated.View entering={nativeOnly(ZoomIn.duration(520).easing(EASE_OUT))} style={[st.coach, shadow]}>
            <Image source={IMG.coach} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
          </Animated.View>
        </View>
        <Animated.Text entering={rise(320)} style={st.hello}>
          Hello!
        </Animated.Text>
        <Animated.Text entering={rise(480)} style={st.helloSub}>
          I&apos;m your personal coach.
        </Animated.Text>
      </View>
    </Pressable>
  );
}

/* ---------------- 19 · Motivation ---------------- */

/** Full-bleed photo that slowly settles (Ken Burns), headline top-left, two choices at the bottom. */
export function Motivation({ male, onNext }: { male: boolean; onNext: () => void }) {
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
      <LinearGradient colors={['rgba(12,10,9,0.62)', 'rgba(12,10,9,0)']} locations={[0, 0.42]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(12,10,9,0)', 'rgba(12,10,9,0.7)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 24 }} edges={['top', 'bottom']}>
        <Animated.Text entering={rise(150)} style={st.motTitle}>
          Ready to amaze friends with a better look?
        </Animated.Text>
        <View style={{ flex: 1 }} />
        <Animated.View entering={nativeOnly(FadeInUp.duration(MOTION.enter).delay(500).easing(EASE_OUT))} style={{ gap: 6, paddingBottom: 8 }}>
          <Button title="Yes, I'm ready" onPress={onNext} style={{ backgroundColor: C.white, borderColor: C.white }} textStyle={{ color: C.text }} />
          <Pressable accessibilityRole="button" onPress={() => { tap(); onNext(); }} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
            <Text style={[st.textBtnLabel, { color: C.white }]}>Not now</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- 20 · Analysis ---------------- */

const TASKS: [IconName, string][] = [
  ['barbell', 'Analyzing your body data...'],
  ['clipboard', 'Building your workout plan...'],
  ['restaurant', 'Creating your meal plan...'],
];
const TASK_MS = 1500;

/** Three task rings fill one after another while the checklist ticks off, then it moves on by itself. */
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

  const b = bmi(p.weightKg, p.heightCm);
  const stats: [string, number, (n: number) => string, string][] = [
    ['BMI', b, (n) => n.toFixed(1), ''],
    ['Weight', toUnit(p.weightKg, units), (n) => n.toFixed(0), ` ${units}`],
    ['Height', p.heightCm, (n) => n.toFixed(0), ' cm'],
  ];

  return (
    <SafeAreaView style={st.white} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={[st.center, { paddingHorizontal: GUTTER }]}>
        <Animated.Text entering={rise(0)} style={st.anTitle}>
          Creating your personalized plan
        </Animated.Text>
        <View style={st.anRings}>
          {TASKS.map(([icon], i) => {
            const v = Math.max(0, Math.min(1, t - i));
            const active = v > 0 && v < 1;
            return (
              <Animated.View key={icon} entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(120 + i * 90))} style={{ transform: [{ scale: active ? 1.08 : 1 }] }}>
                <Ring size={68} stroke={4} value={v} track={C.border}>
                  <View style={[st.anIcon, v >= 1 && { backgroundColor: C.primary }]}>
                    <Ionicons name={v >= 1 ? 'checkmark' : icon} size={22} color={v >= 1 ? C.white : C.primary} />
                  </View>
                </Ring>
              </Animated.View>
            );
          })}
        </View>
        <Animated.View entering={rise(300)} style={st.anStats}>
          {stats.map(([k, v, f, unit], i) => (
            <View key={k} style={[st.anStat, i > 0 && st.anStatDivider]}>
              <CountUp value={v} format={f} fromZero duration={1200} style={st.anStatVal}>
                <Text style={st.anStatUnit}>{unit}</Text>
              </CountUp>
              <Text style={st.anStatKey}>{k}</Text>
            </View>
          ))}
        </Animated.View>
        <Animated.View entering={rise(420)} style={st.anList}>
          {TASKS.map(([, label], i) => {
            const isDone = t >= i + 1;
            const isActive = t >= i && !isDone;
            return (
              <View key={label} style={[st.anRow, { opacity: isDone || isActive ? 1 : 0.4 }]}>
                {isDone ? (
                  <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
                    <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                  </Animated.View>
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={isActive ? C.primary : C.muted} />
                )}
                <Text style={[st.anRowText, isDone && { color: C.text, fontWeight: '700' }]}>{label}</Text>
                {isActive && <Text style={st.anPct}>{Math.round((t - i) * 100)}%</Text>}
              </View>
            );
          })}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- 21 · Result ---------------- */

/** "Get Dream Abs with Our Plan by <date>": projected curve plus About You / About Plan cards. */
export function PlanResult({ p, units, onBack, onNext }: { p: Profile; units: WeightUnit; onBack: () => void; onNext: () => void }) {
  const t = targets(p);
  const weeks = Math.max(t.weeks, 4);
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  const diff = toUnit(p.targetKg, units) - toUnit(p.weightKg, units);
  const badge = Math.abs(diff) < 0.1 ? undefined : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(Math.abs(diff) < 10 ? 1 : 0)} ${units}`;
  const age = new Date().getFullYear() - p.birthYear;
  const gender = p.gender === 'male' ? 'Male' : p.gender === 'female' ? 'Female' : 'Other';

  return (
    <SafeAreaView style={st.white} edges={['top']}>
      <StatusBar style="dark" />
      <View style={st.bar}>
        <Pressable onPress={() => { tap(); onBack(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [st.backBtn, pressed && { opacity: 0.5 }]}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Animated.Text entering={rise(0)} style={st.resEyebrow}>
          Get Dream Abs with Our Plan by
        </Animated.Text>
        <Animated.Text entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(140).easing(EASE_OUT))} style={st.resDate}>
          {date.getDate()} {MONTHS[date.getMonth()].toUpperCase()}
        </Animated.Text>
        <Animated.View entering={rise(260)} style={[st.card, { marginTop: 18, paddingTop: 18 }]}>
          <GoalCurve from={toUnit(p.weightKg, units)} to={toUnit(p.targetKg, units)} fromText={`${fmtWeight(p.weightKg, units, 0)}\nCurrent`} toText={`${fmtWeight(p.targetKg, units, 0)}\nTarget`} badge={badge} height={140} />
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Animated.View entering={rise(380)} style={[st.card, { flex: 1 }]}>
            <Text style={st.resCardTitle}>About You</Text>
            <Text style={st.resLine}>
              {gender}, {age} years old
            </Text>
            <Text style={st.resLine}>
              {fmtWeight(p.weightKg, units, 0)} → {fmtWeight(p.targetKg, units, 0)}
            </Text>
            <View style={st.resChecks}>
              <Check text={`${p.weeklyGoal} workouts / week`} />
              <Check text={`${weeks} weeks`} />
            </View>
          </Animated.View>
          <Animated.View entering={rise(460)} style={[st.card, { flex: 1 }]}>
            <Text style={st.resCardTitle}>About Plan</Text>
            <Text style={st.resLine}>Personalized workouts</Text>
            <Text style={st.resLine}>Custom meal plan</Text>
            <View style={st.resPlanArt}>
              <Ionicons name="barbell" size={22} color={C.primary} />
              <Ionicons name="nutrition" size={22} color={C.accent} />
              <Ionicons name="calendar" size={22} color={C.steps} />
            </View>
          </Animated.View>
        </View>
        <Animated.Text entering={nativeOnly(FadeIn.delay(600))} style={st.resNote}>
          Your results may vary. This estimate is based on your answers and a steady weekly pace.
        </Animated.Text>
      </ScrollView>
      <Cta>
        <Button title="Get My Plan" onPress={onNext} />
      </Cta>
    </SafeAreaView>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Ionicons name="checkmark" size={14} color={C.primary} />
      <Text style={st.resCheck}>{text}</Text>
    </View>
  );
}

function Cta({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.cta, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{children}</View>;
}

/* ---------------- 22 · Paywall ---------------- */

export function Paywall({ male, gaining, onSkip, onSubscribe }: { male: boolean; gaining: boolean; onSkip: () => void; onSubscribe: (tier: PlanTier, months: number) => void }) {
  const [tier, setTier] = useState<PlanTier>('smart');
  const [months, setMonths] = useState(DEFAULT_MONTHS);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { plan, dur } = planFor(tier, months);
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
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(250))} style={st.payBadge}>
            <Ionicons name="star" size={12} color={C.white} />
            <Text style={st.payBadgeText}>Best Value</Text>
          </Animated.View>
        </View>
        <View style={{ paddingHorizontal: GUTTER }}>
          <Animated.Text entering={rise(80)} style={st.payTitle}>
            GET PERSONALIZED{'\n'}
            <Text style={{ color: C.primary }}>{gaining ? 'MUSCLE-BUILDING' : 'FAT-LOSING'}</Text> PLAN!
          </Animated.Text>
          <PlanPicker tier={tier} months={months} onTier={setTier} onMonths={setMonths} enterAt={1} titleTop={18} />
        </View>
      </ScrollView>
      <Cta>
        <Text style={st.payNote} numberOfLines={1}>
          {plan.name} · {dur.months} months · {formatINR(Math.round(dur.price / dur.months))}/mo · save {pctOff(dur)}%
        </Text>
        <Button
          title={`CONTINUE · ${formatINR(dur.price)}`}
          loading={loading}
          onPress={() => {
            setLoading(true);
            setTimeout(() => {
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
          onSubscribe(tier, dur.months);
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  white: { flex: 1, backgroundColor: C.white },
  introPhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%' },
  introTitle: { fontSize: 23, lineHeight: 29, fontWeight: '900', fontStyle: 'italic', color: C.white, textAlign: 'center', letterSpacing: -0.3 },
  introLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  introValue: { fontSize: 34, fontWeight: '900', color: C.gold, marginTop: 2, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  introLogin: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  introLoginLink: { color: C.white, fontWeight: '700', textDecorationLine: 'underline' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 132, height: 132, borderRadius: 66, backgroundColor: C.primary },
  coach: { width: 132, height: 132, borderRadius: 66, overflow: 'hidden', backgroundColor: C.skeleton, borderWidth: 4, borderColor: C.white },
  hello: { fontSize: 30, fontWeight: '800', color: C.text, marginTop: 24, letterSpacing: -0.6 },
  helloSub: { fontSize: 15, color: C.textSoft, marginTop: 6 },

  motTitle: { fontSize: 32, lineHeight: 39, fontWeight: '800', color: C.white, marginTop: 28, letterSpacing: -0.6, maxWidth: 300 },
  textBtn: { alignItems: 'center', paddingVertical: 14 },
  textBtnLabel: { fontSize: 15, fontWeight: '700', color: C.textSoft },

  anTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4, textAlign: 'center' },
  anRings: { flexDirection: 'row', gap: 26, marginTop: 30 },
  anIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  anStats: { flexDirection: 'row', marginTop: 34, alignSelf: 'stretch', backgroundColor: C.surfaceAlt, borderRadius: R.lg, paddingVertical: 16 },
  anStat: { flex: 1, alignItems: 'center' },
  anStatDivider: { borderLeftWidth: 1, borderLeftColor: C.border },
  anStatVal: { fontSize: 22, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  anStatUnit: { fontSize: 13, fontWeight: '700', color: C.textSoft },
  anStatKey: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  anList: { alignSelf: 'stretch', marginTop: 28, gap: 16, paddingHorizontal: 8 },
  anRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anRowText: { flex: 1, fontSize: 15, color: C.textSoft },
  anPct: { fontSize: 13, fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },

  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  resEyebrow: { fontSize: 17, fontWeight: '700', color: C.text, textAlign: 'center' },
  resDate: { fontSize: 36, fontWeight: '900', color: C.primary, textAlign: 'center', letterSpacing: -0.5, marginTop: 4 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  resCardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 8 },
  resLine: { fontSize: 13, color: C.textSoft, lineHeight: 19 },
  resChecks: { marginTop: 10, gap: 4 },
  resCheck: { fontSize: 12.5, fontWeight: '700', color: C.text },
  resPlanArt: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resNote: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 16, lineHeight: 15 },
  cta: { paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: C.white },

  paywall: { flex: 1, backgroundColor: C.bg },
  payHero: { height: 300, backgroundColor: C.skeleton },
  payTop: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  payClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(12,10,9,0.35)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  payBadge: { position: 'absolute', left: GUTTER, bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  payBadgeText: { color: C.white, fontWeight: '800', fontSize: 12 },
  payTitle: { fontSize: 26, lineHeight: 31, fontWeight: '900', color: C.text, letterSpacing: -0.4, fontStyle: 'italic' },
  payNote: { fontSize: 12, color: C.textSoft, fontWeight: '600', textAlign: 'center', marginBottom: 8, fontVariant: ['tabular-nums'] },
  payFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 },
  payFootText: { fontSize: 11.5, color: C.textSoft, fontWeight: '600' },
});

