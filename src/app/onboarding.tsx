import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';

import { WheelPicker, range } from '@/components/WheelPicker';
import { PlanAccordion } from '@/components/program/PlanAccordion';
import { Button, Chip, Dialog, IconButton, MacroBar, OptionCard, ProgressBar, Ring, Segmented, T, tap, useToast } from '@/components/ui';
import { bmi, bmiLabel, cmToFtIn, targets } from '@/lib/calc';
import { DEFAULT_PROFILE, useStore, type Profile } from '@/lib/store';
import { PLAN_TIERS, formatINR } from '@/data/plans';
import { programById } from '@/data/program';
import { BRAND, C, R, shadow } from '@/theme';

/* ---------------- Options ---------------- */

const GOALS = [
  { v: 'lose', t: 'Lose weight', s: 'Burn fat and get leaner', e: '🔥' },
  { v: 'maintain', t: 'Maintain weight', s: 'Stay fit at your current weight', e: '⚖️' },
  { v: 'gain', t: 'Gain weight', s: 'Healthy weight gain with the right food', e: '🍽️' },
  { v: 'muscle', t: 'Build muscle', s: 'Get stronger with high-protein eating', e: '💪' },
  { v: 'healthy', t: 'Manage a health condition', s: 'Diabetes, PCOS, thyroid, BP & more', e: '❤️' },
] as const;
const MOTIVATIONS = [
  ['😎', 'Feel more confident'],
  ['⚡', 'Have more energy'],
  ['🩺', 'Improve my health reports'],
  ['👖', 'Fit into my old clothes'],
  ['💍', 'Upcoming wedding or event'],
  ['👨‍⚕️', "Doctor's advice"],
];
const GENDERS = [
  { v: 'male', t: 'Male', e: '👨' },
  { v: 'female', t: 'Female', e: '👩' },
  { v: 'other', t: 'Other', e: '🧑' },
] as const;
const ACTIVITY = [
  { v: 'sedentary', t: 'Sedentary', s: 'Mostly sitting: desk job, little movement', e: '🪑' },
  { v: 'light', t: 'Lightly active', s: 'On your feet sometimes: light walks, chores', e: '🚶' },
  { v: 'moderate', t: 'Moderately active', s: 'Exercise 3–5 days a week or an active job', e: '🏃' },
  { v: 'very', t: 'Very active', s: 'Intense exercise daily or physical work', e: '🏋️' },
] as const;
const EXERCISE = [
  ['🛋️', "I don't exercise right now"],
  ['🚶', '1–2 days a week'],
  ['🏃', '3–4 days a week'],
  ['🔥', '5+ days a week'],
];
const DIETS = [
  ['🥦', 'Vegetarian', 'Plant foods plus dairy'],
  ['🍗', 'Non-vegetarian', 'Includes chicken, fish, meat and eggs'],
  ['🥚', 'Eggetarian', 'Vegetarian plus eggs'],
  ['🌱', 'Vegan', 'No animal products at all'],
  ['🙏', 'Jain', 'No root vegetables, onion or garlic'],
];
const CUISINES = ['North Indian', 'South Indian', 'Gujarati', 'Maharashtrian', 'Bengali', 'Punjabi', 'Rajasthani', 'Continental', 'Chinese', 'Mediterranean'];
const RESTRICTIONS = ['No restrictions', 'Lactose intolerant', 'Gluten-free', 'Nut allergy', 'No onion & garlic', 'Low sugar', 'Seafood allergy'];
const CONDITIONS = ['None', 'Diabetes / Pre-diabetes', 'PCOS / PCOD', 'Thyroid', 'Hypertension (BP)', 'High cholesterol', 'Fatty liver'];
const SLEEP = ['Under 5 hrs', '5–6 hrs', '7–8 hrs', 'Over 8 hrs'];
const WATER = ['Under 4 glasses', '4–6 glasses', '7–9 glasses', '10+ glasses'];
const CHALLENGES = [
  ['⏰', 'Lack of time'],
  ['🍫', 'Cravings & late-night snacking'],
  ['😣', 'Stress eating'],
  ['🕐', 'Irregular meal times'],
  ['🍕', 'Eating out often'],
  ['📉', 'Staying motivated'],
];
const MEAL_SLOTS = {
  breakfast: ['6:30 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:30 AM', '10:30 AM'],
  lunch: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '3:00 PM'],
  dinner: ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:30 PM', '10:30 PM'],
};
const PACES = [
  { v: 0.25, t: 'Slow & steady', s: 'Easiest to sustain' },
  { v: 0.5, t: 'Recommended', s: 'Best balance of speed and comfort', badge: 'BEST' },
  { v: 0.75, t: 'Faster', s: 'Needs more discipline' },
  { v: 1, t: 'Aggressive', s: 'Only with expert guidance' },
];

type StepId =
  | 'welcome' | 'signin' | 'name' | 'goal' | 'motivation' | 'gender' | 'age' | 'height' | 'weight' | 'target' | 'pace' | 'projection'
  | 'activity' | 'exercise' | 'program' | 'diet' | 'cuisines' | 'restrictions' | 'conditions' | 'lifestyle' | 'challenges' | 'meals' | 'permissions' | 'notify'
  | 'generating' | 'plan' | 'paywall';

const ALL_STEPS: StepId[] = [
  'welcome', 'signin', 'name', 'goal', 'motivation', 'gender', 'age', 'height', 'weight', 'target', 'pace', 'projection',
  'activity', 'exercise', 'program', 'diet', 'cuisines', 'restrictions', 'conditions', 'lifestyle', 'challenges', 'meals', 'permissions',
  'notify', 'generating', 'plan', 'paywall',
];
const NO_CHROME: StepId[] = ['welcome', 'signin', 'notify', 'generating', 'plan', 'paywall'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtGoalDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const toggleIn = (list: string[], v: string, exclusive?: string) => {
  if (v === exclusive) return list.includes(v) ? [] : [v];
  const base = list.filter((x) => x !== exclusive);
  return base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
};

/* ---------------- Screen ---------------- */

// Survives remounts (e.g. a reload mid-onboarding) so answers and position are never lost.
let resume: { p: Profile; step: StepId } | null = null;

export default function Onboarding() {
  const { state, completeOnboarding, subscribe } = useStore();
  const toast = useToast();
  const [p, setP] = useState<Profile>(() => resume?.p ?? (state.profile.name ? state.profile : DEFAULT_PROFILE));
  const set = (patch: Partial<Profile>) => setP((d) => ({ ...d, ...patch }));
  const [step, setStep] = useState<StepId>(() => (resume?.step === 'generating' ? 'plan' : resume?.step) ?? 'welcome');
  useEffect(() => {
    resume = { p, step };
  }, [p, step]);
  const dir = useRef(1);
  const anim = useRef(new Animated.Value(1)).current;

  const tracksWeight = p.goal !== 'maintain' && p.goal !== 'healthy';
  const steps = useMemo(() => ALL_STEPS.filter((s) => tracksWeight || !['target', 'pace', 'projection'].includes(s)), [tracksWeight]);
  const questions = steps.filter((s) => !NO_CHROME.includes(s));
  const qIndex = questions.indexOf(step);
  const t = useMemo(() => targets(p), [p]);

  const go = (to: StepId, d: 1 | -1) => {
    dir.current = d;
    setStep(to);
  };
  // Animate in after the new step has rendered, so there is never a blank frame.
  useEffect(() => {
    anim.setValue(0.4);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [step, anim]);
  const next = () => {
    const i = steps.indexOf(step);
    if (i < steps.length - 1) go(steps[i + 1], 1);
  };
  const back = () => {
    const i = steps.indexOf(step);
    if (step === 'plan' || step === 'paywall') return go(step === 'plan' ? 'notify' : 'plan', -1);
    if (i > 0) go(steps[i - 1], -1);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'welcome') return false;
      back();
      return true;
    });
    return () => sub.remove();
  });

  const finish = (premiumMonths?: number) => {
    resume = null;
    completeOnboarding(p);
    if (premiumMonths) subscribe('smart', premiumMonths);
    router.replace('/(tabs)');
    setTimeout(() => toast(`Welcome to ${BRAND}, ${p.name.split(' ')[0] || 'friend'}! 🎉`, 'sparkles'), 400);
  };

  const canNext = (() => {
    switch (step) {
      case 'name': return p.name.trim().length >= 2;
      case 'motivation': return p.motivations.length > 0;
      case 'target':
        if (p.goal === 'lose') return p.targetKg < p.weightKg;
        if (p.goal === 'gain' || p.goal === 'muscle') return p.targetKg > p.weightKg;
        return true;
      case 'exercise': return !!p.exercise;
      case 'diet': return !!p.diet;
      case 'cuisines': return p.cuisines.length > 0;
      case 'restrictions': return p.restrictions.length > 0;
      case 'conditions': return p.conditions.length > 0;
      case 'lifestyle': return !!p.sleep && !!p.waterHabit;
      case 'challenges': return p.challenges.length > 0;
      default: return true;
    }
  })();

  const translateX = anim.interpolate({ inputRange: [0.4, 1], outputRange: [dir.current * 24, 0] });
  const body = (
    <Animated.View style={{ flex: 1, opacity: anim, transform: [{ translateX }] }}>
      {renderStep()}
    </Animated.View>
  );

  if (step === 'welcome') return <Welcome onStart={next} onLogin={next} />;
  if (step === 'signin') return <SignIn onBack={back} onDone={(phone) => { set({ phone }); next(); }} />;
  if (step === 'notify') return <NotifyStep onBack={back} onDone={(allow) => { set({ notifications: allow }); next(); }} />;
  if (step === 'generating') return <Generating name={p.name} onDone={next} />;
  if (step === 'plan') return <PlanReady p={p} onBack={back} onNext={next} />;
  if (step === 'paywall') return <Paywall onSkip={() => finish()} onTrial={(m) => finish(m)} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.topBar}>
          <IconButton icon="arrow-back" bg={C.bg} onPress={back} />
          <ProgressBar value={(qIndex + 1) / questions.length} style={{ flex: 1 }} height={7} />
          <Text style={st.counter}>
            {qIndex + 1}/{questions.length}
          </Text>
        </View>
        {body}
        <View style={st.footer}>
          <Button title="Continue" disabled={!canNext} onPress={next} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderStep() {
    switch (step) {
      case 'name':
        return (
          <Q title="What should we call you?" sub="We'll use this to personalise your plan.">
            <TextInput
              value={p.name}
              onChangeText={(name) => set({ name })}
              placeholder="Your first name"
              placeholderTextColor={C.muted}
              style={st.input}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => canNext && next()}
              maxLength={30}
            />
            {p.name.trim().length >= 2 && <Text style={[T.body, { marginTop: 16 }]}>Nice to meet you, {p.name.trim().split(' ')[0]}! 👋</Text>}
          </Q>
        );
      case 'goal':
        return (
          <Q title={`What's your main goal, ${p.name.split(' ')[0]}?`} sub="Your calorie budget and plan are built around this.">
            {GOALS.map((g) => (
              <OptionCard key={g.v} emoji={g.e} title={g.t} subtitle={g.s} selected={p.goal === g.v} onPress={() => set({ goal: g.v, targetKg: g.v === 'lose' ? Math.min(p.targetKg, p.weightKg - 1) : g.v === 'gain' || g.v === 'muscle' ? Math.max(p.targetKg, p.weightKg + 1) : p.weightKg })} />
            ))}
          </Q>
        );
      case 'motivation':
        return (
          <Q title="What's motivating you?" sub="Pick all that apply. Knowing your 'why' helps us keep you going.">
            {MOTIVATIONS.map(([e, label]) => (
              <OptionCard key={label} multi emoji={e} title={label} selected={p.motivations.includes(label)} onPress={() => set({ motivations: toggleIn(p.motivations, label) })} />
            ))}
          </Q>
        );
      case 'gender':
        return (
          <Q title="What's your gender?" sub="This helps us calculate your metabolism accurately.">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {GENDERS.map((g) => (
                <Pressable key={g.v} onPress={() => { tap(); set({ gender: g.v }); }} style={[st.genderCard, p.gender === g.v && st.genderOn]}>
                  <Text style={{ fontSize: 44 }}>{g.e}</Text>
                  <Text style={[T.h3, { marginTop: 10 }]}>{g.t}</Text>
                  <View style={[st.radio, p.gender === g.v && { borderColor: C.primary }]}>{p.gender === g.v && <View style={st.radioDot} />}</View>
                </Pressable>
              ))}
            </View>
          </Q>
        );
      case 'age':
        return (
          <Q title="How old are you?" sub="Metabolism changes with age, so this keeps your numbers right." scroll={false}>
            <WheelPicker key="age" values={range(13, 90)} value={p.age} onChange={(age) => set({ age })} unit="yrs" />
          </Q>
        );
      case 'height':
        return <HeightStep p={p} set={set} />;
      case 'weight': {
        const b = bmi(p.weightKg, p.heightCm);
        const l = bmiLabel(b);
        return (
          <Q title="What's your current weight?" sub="Be honest — this is only for you." scroll={false}>
            <WheelPicker key="weight" values={range(30, 180, 0.5)} value={p.weightKg} onChange={(weightKg) => set({ weightKg })} unit="kg" format={(v) => v.toFixed(1)} />
            <View style={[st.infoBox, { marginTop: 24 }]}>
              <Text style={T.small}>Your BMI</Text>
              <Text style={[T.h2, { color: l.color }]}>
                {b.toFixed(1)} <Text style={{ fontSize: 15 }}>· {l.label}</Text>
              </Text>
              <BmiScale value={b} />
            </View>
          </Q>
        );
      }
      case 'target': {
        const diff = Math.abs(p.targetKg - p.weightKg);
        const losing = p.goal === 'lose';
        return (
          <Q title="What's your target weight?" sub={losing ? 'Pick a realistic goal — you can always change it later.' : 'Choose where you would like to be.'} scroll={false}>
            <WheelPicker key="target" values={range(30, 180, 0.5)} value={p.targetKg} onChange={(targetKg) => set({ targetKg })} unit="kg" format={(v) => v.toFixed(1)} />
            <View style={[st.infoBox, { marginTop: 24, backgroundColor: canNext ? C.primarySoft : C.dangerSoft }]}>
              {canNext ? (
                <Text style={[T.body, { color: C.primaryDark, fontWeight: '700' }]}>
                  {losing ? '🎯 You will lose' : '🎯 You will gain'} {diff.toFixed(1)} kg ({((diff / p.weightKg) * 100).toFixed(0)}% of your body weight)
                </Text>
              ) : (
                <Text style={[T.body, { color: C.danger, fontWeight: '700' }]}>
                  {losing ? 'Your target should be lower than your current weight' : 'Your target should be higher than your current weight'} ({p.weightKg.toFixed(1)} kg)
                </Text>
              )}
            </View>
          </Q>
        );
      }
      case 'pace':
        return (
          <Q title={`How fast do you want to ${p.goal === 'lose' ? 'lose' : 'gain'} weight?`} sub="Per week. Slower is easier to sustain.">
            {PACES.map((o) => {
              const weeks = Math.ceil(Math.abs(p.weightKg - p.targetKg) / o.v);
              const d = new Date();
              d.setDate(d.getDate() + weeks * 7);
              return <OptionCard key={o.v} title={`${o.v} kg / week · ${o.t}`} subtitle={`${o.s}. Reach ${p.targetKg} kg by ${fmtGoalDate(d)}`} badge={o.badge} selected={p.pace === o.v} onPress={() => set({ pace: o.v })} />;
            })}
          </Q>
        );
      case 'projection':
        return (
          <Q title={`${p.name.split(' ')[0]}, you can reach ${p.targetKg} kg by ${fmtGoalDate(t.goalDate)}`} sub="Based on your profile and chosen pace.">
            <ProjectionChart from={p.weightKg} to={p.targetKg} weeks={t.weeks} />
            <View style={[st.infoBox, { marginTop: 18, flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
              <Text style={{ fontSize: 30 }}>📊</Text>
              <Text style={[T.body, { flex: 1 }]}>
                Members who log their meals at least 5 days a week are <Text style={{ fontWeight: '800', color: C.primaryDark }}>far more likely</Text> to reach their goal. We'll help you build that habit.
              </Text>
            </View>
          </Q>
        );
      case 'activity':
        return (
          <Q title="How active are you in a typical day?" sub="Not counting workouts.">
            {ACTIVITY.map((a) => (
              <OptionCard key={a.v} emoji={a.e} title={a.t} subtitle={a.s} selected={p.activity === a.v} onPress={() => set({ activity: a.v })} />
            ))}
          </Q>
        );
      case 'exercise':
        return (
          <Q title="How often do you work out?" sub="Walking, yoga, gym, sports — everything counts.">
            {EXERCISE.map(([e, label]) => (
              <OptionCard
                key={label}
                emoji={e}
                title={label}
                selected={p.exercise === label}
                onPress={() => {
                  const lvl = EXERCISE.findIndex((x) => x[1] === label);
                  set({ exercise: label, program: lvl >= 3 ? 'sixpack' : lvl === 2 ? 'abs' : 'belly', weeklyGoal: [3, 3, 4, 5][lvl] ?? 3 });
                }}
              />
            ))}
          </Q>
        );
      case 'program':
        return (
          <Q title="Pick your 30-day training plan" sub="Short daily home workouts. We've suggested one based on your fitness level — you can switch anytime.">
            <PlanAccordion value={p.program} onChange={(program) => set({ program })} onStart={() => next()} cta="Choose this plan" />
          </Q>
        );
      case 'diet':
        return (
          <Q title="What's your diet preference?" sub="We'll only suggest foods that fit how you eat.">
            {DIETS.map(([e, label, sub]) => (
              <OptionCard key={label} emoji={e} title={label} subtitle={sub} selected={p.diet === label} onPress={() => set({ diet: label })} />
            ))}
          </Q>
        );
      case 'cuisines':
        return (
          <Q title="Which cuisines do you enjoy?" sub="Pick all that you eat regularly.">
            <View style={st.chipWrap}>
              {CUISINES.map((c) => (
                <Chip key={c} label={c} selected={p.cuisines.includes(c)} onPress={() => set({ cuisines: toggleIn(p.cuisines, c) })} style={st.bigChip} />
              ))}
            </View>
          </Q>
        );
      case 'restrictions':
        return (
          <Q title="Any food allergies or restrictions?" sub="Select all that apply.">
            {RESTRICTIONS.map((r) => (
              <OptionCard key={r} multi title={r} selected={p.restrictions.includes(r)} onPress={() => set({ restrictions: toggleIn(p.restrictions, r, 'No restrictions') })} />
            ))}
          </Q>
        );
      case 'conditions':
        return (
          <Q title="Do you have any medical conditions?" sub="This helps our experts tailor your nutrition safely.">
            {CONDITIONS.map((r) => (
              <OptionCard key={r} multi title={r} selected={p.conditions.includes(r)} onPress={() => set({ conditions: toggleIn(p.conditions, r, 'None') })} />
            ))}
            <Text style={[T.tiny, { marginTop: 6 }]}>🔒 Your health information is private and stays on this device in this demo.</Text>
          </Q>
        );
      case 'lifestyle':
        return (
          <Q title="Tell us about your lifestyle" sub="Sleep and hydration affect hunger and energy.">
            <Text style={st.groupLabel}>😴 How many hours do you sleep?</Text>
            <View style={st.chipWrap}>
              {SLEEP.map((x) => (
                <Chip key={x} label={x} selected={p.sleep === x} onPress={() => set({ sleep: x })} style={st.bigChip} />
              ))}
            </View>
            <Text style={[st.groupLabel, { marginTop: 26 }]}>💧 How much water do you drink daily?</Text>
            <View style={st.chipWrap}>
              {WATER.map((x) => (
                <Chip key={x} label={x} selected={p.waterHabit === x} onPress={() => set({ waterHabit: x })} style={st.bigChip} />
              ))}
            </View>
          </Q>
        );
      case 'challenges':
        return (
          <Q title="What gets in the way of eating healthy?" sub="Pick your biggest challenges — we'll plan around them.">
            {CHALLENGES.map(([e, label]) => (
              <OptionCard key={label} multi emoji={e} title={label} selected={p.challenges.includes(label)} onPress={() => set({ challenges: toggleIn(p.challenges, label) })} />
            ))}
          </Q>
        );
      case 'meals':
        return (
          <Q title="When do you usually eat?" sub="We'll remind you to log at the right time.">
            {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
              <View key={m} style={{ marginBottom: 22 }}>
                <Text style={st.groupLabel}>{m === 'breakfast' ? '🌅 Breakfast' : m === 'lunch' ? '☀️ Lunch' : '🌙 Dinner'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                  {MEAL_SLOTS[m].map((slot) => (
                    <Chip key={slot} label={slot} selected={p.mealTimes[m] === slot} onPress={() => set({ mealTimes: { ...p.mealTimes, [m]: slot } })} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </Q>
        );
      case 'permissions':
        return <PermissionsStep p={p} set={set} />;
      default:
        return null;
    }
  }
}

/* ---------------- Sub-steps ---------------- */

function Q({ title, sub, children, scroll = true }: { title: string; sub?: string; children: React.ReactNode; scroll?: boolean }) {
  const inner = (
    <>
      <Text style={T.h1}>{title}</Text>
      {sub && <Text style={[T.body, { marginTop: 8 }]}>{sub}</Text>}
      <View style={{ marginTop: 24 }}>{children}</View>
    </>
  );
  return scroll ? (
    <ScrollView contentContainerStyle={st.qBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {inner}
    </ScrollView>
  ) : (
    <View style={st.qBody}>{inner}</View>
  );
}

function HeightStep({ p, set }: { p: Profile; set: (x: Partial<Profile>) => void }) {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  return (
    <Q title="How tall are you?" scroll={false}>
      <Segmented options={[{ value: 'cm', label: 'cm' }, { value: 'ft', label: 'ft / in' }]} value={unit} onChange={setUnit} style={{ marginBottom: 24, alignSelf: 'center', width: 200 }} />
      {unit === 'cm' ? (
        <WheelPicker key="cm" values={range(120, 220)} value={p.heightCm} onChange={(heightCm) => set({ heightCm })} unit="cm" />
      ) : (
        <WheelPicker key="ft" values={range(48, 86)} value={Math.round(p.heightCm / 2.54)} onChange={(inch) => set({ heightCm: Math.round(inch * 2.54) })} format={(v) => `${Math.floor(v / 12)}′ ${v % 12}″`} />
      )}
      <Text style={[T.small, { textAlign: 'center', marginTop: 16 }]}>
        {p.heightCm} cm · {cmToFtIn(p.heightCm)}
      </Text>
    </Q>
  );
}

function PermissionsStep({ p, set }: { p: Profile; set: (x: Partial<Profile>) => void }) {
  const [ask, setAsk] = useState<null | 'health' | 'notif'>(null);
  const toast = useToast();
  const healthName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
  const answer = (allow: boolean) => {
    if (ask === 'health') set({ healthSync: allow });
    if (ask === 'notif') set({ notifications: allow });
    if (allow) toast(ask === 'health' ? `${healthName} connected` : 'Reminders turned on', 'checkmark-circle');
    setAsk(null);
  };
  const card = (on: boolean, emoji: string, title: string, sub: string, onPress: () => void) => (
    <View style={[st.permCard, on && { borderColor: C.primary, backgroundColor: C.primarySoft }]}>
      <Text style={{ fontSize: 34 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>{title}</Text>
        <Text style={[T.small, { marginTop: 4, lineHeight: 18 }]}>{sub}</Text>
      </View>
      {on ? (
        <View style={st.connected}>
          <Ionicons name="checkmark" size={16} color={C.white} />
        </View>
      ) : (
        <Button title="Allow" small onPress={onPress} />
      )}
    </View>
  );
  return (
    <Q title="Connect your health app" sub="Optional, but it makes activity tracking effortless.">
      {card(p.healthSync, '👟', `Sync with ${healthName}`, 'Automatically track steps and workouts.', () => setAsk('health'))}
      <View style={[st.infoBox, { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 }]}>
        <Text style={{ fontSize: 26 }}>🔒</Text>
        <Text style={[T.small, { flex: 1, lineHeight: 18 }]}>We only read steps, workouts and weight. Your data never leaves this device in the demo.</Text>
      </View>
      <Text style={[T.tiny, { textAlign: 'center', marginTop: 8 }]}>You can change these anytime in Profile → Settings.</Text>
      <Dialog
        visible={!!ask}
        icon={ask === 'health' ? '👟' : '🔔'}
        title={ask === 'health' ? `"${BRAND}" would like to access your step count and workouts` : `"${BRAND}" would like to send you notifications`}
        text={ask === 'health' ? `Data from ${healthName} is used to show your activity and calories burned.` : 'Notifications may include alerts, sounds and icon badges.'}
        cancel="Don't allow"
        confirm="Allow"
        onCancel={() => answer(false)}
        onConfirm={() => answer(true)}
      />
    </Q>
  );
}

function BmiScale({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, (value - 15) / 20));
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ flex: 3.5, backgroundColor: '#3B82F6' }} />
        <View style={{ flex: 4.5, backgroundColor: C.primary }} />
        <View style={{ flex: 4.5, backgroundColor: C.carbs }} />
        <View style={{ flex: 7.5, backgroundColor: C.danger }} />
      </View>
      <View style={{ position: 'absolute', left: `${pct * 100}%`, top: -4, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: C.white, borderWidth: 3, borderColor: C.text }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {['Under', 'Healthy', 'Over', 'Obese'].map((x) => (
          <Text key={x} style={T.tiny}>
            {x}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ProjectionChart({ from, to, weeks }: { from: number; to: number; weeks: number }) {
  const [w, setW] = useState(300);
  const h = 190;
  const pad = 26;
  const y = (kg: number) => {
    const hi = Math.max(from, to);
    const lo = Math.min(from, to);
    return pad + ((hi - kg) / Math.max(hi - lo, 0.1)) * (h - pad * 2);
  };
  const x0 = pad;
  const x1 = w - pad;
  const path = `M ${x0} ${y(from)} C ${x0 + (x1 - x0) * 0.4} ${y(from)}, ${x0 + (x1 - x0) * 0.55} ${y(to)}, ${x1} ${y(to)}`;
  const area = `${path} L ${x1} ${h} L ${x0} ${h} Z`;
  return (
    <View style={[st.chartCard]} onLayout={(e) => setW(e.nativeEvent.layout.width - 32)}>
      <Svg width={w} height={h}>
        <Defs>
          <SvgGrad id="g" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.primary} stopOpacity={0.25} />
            <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
          </SvgGrad>
        </Defs>
        <Line x1={x0} x2={x1} y1={y(to)} y2={y(to)} stroke={C.border} strokeDasharray="4 4" />
        <Path d={area} fill="url(#g)" />
        <Path d={path} stroke={C.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
        <Circle cx={x0} cy={y(from)} r={7} fill={C.white} stroke={C.accent} strokeWidth={4} />
        <Circle cx={x1} cy={y(to)} r={8} fill={C.primary} stroke={C.white} strokeWidth={3} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <View>
          <Text style={T.tiny}>TODAY</Text>
          <Text style={[T.h3, { color: C.accent }]}>{from.toFixed(1)} kg</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={T.tiny}>IN {weeks} WEEKS</Text>
          <Text style={[T.h3, { color: C.primaryDark }]}>{to.toFixed(1)} kg</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Full-screen steps ---------------- */

const SLIDES = [
  { emoji: '🥗', title: 'Track calories with a snap', text: 'Photo-log your meals and get calories & macros instantly. Built for Indian food — from roti to rajma.' },
  { emoji: '🔥', title: '30-day home workout plans', text: 'Short daily routines for every level — lose belly fat, build rock-hard abs, no equipment needed.' },
  { emoji: '🧑‍⚕️', title: 'Experts & AI in your pocket', text: 'Personal plans from certified coaches, plus Ria — your 24×7 AI nutrition coach.' },
];

function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const ref = useRef<ScrollView>(null);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setI(Math.round(e.nativeEvent.contentOffset.x / width));
  useEffect(() => {
    const id = setInterval(() => {
      setI((n) => {
        const nx = (n + 1) % SLIDES.length;
        ref.current?.scrollTo({ x: nx * width, animated: true });
        return nx;
      });
    }, 3500);
    return () => clearInterval(id);
  }, [width]);
  return (
    <LinearGradient colors={['#0B1220', '#122033', '#0A3A2C']} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={st.heroTitle}>{BRAND.toUpperCase()}</Text>
            <Text style={st.heroSub}>EAT RIGHT · TRAIN HARD · 30 DAYS</Text>
            <View style={st.heroBadge}>
              <View style={st.heroBadgeIcon}>
                <Ionicons name="leaf" size={12} color={C.white} />
              </View>
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>NUTRITION + FITNESS</Text>
            </View>
          </View>
          <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={{ flexGrow: 0, marginTop: 44 }}>
            {SLIDES.map((s) => (
              <View key={s.title} style={{ width, paddingHorizontal: 32, alignItems: 'center' }}>
                <View style={st.heroEmoji}>
                  <Text style={{ fontSize: 64 }}>{s.emoji}</Text>
                </View>
                <Text style={[T.h2, { color: C.white, textAlign: 'center', marginTop: 22 }]}>{s.title}</Text>
                <Text style={[T.body, { color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 8 }]}>{s.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={st.dots}>
            {SLIDES.map((_, n) => (
              <View key={n} style={[st.dot, { backgroundColor: 'rgba(255,255,255,0.25)' }, n === i && st.dotOn]} />
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 8, gap: 6 }}>
          <Pressable onPress={() => { tap(); onStart(); }} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={[C.primary, '#0B8F63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.startBtn}>
              <Text style={st.startText}>START</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onLogin} style={{ alignSelf: 'center', paddingVertical: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>I already have an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function NotifyStep({ onBack, onDone }: { onBack: () => void; onDone: (allow: boolean) => void }) {
  const [ask, setAsk] = useState(false);
  const toast = useToast();
  const now = new Date();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={st.topBar}>
        <IconButton icon="arrow-back" onPress={onBack} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={st.phone}>
          <View style={st.phoneNotch} />
          <Text style={st.phoneTime}>
            {now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}
          </Text>
          <Text style={{ textAlign: 'center', color: C.textSoft, fontWeight: '600', fontSize: 12 }}>{fmtGoalDate(now)}</Text>
          <View style={st.notifCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[st.logo, { width: 18, height: 18, borderRadius: 5 }]}>
                <Ionicons name="leaf" size={10} color={C.white} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSoft, flex: 1 }}>{BRAND}</Text>
              <Text style={{ fontSize: 10, color: C.muted }}>now</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.text, marginTop: 6, lineHeight: 16 }}>Small steps, big changes! Log your breakfast and start today's Day 1 workout 💪</Text>
          </View>
        </View>
        <Text style={[T.h2, { textAlign: 'center', marginTop: 30 }]}>85% of users get better results with reminders</Text>
        <Text style={[T.body, { textAlign: 'center', marginTop: 10 }]}>With reminders, you'll easily stick to your meal and workout plan and stay motivated every day.</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Button title="Grant now" onPress={() => setAsk(true)} />
        <Pressable onPress={() => onDone(false)} style={{ alignSelf: 'center', paddingVertical: 14 }}>
          <Text style={{ color: C.textSoft, fontWeight: '700' }}>Maybe later</Text>
        </Pressable>
      </View>
      <Dialog
        visible={ask}
        icon="🔔"
        title={`"${BRAND}" would like to send you notifications`}
        text="Notifications may include alerts, sounds and icon badges."
        cancel="Don't allow"
        confirm="Allow"
        onCancel={() => { setAsk(false); onDone(false); }}
        onConfirm={() => { setAsk(false); toast('Reminders turned on', 'notifications'); onDone(true); }}
      />
    </SafeAreaView>
  );
}

function SignIn({ onBack, onDone }: { onBack: () => void; onDone: (phone: string) => void }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<null | 'otp' | 'verify' | 'google'>(null);
  const toast = useToast();
  const otpRef = useRef<TextInput>(null);

  const run = (kind: 'otp' | 'verify' | 'google', then: () => void) => {
    setLoading(kind);
    setTimeout(() => {
      setLoading(null);
      then();
    }, 900);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="dark" />
        <View style={st.topBar}>
          <IconButton icon="arrow-back" bg={C.bg} onPress={sent ? () => { setSent(false); setOtp(''); } : onBack} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => onDone('')} hitSlop={10}>
            <Text style={{ color: C.textSoft, fontWeight: '700' }}>Skip</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={st.qBody} keyboardShouldPersistTaps="handled">
          {!sent ? (
            <>
              <Text style={T.h1}>Sign up or log in</Text>
              <Text style={[T.body, { marginTop: 8 }]}>Enter your mobile number. We'll send you a one-time password.</Text>
              <View style={st.phoneRow}>
                <View style={st.cc}>
                  <Text style={{ fontSize: 16 }}>🇮🇳</Text>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>+91</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  placeholderTextColor={C.muted}
                  keyboardType="phone-pad"
                  style={[st.input, { flex: 1, marginTop: 0 }]}
                  maxLength={10}
                />
              </View>
              <Button
                title="Get OTP"
                style={{ marginTop: 18 }}
                disabled={phone.length !== 10}
                loading={loading === 'otp'}
                onPress={() =>
                  run('otp', () => {
                    setSent(true);
                    toast('OTP sent (demo: enter any 4 digits)', 'chatbubble-ellipses');
                    setTimeout(() => otpRef.current?.focus(), 300);
                  })
                }
              />
              <View style={st.orRow}>
                <View style={st.orLine} />
                <Text style={T.small}>or</Text>
                <View style={st.orLine} />
              </View>
              <Button title="Continue with Google" variant="outline" icon="logo-google" loading={loading === 'google'} onPress={() => run('google', () => onDone(''))} />
              <Button title="Continue with Email" variant="outline" icon="mail-outline" style={{ marginTop: 10 }} onPress={() => run('google', () => onDone(''))} />
              <Text style={[T.tiny, { textAlign: 'center', marginTop: 22, lineHeight: 16 }]}>By continuing you agree to our Terms of Service and Privacy Policy.</Text>
            </>
          ) : (
            <>
              <Text style={T.h1}>Enter the OTP</Text>
              <Text style={[T.body, { marginTop: 8 }]}>Sent to +91 {phone.slice(0, 5)} {phone.slice(5)}. Demo mode: any 4 digits work.</Text>
              <Pressable onPress={() => otpRef.current?.focus()} style={st.otpRow}>
                {[0, 1, 2, 3].map((n) => (
                  <View key={n} style={[st.otpBox, otp.length === n && { borderColor: C.primary }, !!otp[n] && { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                    <Text style={st.otpText}>{otp[n] ?? ''}</Text>
                  </View>
                ))}
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  style={st.otpHidden}
                />
              </Pressable>
              <Button title="Verify & continue" style={{ marginTop: 24 }} disabled={otp.length !== 4} loading={loading === 'verify'} onPress={() => run('verify', () => onDone(phone))} />
              <Pressable onPress={() => toast('A new OTP has been sent', 'refresh')} style={{ alignSelf: 'center', marginTop: 18 }}>
                <Text style={{ color: C.primary, fontWeight: '700' }}>Resend OTP</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const GEN_STEPS = ['Analysing your profile', 'Calculating your calorie budget', 'Balancing your macros', 'Personalising meals for your diet', 'Finalising your plan'];

function Generating({ name, onDone }: { name: string; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPct((v) => Math.min(100, v + 2)), 55);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (pct >= 100) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [pct, onDone]);
  const done = Math.floor((pct / 100) * GEN_STEPS.length);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Ring size={170} stroke={14} value={pct / 100}>
        <Text style={{ fontSize: 38, fontWeight: '800', color: C.text }}>{pct}%</Text>
      </Ring>
      <Text style={[T.h2, { marginTop: 28, textAlign: 'center' }]}>Creating your plan, {name.split(' ')[0]}</Text>
      <View style={{ marginTop: 24, alignSelf: 'stretch', gap: 14 }}>
        {GEN_STEPS.map((g, n) => (
          <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: n <= done ? 1 : 0.35 }}>
            <Ionicons name={n < done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={n < done ? C.primary : C.muted} />
            <Text style={[T.body, { color: n < done ? C.text : C.textSoft, fontWeight: n < done ? '600' : '400' }]}>{g}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

function PlanReady({ p, onBack, onNext }: { p: Profile; onBack: () => void; onNext: () => void }) {
  const t = targets(p);
  const l = bmiLabel(t.bmi);
  const goalLine =
    p.goal === 'maintain' || p.goal === 'healthy'
      ? `Maintain around ${p.weightKg.toFixed(1)} kg`
      : `${p.goal === 'lose' ? 'Lose' : 'Gain'} ${Math.abs(p.weightKg - p.targetKg).toFixed(1)} kg by ${fmtGoalDate(t.goalDate)}`;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={st.topBar}>
        <IconButton icon="arrow-back" onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        <Text style={{ fontSize: 40 }}>🎉</Text>
        <Text style={[T.h1, { marginTop: 6 }]}>Your plan is ready, {p.name.split(' ')[0]}!</Text>
        <Text style={[T.body, { marginTop: 6 }]}>{goalLine}</Text>

        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.budgetCard}>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>DAILY CALORIE BUDGET</Text>
          <Text style={{ color: C.white, fontSize: 52, fontWeight: '800', letterSpacing: -1 }}>
            {t.budget.toLocaleString('en-IN')}
            <Text style={{ fontSize: 20 }}> kcal</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            Maintenance: {t.tdee.toLocaleString('en-IN')} kcal · BMR {t.bmr.toLocaleString('en-IN')}
          </Text>
        </LinearGradient>

        <View style={[st.planCard]}>
          <Text style={[T.h3, { marginBottom: 14 }]}>Daily macro targets</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <MacroBar label="Carbs" value={t.carbs} target={t.carbs} color={C.carbs} />
            <MacroBar label="Protein" value={t.protein} target={t.protein} color={C.protein} />
            <MacroBar label="Fat" value={t.fat} target={t.fat} color={C.fat} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {[
            ['⚖️', 'BMI', t.bmi.toFixed(1), l.label],
            ['💧', 'Water', `${t.water} glasses`, '2 litres'],
            ['👟', 'Steps', t.stepGoal.toLocaleString('en-IN'), 'per day'],
          ].map(([e, k, v, sub]) => (
            <View key={k} style={st.miniStat}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
              <Text style={[T.tiny, { marginTop: 6 }]}>{k.toUpperCase()}</Text>
              <Text style={[T.h3, { fontSize: 15 }]}>{v}</Text>
              <Text style={T.tiny}>{sub}</Text>
            </View>
          ))}
        </View>

        <LinearGradient colors={programById(p.program).colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.budgetCard, { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
          <Text style={{ fontSize: 40 }}>{programById(p.program).emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 12 }}>YOUR 30-DAY TRAINING PLAN</Text>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 18, marginTop: 2 }}>{programById(p.program).title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 }}>
              {programById(p.program).level} · {p.weeklyGoal} workouts / week · starts today
            </Text>
          </View>
        </LinearGradient>

        <View style={[st.planCard, { flexDirection: 'row', gap: 12 }]}>
          <Text style={{ fontSize: 26 }}>✨</Text>
          <Text style={[T.small, { flex: 1, lineHeight: 19 }]}>
            Built for a <Text style={{ fontWeight: '700', color: C.text }}>{(p.diet || 'balanced').toLowerCase()}</Text> diet
            {p.cuisines.length ? ` with ${p.cuisines.slice(0, 2).join(' & ')} favourites` : ''}
            {p.conditions.length && p.conditions[0] !== 'None' ? `, mindful of ${p.conditions.join(', ')}` : ''}.
          </Text>
        </View>
      </ScrollView>
      <View style={st.footer}>
        <Button title="Start my journey" icon="arrow-forward" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}

function Paywall({ onSkip, onTrial }: { onSkip: () => void; onTrial: (months: number) => void }) {
  const tier = PLAN_TIERS[0];
  const [months, setMonths] = useState(6);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <LinearGradient colors={['#141B34', '#2B1F5C']} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={[st.topBar, { justifyContent: 'flex-end' }]}>
          <IconButton icon="close" bg="rgba(255,255,255,0.12)" color={C.white} onPress={onSkip} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }}>
          <Text style={{ fontSize: 44, textAlign: 'center' }}>👑</Text>
          <Text style={[T.h1, { color: C.white, textAlign: 'center', marginTop: 8 }]}>Reach your goal 3× faster with {tier.name}</Text>
          <Text style={[T.body, { color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 8 }]}>{tier.tagline}</Text>
          <View style={{ marginTop: 24, gap: 12 }}>
            {tier.features.map((f) => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="checkmark-circle" size={22} color={C.gold} />
                <Text style={{ color: C.white, fontSize: 15, fontWeight: '600' }}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 26, gap: 12 }}>
            {tier.durations.map((d) => {
              const on = d.months === months;
              return (
                <Pressable key={d.months} onPress={() => { tap(); setMonths(d.months); }} style={[st.payOpt, on && st.payOptOn]}>
                  <View style={[st.radio, { borderColor: on ? C.gold : 'rgba(255,255,255,0.4)' }]}>{on && <View style={[st.radioDot, { backgroundColor: C.gold }]} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.white, fontWeight: '800', fontSize: 16 }}>{d.months} months</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 }}>{formatINR(Math.round(d.price / d.months))}/month</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {d.badge && (
                      <View style={st.payBadge}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.navy }}>{d.badge.toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ color: C.white, fontWeight: '800', fontSize: 17 }}>{formatINR(d.price)}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecorationLine: 'line-through' }}>{formatINR(d.was)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 22, paddingBottom: 8 }}>
          <Button
            title="Start 7-day free trial"
            loading={loading}
            onPress={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                setConfirm(true);
              }, 1000);
            }}
            style={{ backgroundColor: C.gold, borderColor: C.gold }}
            textStyle={{ color: C.navy }}
          />
          <Pressable onPress={onSkip} style={{ alignSelf: 'center', paddingVertical: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>Maybe later</Text>
          </Pressable>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center' }}>Demo mode: no payment will be taken. Cancel anytime.</Text>
        </View>
        <Dialog visible={confirm} icon="🎉" title="Your free trial has started!" text={`You now have full access to ${tier.name} for 7 days. Enjoy unlimited Snap scans and Ria AI coaching.`} confirm="Let's go" onConfirm={() => { setConfirm(false); onTrial(months); }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------------- Styles ---------------- */

const st = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 8 },
  counter: { fontSize: 13, fontWeight: '700', color: C.muted, minWidth: 36, textAlign: 'right' },
  qBody: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: 'transparent' },
  input: { height: 58, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 18, fontWeight: '600', color: C.text, backgroundColor: C.card, marginTop: 4 },
  infoBox: { backgroundColor: C.bg, borderRadius: R.md, padding: 16 },
  genderCard: { flex: 1, alignItems: 'center', paddingVertical: 22, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  genderOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bigChip: { height: 44, paddingHorizontal: 18 },
  groupLabel: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 12 },
  permCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, marginBottom: 12 },
  connected: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  chartCard: { backgroundColor: C.bg, borderRadius: R.lg, padding: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 10 },
  logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  hero: { width: 260, height: 260, borderRadius: 130, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  floatChip: { position: 'absolute', backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, ...shadow },
  floatText: { fontWeight: '700', color: C.text, fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
  dotOn: { width: 24, backgroundColor: C.primary },
  phoneRow: { flexDirection: 'row', gap: 10, marginTop: 26 },
  cc: { height: 58, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  otpRow: { flexDirection: 'row', gap: 12, marginTop: 28, justifyContent: 'center' },
  otpBox: { width: 62, height: 66, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  otpText: { fontSize: 28, fontWeight: '800', color: C.text },
  otpHidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0.01, color: 'transparent' },
  budgetCard: { borderRadius: R.lg, padding: 20, marginTop: 20 },
  planCard: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginTop: 12, ...shadow },
  miniStat: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 12, ...shadow },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)' },
  payOptOn: { borderColor: C.gold, backgroundColor: 'rgba(245,196,81,0.12)' },
  heroTitle: { color: C.white, fontSize: 60, fontWeight: '900', letterSpacing: 6 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', letterSpacing: 3, marginTop: 4 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: R.pill, paddingLeft: 4, paddingRight: 12, paddingVertical: 4 },
  heroBadgeIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  startBtn: { height: 56, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  startText: { color: C.white, fontWeight: '900', fontSize: 17, letterSpacing: 2 },
  phone: { width: 220, height: 250, borderRadius: 34, borderWidth: 6, borderColor: C.navy, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, backgroundColor: '#EEF1F6', paddingHorizontal: 12, paddingTop: 14 },
  phoneNotch: { width: 70, height: 18, borderRadius: 9, backgroundColor: C.navy, alignSelf: 'center' },
  phoneTime: { fontSize: 46, fontWeight: '300', color: C.text, textAlign: 'center', marginTop: 8 },
  notifCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 10, marginTop: 14, ...shadow },
  payBadge: { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
});
