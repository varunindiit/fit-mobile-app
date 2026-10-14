import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  type TextInputProps,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOut,
  ZoomIn,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';

import { IndiaFlag } from '@/components/IndiaFlag';
import { WheelPicker, range } from '@/components/WheelPicker';
import { PlanAccordion } from '@/components/program/PlanAccordion';
import {
  Button,
  Card,
  Chip,
  CountUp,
  Dialog,
  EASE_OUT,
  Enter,
  fadeEnter,
  IconButton,
  IconTile,
  MacroBar,
  nativeOnly,
  OptionCard,
  Pill,
  PressableScale,
  ProgressBar,
  Ring,
  Segmented,
  T,
  tap,
  useToast,
  type IconName,
} from '@/components/ui';
import { bmi, bmiLabel, cmToFtIn, targets } from '@/lib/calc';
import { DEFAULT_PROFILE, useStore, type Profile } from '@/lib/store';
import { PLAN_TIERS, formatINR } from '@/data/plans';
import { programById } from '@/data/program';
import { BRAND, C, G, MOTION, R, glow, shadow, shadowSm } from '@/theme';

/* ---------------- Options ---------------- */

const GOALS = [
  { v: 'lose', t: 'Lose weight', s: 'Burn fat and get leaner', i: 'flame-outline' },
  { v: 'maintain', t: 'Maintain weight', s: 'Stay fit at your current weight', i: 'scale-outline' },
  { v: 'gain', t: 'Gain weight', s: 'Healthy weight gain with the right food', i: 'restaurant-outline' },
  { v: 'muscle', t: 'Build muscle', s: 'Get stronger with high-protein eating', i: 'barbell-outline' },
  { v: 'healthy', t: 'Manage a health condition', s: 'Diabetes, PCOS, thyroid, BP & more', i: 'heart-outline' },
] as const;
const MOTIVATIONS: [IconName, string][] = [
  ['happy-outline', 'Feel more confident'],
  ['flash-outline', 'Have more energy'],
  ['document-text-outline', 'Improve my health reports'],
  ['shirt-outline', 'Fit into my old clothes'],
  ['calendar-outline', 'Upcoming wedding or event'],
  ['medkit-outline', "Doctor's advice"],
];
const GENDERS = [
  { v: 'male', t: 'Male', i: 'male' },
  { v: 'female', t: 'Female', i: 'female' },
  { v: 'other', t: 'Other', i: 'male-female' },
] as const;
const ACTIVITY = [
  { v: 'sedentary', t: 'Sedentary', s: 'Mostly sitting: desk job, little movement', i: 'desktop-outline' },
  { v: 'light', t: 'Lightly active', s: 'On your feet sometimes: light walks, chores', i: 'walk-outline' },
  { v: 'moderate', t: 'Moderately active', s: 'Exercise 3–5 days a week or an active job', i: 'bicycle-outline' },
  { v: 'very', t: 'Very active', s: 'Intense exercise daily or physical work', i: 'barbell-outline' },
] as const;
const EXERCISE: [IconName, string][] = [
  ['bed-outline', "I don't exercise right now"],
  ['walk-outline', '1–2 days a week'],
  ['fitness-outline', '3–4 days a week'],
  ['flame-outline', '5+ days a week'],
];
const DIETS: [IconName, string, string][] = [
  ['leaf-outline', 'Vegetarian', 'Plant foods plus dairy'],
  ['fish-outline', 'Non-vegetarian', 'Includes chicken, fish, meat and eggs'],
  ['egg-outline', 'Eggetarian', 'Vegetarian plus eggs'],
  ['nutrition-outline', 'Vegan', 'No animal products at all'],
  ['flower-outline', 'Jain', 'No root vegetables, onion or garlic'],
];
const CUISINES = ['North Indian', 'South Indian', 'Gujarati', 'Maharashtrian', 'Bengali', 'Punjabi', 'Rajasthani', 'Continental', 'Chinese', 'Mediterranean'];
const RESTRICTIONS = ['No restrictions', 'Lactose intolerant', 'Gluten-free', 'Nut allergy', 'No onion & garlic', 'Low sugar', 'Seafood allergy'];
const CONDITIONS = ['None', 'Diabetes / Pre-diabetes', 'PCOS / PCOD', 'Thyroid', 'Hypertension (BP)', 'High cholesterol', 'Fatty liver'];
const SLEEP = ['Under 5 hrs', '5–6 hrs', '7–8 hrs', 'Over 8 hrs'];
const WATER = ['Under 4 glasses', '4–6 glasses', '7–9 glasses', '10+ glasses'];
const CHALLENGES: [IconName, string][] = [
  ['time-outline', 'Lack of time'],
  ['ice-cream-outline', 'Cravings & late-night snacking'],
  ['sad-outline', 'Stress eating'],
  ['alarm-outline', 'Irregular meal times'],
  ['restaurant-outline', 'Eating out often'],
  ['trending-down-outline', 'Staying motivated'],
];
const MEAL_SLOTS = {
  breakfast: ['6:30 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:30 AM', '10:30 AM'],
  lunch: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '3:00 PM'],
  dinner: ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:30 PM', '10:30 PM'],
};
const MEAL_META: Record<keyof typeof MEAL_SLOTS, { label: string; icon: IconName }> = {
  breakfast: { label: 'Breakfast', icon: 'cafe-outline' },
  lunch: { label: 'Lunch', icon: 'sunny-outline' },
  dinner: { label: 'Dinner', icon: 'moon-outline' },
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
/** First word of the name, ignoring stray leading/trailing spaces. */
const firstName = (name: string) => name.trim().split(/\s+/)[0];

const toggleIn = (list: string[], v: string, exclusive?: string) => {
  if (v === exclusive) return list.includes(v) ? [] : [v];
  const base = list.filter((x) => x !== exclusive);
  return base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
};

/** Step content entrance: a short slide in the direction of travel. Starts slightly visible so there is no blank frame. */
const stepIn = (dir: number) =>
  nativeOnly(
    FadeInRight.duration(MOTION.base + 80)
      .easing(EASE_OUT)
      .withInitialValues({ opacity: 0.15, transform: [{ translateX: dir * 28 }] }),
  );

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
  const [dir, setDir] = useState<1 | -1>(1);

  const tracksWeight = p.goal !== 'maintain' && p.goal !== 'healthy';
  const steps = useMemo(() => ALL_STEPS.filter((s) => tracksWeight || !['target', 'pace', 'projection'].includes(s)), [tracksWeight]);
  const questions = steps.filter((s) => !NO_CHROME.includes(s));
  const qIndex = questions.indexOf(step);
  const t = useMemo(() => targets(p), [p]);

  const go = (to: StepId, d: 1 | -1) => {
    setDir(d);
    setStep(to);
  };
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
    completeOnboarding({ ...p, name: p.name.trim() });
    if (premiumMonths) subscribe('smart', premiumMonths);
    router.replace('/(tabs)');
    setTimeout(() => toast(`Welcome to ${BRAND}, ${firstName(p.name) || 'friend'}! 🎉`, 'sparkles'), 400);
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

  if (step === 'welcome') return <Welcome onStart={next} onLogin={next} />;
  if (step === 'signin') return <SignIn onBack={back} onDone={(phone) => { set({ phone }); next(); }} />;
  if (step === 'notify') return <NotifyStep onBack={back} onDone={(allow) => { set({ notifications: allow }); next(); }} />;
  if (step === 'generating') return <Generating name={p.name} onDone={next} />;
  if (step === 'plan') return <PlanReady p={p} onBack={back} onNext={next} />;
  if (step === 'paywall') return <Paywall onSkip={() => finish()} onTrial={(m) => finish(m)} />;

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.topBar}>
          <IconButton icon="chevron-back" bordered onPress={back} />
          <ProgressBar value={(qIndex + 1) / questions.length} style={{ flex: 1 }} height={6} track={C.border} />
          <Text style={st.counter}>
            {qIndex + 1}
            <Text style={st.counterOf}>/{questions.length}</Text>
          </Text>
        </View>
        <Animated.View key={step} entering={stepIn(dir)} style={{ flex: 1 }}>
          {renderStep()}
        </Animated.View>
        <CtaBar>
          <Button title="Continue" disabled={!canNext} onPress={next} />
        </CtaBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderStep() {
    switch (step) {
      case 'name':
        return (
          <Q title="What should we call you?" sub="We'll use this to personalise your plan.">
            <Field
              value={p.name}
              onChangeText={(name) => set({ name })}
              placeholder="Your first name"
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => canNext && next()}
              maxLength={30}
              left={<Ionicons name="person-outline" size={20} color={C.muted} />}
            />
            {p.name.trim().length >= 2 && (
              <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.base).easing(EASE_OUT))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} style={st.greet}>
                <IconTile icon="happy-outline" size={34} />
                <Text style={st.greetText}>Nice to meet you, {firstName(p.name)}!</Text>
              </Animated.View>
            )}
          </Q>
        );
      case 'goal':
        return (
          <Q title={`What's your main goal, ${firstName(p.name)}?`} sub="Your calorie budget and plan are built around this.">
            {GOALS.map((g, i) => (
              <Enter key={g.v} index={i}>
                <OptionCard icon={g.i} title={g.t} subtitle={g.s} selected={p.goal === g.v} onPress={() => set({ goal: g.v, targetKg: g.v === 'lose' ? Math.min(p.targetKg, p.weightKg - 1) : g.v === 'gain' || g.v === 'muscle' ? Math.max(p.targetKg, p.weightKg + 1) : p.weightKg })} />
              </Enter>
            ))}
          </Q>
        );
      case 'motivation':
        return (
          <Q title="What's motivating you?" sub="Pick all that apply. Knowing your 'why' helps us keep you going.">
            {MOTIVATIONS.map(([icon, label], i) => (
              <Enter key={label} index={i}>
                <OptionCard multi icon={icon} title={label} selected={p.motivations.includes(label)} onPress={() => set({ motivations: toggleIn(p.motivations, label) })} />
              </Enter>
            ))}
          </Q>
        );
      case 'gender':
        return (
          <Q title="What's your gender?" sub="This helps us calculate your metabolism accurately.">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {GENDERS.map((g, i) => {
                const on = p.gender === g.v;
                return (
                  <Enter key={g.v} index={i} style={{ flex: 1 }}>
                    <PressableScale
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => { tap(); set({ gender: g.v }); }}
                      style={[st.genderCard, on && st.genderOn]}>
                      <View style={[st.genderArt, on && { backgroundColor: C.card }]}>
                        <Ionicons name={g.i} size={30} color={C.primaryDark} />
                      </View>
                      <Text style={[T.h3, { marginTop: 12 }]}>{g.t}</Text>
                      <View style={[st.radio, on && st.radioOn]}>{on && <View style={st.radioDot} />}</View>
                    </PressableScale>
                  </Enter>
                );
              })}
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
            <Enter index={2} style={[st.infoCard, { marginTop: 22 }]}>
              <View style={st.bmiHead}>
                <View>
                  <Text style={T.label}>Your BMI</Text>
                  <Text style={[st.bmiNum, { color: l.color }]}>{b.toFixed(1)}</Text>
                </View>
                <View style={[st.bmiTag, { borderColor: l.color }]}>
                  <View style={[st.bmiTagDot, { backgroundColor: l.color }]} />
                  <Text style={[st.bmiTagText, { color: l.color }]}>{l.label}</Text>
                </View>
              </View>
              <BmiScale value={b} />
            </Enter>
          </Q>
        );
      }
      case 'target': {
        const diff = Math.abs(p.targetKg - p.weightKg);
        const losing = p.goal === 'lose';
        return (
          <Q title="What's your target weight?" sub={losing ? 'Pick a realistic goal — you can always change it later.' : 'Choose where you would like to be.'} scroll={false}>
            <WheelPicker key="target" values={range(30, 180, 0.5)} value={p.targetKg} onChange={(targetKg) => set({ targetKg })} unit="kg" format={(v) => v.toFixed(1)} />
            <Animated.View key={canNext ? 'ok' : 'bad'} entering={fadeEnter()} style={[st.status, canNext ? st.statusOk : st.statusBad]}>
              <Ionicons name={canNext ? 'flag' : 'alert-circle'} size={20} color={canNext ? C.primaryDark : C.danger} />
              {canNext ? (
                <Text style={[st.statusText, { color: C.primaryDark }]}>
                  {losing ? 'You will lose' : 'You will gain'} {diff.toFixed(1)} kg ({((diff / p.weightKg) * 100).toFixed(0)}% of your body weight)
                </Text>
              ) : (
                <Text style={[st.statusText, { color: C.danger }]}>
                  {losing ? 'Your target should be lower than your current weight' : 'Your target should be higher than your current weight'} ({p.weightKg.toFixed(1)} kg)
                </Text>
              )}
            </Animated.View>
          </Q>
        );
      }
      case 'pace':
        return (
          <Q title={`How fast do you want to ${p.goal === 'lose' ? 'lose' : 'gain'} weight?`} sub="Per week. Slower is easier to sustain.">
            {PACES.map((o, i) => {
              const weeks = Math.ceil(Math.abs(p.weightKg - p.targetKg) / o.v);
              const d = new Date();
              d.setDate(d.getDate() + weeks * 7);
              return (
                <Enter key={o.v} index={i}>
                  <OptionCard title={`${o.v} kg / week · ${o.t}`} subtitle={`${o.s}. Reach ${p.targetKg} kg by ${fmtGoalDate(d)}`} badge={o.badge} selected={p.pace === o.v} onPress={() => set({ pace: o.v })} />
                </Enter>
              );
            })}
          </Q>
        );
      case 'projection':
        return (
          <Q title={`${firstName(p.name)}, you can reach ${p.targetKg} kg by ${fmtGoalDate(t.goalDate)}`} sub="Based on your profile and chosen pace.">
            <Enter index={0}>
              <ProjectionChart from={p.weightKg} to={p.targetKg} weeks={t.weeks} />
            </Enter>
            <Enter index={1} style={[st.infoCard, st.infoRow, { marginTop: 12 }]}>
              <IconTile icon="trending-up" size={42} />
              <Text style={[T.small, { flex: 1, lineHeight: 19 }]}>
                Members who log their meals at least 5 days a week are <Text style={{ fontWeight: '800', color: C.primaryDark }}>far more likely</Text> to reach their goal. We&apos;ll help you build that habit.
              </Text>
            </Enter>
          </Q>
        );
      case 'activity':
        return (
          <Q title="How active are you in a typical day?" sub="Not counting workouts.">
            {ACTIVITY.map((a, i) => (
              <Enter key={a.v} index={i}>
                <OptionCard icon={a.i} title={a.t} subtitle={a.s} selected={p.activity === a.v} onPress={() => set({ activity: a.v })} />
              </Enter>
            ))}
          </Q>
        );
      case 'exercise':
        return (
          <Q title="How often do you work out?" sub="Walking, yoga, gym, sports — everything counts.">
            {EXERCISE.map(([icon, label], i) => (
              <Enter key={label} index={i}>
                <OptionCard
                  icon={icon}
                  title={label}
                  selected={p.exercise === label}
                  onPress={() => {
                    const lvl = EXERCISE.findIndex((x) => x[1] === label);
                    set({ exercise: label, program: lvl >= 3 ? 'sixpack' : lvl === 2 ? 'abs' : 'belly', weeklyGoal: [3, 3, 4, 5][lvl] ?? 3 });
                  }}
                />
              </Enter>
            ))}
          </Q>
        );
      case 'program':
        return (
          <Q title="Pick your 30-day training plan" sub="Short daily home workouts. We've suggested one based on your fitness level — you can switch anytime.">
            <Enter index={0}>
              <PlanAccordion value={p.program} onChange={(program) => set({ program })} onStart={() => next()} cta="Choose this plan" />
            </Enter>
          </Q>
        );
      case 'diet':
        return (
          <Q title="What's your diet preference?" sub="We'll only suggest foods that fit how you eat.">
            {DIETS.map(([icon, label, sub], i) => (
              <Enter key={label} index={i}>
                <OptionCard icon={icon} title={label} subtitle={sub} selected={p.diet === label} onPress={() => set({ diet: label })} />
              </Enter>
            ))}
          </Q>
        );
      case 'cuisines':
        return (
          <Q title="Which cuisines do you enjoy?" sub="Pick all that you eat regularly.">
            <View style={st.chipWrap}>
              {CUISINES.map((c, i) => (
                <Enter key={c} index={i}>
                  <Chip label={c} selected={p.cuisines.includes(c)} onPress={() => set({ cuisines: toggleIn(p.cuisines, c) })} style={st.bigChip} />
                </Enter>
              ))}
            </View>
          </Q>
        );
      case 'restrictions':
        return (
          <Q title="Any food allergies or restrictions?" sub="Select all that apply.">
            {RESTRICTIONS.map((r, i) => (
              <Enter key={r} index={i}>
                <OptionCard multi title={r} selected={p.restrictions.includes(r)} onPress={() => set({ restrictions: toggleIn(p.restrictions, r, 'No restrictions') })} />
              </Enter>
            ))}
          </Q>
        );
      case 'conditions':
        return (
          <Q title="Do you have any medical conditions?" sub="This helps our experts tailor your nutrition safely.">
            {CONDITIONS.map((r, i) => (
              <Enter key={r} index={i}>
                <OptionCard multi title={r} selected={p.conditions.includes(r)} onPress={() => set({ conditions: toggleIn(p.conditions, r, 'None') })} />
              </Enter>
            ))}
            <View style={st.privacy}>
              <Ionicons name="lock-closed" size={13} color={C.muted} />
              <Text style={[T.tiny, { flex: 1, lineHeight: 15 }]}>Your health information is private and stays on this device in this demo.</Text>
            </View>
          </Q>
        );
      case 'lifestyle':
        return (
          <Q title="Tell us about your lifestyle" sub="Sleep and hydration affect hunger and energy.">
            <Enter index={0}>
              <GroupLabel icon="moon" color={C.steps} bg={C.stepsSoft} text="How many hours do you sleep?" />
              <View style={st.chipWrap}>
                {SLEEP.map((x) => (
                  <Chip key={x} label={x} selected={p.sleep === x} onPress={() => set({ sleep: x })} style={st.bigChip} />
                ))}
              </View>
            </Enter>
            <Enter index={1} style={{ marginTop: 28 }}>
              <GroupLabel icon="water" color={C.water} bg={C.waterSoft} text="How much water do you drink daily?" />
              <View style={st.chipWrap}>
                {WATER.map((x) => (
                  <Chip key={x} label={x} selected={p.waterHabit === x} onPress={() => set({ waterHabit: x })} style={st.bigChip} />
                ))}
              </View>
            </Enter>
          </Q>
        );
      case 'challenges':
        return (
          <Q title="What gets in the way of eating healthy?" sub="Pick your biggest challenges — we'll plan around them.">
            {CHALLENGES.map(([icon, label], i) => (
              <Enter key={label} index={i}>
                <OptionCard multi icon={icon} title={label} selected={p.challenges.includes(label)} onPress={() => set({ challenges: toggleIn(p.challenges, label) })} />
              </Enter>
            ))}
          </Q>
        );
      case 'meals':
        return (
          <Q title="When do you usually eat?" sub="We'll remind you to log at the right time.">
            {(['breakfast', 'lunch', 'dinner'] as const).map((m, i) => (
              <Enter key={m} index={i} style={{ marginBottom: 24 }}>
                <GroupLabel icon={MEAL_META[m].icon} color={C.accent} bg={C.accentSoft} text={MEAL_META[m].label} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER }} contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}>
                  {MEAL_SLOTS[m].map((slot) => (
                    <Chip key={slot} label={slot} selected={p.mealTimes[m] === slot} onPress={() => set({ mealTimes: { ...p.mealTimes, [m]: slot } })} style={st.slotChip} />
                  ))}
                </ScrollView>
              </Enter>
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

/* ---------------- Local building blocks ---------------- */

const GUTTER = 16;

function Q({ title, sub, children, scroll = true }: { title: string; sub?: string; children: React.ReactNode; scroll?: boolean }) {
  const inner = (
    <>
      <Text style={st.qTitle}>{title}</Text>
      {sub && <Text style={st.qSub}>{sub}</Text>}
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

/** Pinned bottom action bar: white, hairline top border, safe-area aware. */
function CtaBar({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.ctaBar, dark && st.ctaBarDark, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{children}</View>;
}

/** Text input with a focus ring and optional leading/trailing adornments. */
function Field({ left, right, onFocus, onBlur, ...props }: TextInputProps & { left?: React.ReactNode; right?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  // Tapping anywhere on the field (flag, prefix, padding) focuses the input.
  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={[st.field, focused && st.fieldFocus]}>
      {left}
      <TextInput
        ref={inputRef}
        {...props}
        placeholderTextColor={C.muted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={st.fieldInput}
      />
      {right}
    </Pressable>
  );
}

function GroupLabel({ icon, color, bg, text }: { icon: IconName; color: string; bg: string; text: string }) {
  return (
    <View style={st.groupRow}>
      <IconTile icon={icon} color={color} bg={bg} size={30} />
      <Text style={st.groupLabel}>{text}</Text>
    </View>
  );
}

/** Low-opacity decorative circles for gradient hero surfaces. */
function HeroOrbs({ tint = C.white }: { tint?: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      <Svg width="100%" height="100%">
        <Circle cx="92%" cy="4%" r={92} fill={tint} opacity={0.07} />
        <Circle cx="92%" cy="4%" r={148} stroke={tint} strokeWidth={1} fill="none" opacity={0.1} />
        <Circle cx="2%" cy="100%" r={64} fill={tint} opacity={0.06} />
      </Svg>
    </View>
  );
}

/* ---------------- Sub-steps ---------------- */

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
      <View style={st.heightPill}>
        <Ionicons name="resize-outline" size={14} color={C.textSoft} />
        <Text style={st.heightPillText}>
          {p.heightCm} cm · {cmToFtIn(p.heightCm)}
        </Text>
      </View>
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
  const card = (on: boolean, icon: IconName, title: string, sub: string, onPress: () => void) => (
    <View style={[st.permCard, on && st.permOn]}>
      <IconTile icon={icon} color={C.steps} bg={on ? C.card : C.stepsSoft} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>{title}</Text>
        <Text style={[T.small, { marginTop: 3 }]}>{sub}</Text>
      </View>
      {on ? (
        <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.connected}>
          <Ionicons name="checkmark" size={16} color={C.white} />
        </Animated.View>
      ) : (
        <Button title="Allow" small onPress={onPress} />
      )}
    </View>
  );
  return (
    <Q title="Connect your health app" sub="Optional, but it makes activity tracking effortless.">
      <Enter index={0}>{card(p.healthSync, 'footsteps', `Sync with ${healthName}`, 'Automatically track steps and workouts.', () => setAsk('health'))}</Enter>
      <Enter index={1} style={[st.infoCard, st.infoRow]}>
        <IconTile icon="lock-closed" color={C.textSoft} bg={C.surfaceAlt} size={42} />
        <Text style={[T.small, { flex: 1, lineHeight: 18 }]}>We only read steps, workouts and weight. Your data never leaves this device in the demo.</Text>
      </Enter>
      <Text style={[T.tiny, { textAlign: 'center', marginTop: 14 }]}>You can change these anytime in Profile → Settings.</Text>
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
  const x = useSharedValue(pct);
  useEffect(() => {
    x.set(withTiming(pct, { duration: MOTION.base, easing: EASE_OUT }));
  }, [pct, x]);
  const marker = useAnimatedStyle(() => ({ left: `${x.get() * 100}%` }));
  return (
    <View style={{ marginTop: 14 }}>
      <View style={st.bmiBar}>
        <View style={{ flex: 3.5, backgroundColor: '#3B82F6' }} />
        <View style={{ flex: 4.5, backgroundColor: C.primary }} />
        <View style={{ flex: 4.5, backgroundColor: C.carbs }} />
        <View style={{ flex: 7.5, backgroundColor: C.danger }} />
      </View>
      <Animated.View style={[st.bmiMarker, marker]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        {['Under', 'Healthy', 'Over', 'Obese'].map((x) => (
          <Text key={x} style={T.tiny}>
            {x}
          </Text>
        ))}
      </View>
    </View>
  );
}

const APath = Animated.createAnimatedComponent(Path);

function ProjectionChart({ from, to, weeks }: { from: number; to: number; weeks: number }) {
  const [w, setW] = useState(300);
  const h = 180;
  const pad = 22;
  const y = (kg: number) => {
    const hi = Math.max(from, to);
    const lo = Math.min(from, to);
    return pad + ((hi - kg) / Math.max(hi - lo, 0.1)) * (h - pad * 2);
  };
  const x0 = pad;
  const x1 = w - pad;
  const path = `M ${x0} ${y(from)} C ${x0 + (x1 - x0) * 0.4} ${y(from)}, ${x0 + (x1 - x0) * 0.55} ${y(to)}, ${x1} ${y(to)}`;
  const area = `${path} L ${x1} ${h} L ${x0} ${h} Z`;
  // Generous over-estimate of the curve length so the dash fully covers it while it draws in.
  const len = Math.hypot(x1 - x0, y(to) - y(from)) * 1.25 + 24;

  const prog = useSharedValue(0);
  useEffect(() => {
    prog.set(withDelay(120, withTiming(1, { duration: 900, easing: EASE_OUT })));
  }, [prog]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - prog.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: prog.get() }));
  const endDot = useAnimatedStyle(() => ({ opacity: interpolate(prog.get(), [0.75, 1], [0, 1], 'clamp') }));

  return (
    <View style={st.chartCard} onLayout={(e) => setW(e.nativeEvent.layout.width - 32)}>
      <View>
        <Svg width={w} height={h}>
          <Defs>
            <SvgGrad id="projFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.primary} stopOpacity={0.22} />
              <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
            </SvgGrad>
          </Defs>
          <Line x1={x0} x2={x1} y1={y(to)} y2={y(to)} stroke={C.border} strokeDasharray="4 4" />
          <APath d={area} fill="url(#projFill)" animatedProps={areaProps} />
          <APath d={path} stroke={C.primary} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={lineProps} />
          <Circle cx={x0} cy={y(from)} r={7} fill={C.white} stroke={C.accent} strokeWidth={4} />
        </Svg>
        <Animated.View style={[st.chartEnd, { left: x1 - 9, top: y(to) - 9 }, endDot]} />
      </View>
      <View style={st.chartFoot}>
        <View>
          <Text style={T.label}>Today</Text>
          <Text style={[st.chartVal, { color: C.accent }]}>{from.toFixed(1)} kg</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={T.label}>In {weeks} weeks</Text>
          <Text style={[st.chartVal, { color: C.primaryDark }]}>{to.toFixed(1)} kg</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Full-screen steps ---------------- */

const WELCOME_IMAGE = require('@/assets/images/welcome-bg.jpg');

const SLIDES: { icon: IconName; color: string; bg: string; title: string; text: string }[] = [
  { icon: 'camera', color: C.accent, bg: C.accentSoft, title: 'Track calories with a snap', text: 'Photo-log your meals and get calories & macros instantly. Built for Indian food — from roti to rajma.' },
  { icon: 'barbell', color: C.workout, bg: C.workoutSoft, title: '30-day home workout plans', text: 'Short daily routines for every level — lose belly fat, build rock-hard abs, no equipment needed.' },
  { icon: 'sparkles', color: C.ai, bg: C.aiSoft, title: 'Experts & AI in your pocket', text: 'Personal plans from certified coaches, plus Ria — your 24×7 AI nutrition coach.' },
];

function Dot({ on, light }: { on: boolean; light?: boolean }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [on, p]);
  const style = useAnimatedStyle(() => ({
    width: interpolate(p.get(), [0, 1], [7, 22]),
    backgroundColor: interpolateColor(p.get(), [0, 1], light ? ['rgba(255,255,255,0.35)', '#FFFFFF'] : ['#D6D3D1', C.primary]),
  }));
  return <Animated.View style={[st.dot, style]} />;
}

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
    <View style={st.welcome}>
      <StatusBar style="light" />
      {/* Full-bleed photo with a brand-tinted scrim that deepens towards the copy */}
      {/* Portrait photo fills the top ~70% and melts into the dark base where the copy and CTAs sit */}
      <View style={st.welcomePhoto}>
        <Image source={WELCOME_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" transition={300} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(21,94,80,0.14)' }]} />
        <LinearGradient colors={['rgba(11,26,23,0.6)', 'rgba(11,26,23,0)', 'rgba(11,26,23,0)', '#0B1A17']} locations={[0, 0.2, 0.5, 0.94]} style={StyleSheet.absoluteFill} />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Enter index={0} style={st.brandRow}>
          <View style={[st.brandMark, glow(C.primary)]}>
            <Ionicons name="leaf" size={20} color={C.white} />
          </View>
          <View>
            <Text style={st.brandName}>{BRAND}</Text>
            <Text style={st.brandTag}>NUTRITION + FITNESS</Text>
          </View>
        </Enter>

        <View style={{ flex: 1 }} />

        <View style={st.welcomeCopy}>
          <Enter index={1}>
            <Text style={st.welcomeHead}>
              <Text style={{ color: '#3BE3A6' }}>Eat right.</Text>
              {'\n'}Train hard.
            </Text>
          </Enter>
          <Enter index={2}>
            <Text style={st.welcomeLead}>A personalised 30-day plan for your food, fitness and goals.</Text>
          </Enter>
        </View>

        <Enter index={3}>
          <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={{ flexGrow: 0 }}>
            {SLIDES.map((s) => (
              <View key={s.title} style={[st.slidePage, { width }]}>
                <View style={st.glassCard}>
                  <View style={[st.glassIcon, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon} size={22} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.glassTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <Text style={st.glassText} numberOfLines={2}>
                      {s.text}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={st.dots}>
            {SLIDES.map((_, n) => (
              <Dot key={n} on={n === i} light />
            ))}
          </View>
        </Enter>

        <Enter index={4} style={st.welcomeCtas}>
          <Button title="Get started" onPress={onStart} style={st.ctaLight} textStyle={{ color: C.primaryDark }} />
          <Button title="I already have an account" variant="outline" onPress={onLogin} style={st.ctaGlass} textStyle={{ color: C.white }} />
        </Enter>
      </SafeAreaView>
    </View>
  );
}

function NotifyStep({ onBack, onDone }: { onBack: () => void; onDone: (allow: boolean) => void }) {
  const [ask, setAsk] = useState(false);
  const toast = useToast();
  const now = new Date();
  return (
    <SafeAreaView style={st.screen} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={st.topBar}>
        <IconButton icon="chevron-back" bordered onPress={onBack} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Enter index={0}>
          <View style={st.phone}>
            <LinearGradient colors={[C.primarySoft, C.card]} style={StyleSheet.absoluteFill} />
            <View style={st.phoneNotch} />
            <Text style={st.phoneTime}>
              {now.getHours()}:{String(now.getMinutes()).padStart(2, '0')}
            </Text>
            <Text style={st.phoneDate}>{fmtGoalDate(now)}</Text>
            <Animated.View entering={nativeOnly(FadeInDown.delay(560).springify().damping(16).stiffness(180))} style={st.notifCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={st.notifLogo}>
                  <Ionicons name="leaf" size={10} color={C.white} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSoft, flex: 1 }}>{BRAND}</Text>
                <Text style={{ fontSize: 10, color: C.muted }}>now</Text>
              </View>
              <Text style={{ fontSize: 12, color: C.text, marginTop: 6, lineHeight: 16 }}>Small steps, big changes! Log your breakfast and start today&apos;s Day 1 workout 💪</Text>
            </Animated.View>
          </View>
          <LinearGradient colors={[G.glow[1], C.bg]} style={st.phoneFade} />
        </Enter>
        <Enter index={1}>
          <Text style={st.notifyTitle}>
            <Text style={{ color: C.primary }}>85%</Text> of users get better results with reminders
          </Text>
          <Text style={[T.body, { textAlign: 'center', marginTop: 10 }]}>With reminders, you&apos;ll easily stick to your meal and workout plan and stay motivated every day.</Text>
        </Enter>
      </View>
      <Enter index={2} style={{ paddingHorizontal: GUTTER, paddingBottom: 8 }}>
        <Button title="Grant now" icon="notifications-outline" onPress={() => setAsk(true)} />
        <Pressable onPress={() => onDone(false)} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
          <Text style={st.textBtnLabel}>Maybe later</Text>
        </Pressable>
      </Enter>
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

/** Blinking text caret for the active OTP box (static when reduced motion is on). */
function Caret() {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(withRepeat(withSequence(withDelay(420, withTiming(0, { duration: 90 })), withDelay(420, withTiming(1, { duration: 90 }))), -1, false));
  }, [o, reduce]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[st.caret, style]} />;
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
    <SafeAreaView style={st.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar style="dark" />
        <View style={st.topBar}>
          <IconButton icon="chevron-back" bordered onPress={sent ? () => { setSent(false); setOtp(''); } : onBack} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => onDone('')} hitSlop={10} style={({ pressed }) => [st.skip, pressed && { opacity: 0.6 }]}>
            <Text style={st.skipText}>Skip</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={st.qBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!sent ? (
            <Animated.View key="phone" entering={fadeEnter()}>
              <Enter index={0}>
                <IconTile icon="phone-portrait-outline" size={52} />
                <Text style={[st.qTitle, { marginTop: 18 }]}>Sign up or log in</Text>
                <Text style={st.qSub}>Enter your mobile number. We&apos;ll send you a one-time password.</Text>
              </Enter>
              <Enter index={1} style={{ marginTop: 26 }}>
                <Field
                  value={phone}
                  onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  keyboardType="phone-pad"
                  maxLength={10}
                  left={
                    <View style={st.cc}>
                      <IndiaFlag width={24} />
                      <Text style={st.ccText}>+91</Text>
                      <View style={st.ccDivider} />
                    </View>
                  }
                  right={
                    phone.length === 10 ? (
                      <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
                        <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                      </Animated.View>
                    ) : null
                  }
                />
                <Button
                  title="Get OTP"
                  style={{ marginTop: 16 }}
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
              </Enter>
              <Enter index={2}>
                <View style={st.orRow}>
                  <View style={st.orLine} />
                  <Text style={st.orText}>or continue with</Text>
                  <View style={st.orLine} />
                </View>
                <Button title="Continue with Google" variant="outline" icon="logo-google" loading={loading === 'google'} onPress={() => run('google', () => onDone(''))} />
                <Button title="Continue with Email" variant="outline" icon="mail-outline" style={{ marginTop: 10 }} onPress={() => run('google', () => onDone(''))} />
                <Text style={[T.tiny, { textAlign: 'center', marginTop: 22, lineHeight: 16 }]}>By continuing you agree to our Terms of Service and Privacy Policy.</Text>
              </Enter>
            </Animated.View>
          ) : (
            <Animated.View key="otp" entering={stepIn(1)}>
              <IconTile icon="chatbubble-ellipses-outline" size={52} />
              <Text style={[st.qTitle, { marginTop: 18 }]}>Enter the OTP</Text>
              <Text style={st.qSub}>
                Sent to{' '}
                <Text style={{ color: C.text, fontWeight: '700' }}>
                  +91 {phone.slice(0, 5)} {phone.slice(5)}
                </Text>
                . Demo mode: any 4 digits work.
              </Text>
              <Pressable onPress={() => otpRef.current?.focus()} style={st.otpRow}>
                {[0, 1, 2, 3].map((n) => {
                  const digit = otp[n];
                  const active = otp.length === n;
                  return (
                    <View key={n} style={[st.otpBox, !!digit && st.otpFilled, active && st.otpActive]}>
                      {digit ? (
                        <Animated.Text key={digit} entering={nativeOnly(ZoomIn.duration(MOTION.fast))} style={st.otpText}>
                          {digit}
                        </Animated.Text>
                      ) : active ? (
                        <Caret />
                      ) : null}
                    </View>
                  );
                })}
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
              <Button title="Verify & continue" style={{ marginTop: 26 }} disabled={otp.length !== 4} loading={loading === 'verify'} onPress={() => run('verify', () => onDone(phone))} />
              <Pressable onPress={() => toast('A new OTP has been sent', 'refresh')} style={({ pressed }) => [st.resend, pressed && { opacity: 0.6 }]}>
                <Ionicons name="refresh" size={15} color={C.primary} />
                <Text style={{ color: C.primary, fontWeight: '700' }}>Resend OTP</Text>
              </Pressable>
            </Animated.View>
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
    <SafeAreaView style={st.screen}>
      <StatusBar style="dark" />
      <LinearGradient colors={G.glow} style={st.welcomeGlow} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Enter index={0}>
          <Ring size={176} stroke={14} value={pct / 100} gradient={G.brand} track={C.border}>
            <Text style={st.genPct}>
              {pct}
              <Text style={st.genPctSign}>%</Text>
            </Text>
          </Ring>
        </Enter>
        <Enter index={1}>
          <Text style={[T.h2, { marginTop: 28, textAlign: 'center' }]}>Creating your plan, {firstName(name)}</Text>
        </Enter>
        <Enter index={2} style={st.genCard}>
          {GEN_STEPS.map((g, n) => {
            const isDone = n < done;
            return (
              <View key={g} style={[st.genRow, { opacity: n <= done ? 1 : 0.4 }]}>
                <View style={st.genIcon}>
                  {isDone ? (
                    <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
                      <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                    </Animated.View>
                  ) : n === done ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color={C.muted} />
                  )}
                </View>
                <Text style={[T.body, { flex: 1, color: isDone ? C.text : C.textSoft, fontWeight: isDone ? '600' : '400' }]}>{g}</Text>
              </View>
            );
          })}
        </Enter>
      </View>
    </SafeAreaView>
  );
}

function PlanReady({ p, onBack, onNext }: { p: Profile; onBack: () => void; onNext: () => void }) {
  const t = targets(p);
  const l = bmiLabel(t.bmi);
  const prog = programById(p.program);
  const goalLine =
    p.goal === 'maintain' || p.goal === 'healthy'
      ? `Maintain around ${p.weightKg.toFixed(1)} kg`
      : `${p.goal === 'lose' ? 'Lose' : 'Gain'} ${Math.abs(p.weightKg - p.targetKg).toFixed(1)} kg by ${fmtGoalDate(t.goalDate)}`;
  const stats: [IconName, string, string, string, string, string][] = [
    ['scale-outline', C.weight, C.weightSoft, 'BMI', t.bmi.toFixed(1), l.label],
    ['water', C.water, C.waterSoft, 'Water', `${t.water} glasses`, '2 litres'],
    ['footsteps', C.steps, C.stepsSoft, 'Steps', t.stepGoal.toLocaleString('en-IN'), 'per day'],
  ];
  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <StatusBar style="dark" />
      <View style={st.topBar}>
        <IconButton icon="chevron-back" bordered onPress={onBack} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Enter index={0}>
          <Pill text="PLAN READY" icon="checkmark-circle" />
          <Text style={[st.qTitle, { marginTop: 10 }]}>Your plan is ready, {firstName(p.name)}!</Text>
          <Text style={[T.body, { marginTop: 6 }]}>{goalLine}</Text>
        </Enter>

        <Enter index={1}>
          <LinearGradient colors={G.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
            <HeroOrbs />
            <Text style={st.heroLabel}>DAILY CALORIE BUDGET</Text>
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <Ring size={170} stroke={12} value={1} track="rgba(255,255,255,0.14)" gradient={['#8FE8C6', '#FFFFFF']}>
                <CountUp value={t.budget} fromZero style={st.heroNum} />
                <Text style={st.heroUnit}>kcal / day</Text>
              </Ring>
            </View>
            <View style={st.heroStats}>
              <View style={st.heroStat}>
                <Text style={st.heroStatLabel}>Maintenance</Text>
                <Text style={st.heroStatValue}>{t.tdee.toLocaleString('en-IN')} kcal</Text>
              </View>
              <View style={st.heroDivider} />
              <View style={st.heroStat}>
                <Text style={st.heroStatLabel}>BMR</Text>
                <Text style={st.heroStatValue}>{t.bmr.toLocaleString('en-IN')} kcal</Text>
              </View>
            </View>
          </LinearGradient>
        </Enter>

        <Enter index={2}>
          <Card style={{ marginTop: 12 }}>
            <Text style={[T.h3, { marginBottom: 14 }]}>Daily macro targets</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <MacroBar label="Carbs" value={t.carbs} target={t.carbs} color={C.carbs} />
              <MacroBar label="Protein" value={t.protein} target={t.protein} color={C.protein} />
              <MacroBar label="Fat" value={t.fat} target={t.fat} color={C.fat} />
            </View>
          </Card>
        </Enter>

        <Enter index={3} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {stats.map(([icon, color, bg, k, v, sub]) => (
            <Card key={k} style={st.miniStat}>
              <IconTile icon={icon} color={color} bg={bg} size={34} />
              <Text style={[T.label, { marginTop: 10, fontSize: 11 }]}>{k}</Text>
              <Text style={st.miniVal} numberOfLines={1}>
                {v}
              </Text>
              <Text style={T.tiny}>{sub}</Text>
            </Card>
          ))}
        </Enter>

        <Enter index={4}>
          <LinearGradient colors={prog.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.progCard}>
            <HeroOrbs />
            <View style={st.progArt}>
              <Text style={{ fontSize: 32 }}>{prog.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.progEyebrow}>YOUR 30-DAY TRAINING PLAN</Text>
              <Text style={st.progTitle}>{prog.title}</Text>
              <Text style={st.progMeta}>
                {prog.level} · {p.weeklyGoal} workouts / week · starts today
              </Text>
            </View>
          </LinearGradient>
        </Enter>

        <Enter index={5}>
          <Card style={st.dietCard}>
            <IconTile icon="restaurant" color={C.accent} bg={C.accentSoft} size={40} />
            <Text style={[T.small, { flex: 1, lineHeight: 19 }]}>
              Built for a <Text style={{ fontWeight: '700', color: C.text }}>{(p.diet || 'balanced').toLowerCase()}</Text> diet
              {p.cuisines.length ? ` with ${p.cuisines.slice(0, 2).join(' & ')} favourites` : ''}
              {p.conditions.length && p.conditions[0] !== 'None' ? `, mindful of ${p.conditions.join(', ')}` : ''}.
            </Text>
          </Card>
        </Enter>
      </ScrollView>
      <CtaBar>
        <Button title="Start my journey" icon="arrow-forward" onPress={onNext} />
      </CtaBar>
    </SafeAreaView>
  );
}

type Duration = (typeof PLAN_TIERS)[number]['durations'][number];

/** Paywall duration row with an eased selected state (border, fill and radio). */
function PayOption({ d, on, onPress }: { d: Duration; on: boolean; onPress: () => void }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [on, p]);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0.14)', C.gold]),
    backgroundColor: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0.05)', 'rgba(245,196,81,0.12)']),
  }));
  const ring = useAnimatedStyle(() => ({ borderColor: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0.4)', C.gold]) }));
  const dot = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: p.get() }] }));
  return (
    <PressableScale scaleTo={0.98} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}>
      <Animated.View style={[st.payOpt, box]}>
        <Animated.View style={[st.payRadio, ring]}>
          <Animated.View style={[st.payDot, dot]} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={st.payMonths}>{d.months} months</Text>
          <Text style={st.payPer}>{formatINR(Math.round(d.price / d.months))}/month</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {d.badge && (
            <View style={st.payBadge}>
              <Text style={st.payBadgeText}>{d.badge.toUpperCase()}</Text>
            </View>
          )}
          <Text style={st.payPrice}>{formatINR(d.price)}</Text>
          <Text style={st.payWas}>{formatINR(d.was)}</Text>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

function Paywall({ onSkip, onTrial }: { onSkip: () => void; onTrial: (months: number) => void }) {
  const tier = PLAN_TIERS[0];
  const [months, setMonths] = useState(6);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <HeroOrbs tint={C.gold} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[st.topBar, { justifyContent: 'flex-end' }]}>
          <IconButton icon="close" bg="rgba(255,255,255,0.12)" color={C.white} onPress={onSkip} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <Enter index={0} style={{ alignItems: 'center' }}>
            <LinearGradient colors={['#FBDD8A', '#E5A631']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.crown, glow(C.gold)]}>
              <Ionicons name="diamond" size={32} color={C.navy} />
            </LinearGradient>
          </Enter>
          <Enter index={1}>
            <Text style={st.payTitle}>Reach your goal 3× faster with {tier.name}</Text>
            <Text style={st.paySub}>{tier.tagline}</Text>
          </Enter>
          <Enter index={2} style={st.featCard}>
            {tier.features.map((f) => (
              <View key={f} style={st.featRow}>
                <Ionicons name="checkmark-circle" size={20} color={C.gold} />
                <Text style={st.featText}>{f}</Text>
              </View>
            ))}
          </Enter>
          <View style={{ marginTop: 18, gap: 10 }}>
            {tier.durations.map((d, n) => (
              <Enter key={d.months} index={3 + n}>
                <PayOption d={d} on={d.months === months} onPress={() => { tap(); setMonths(d.months); }} />
              </Enter>
            ))}
          </View>
        </ScrollView>
        <CtaBar dark>
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
            style={{ backgroundColor: C.gold, borderColor: C.gold, ...glow(C.gold) }}
            textStyle={{ color: C.navy }}
          />
          <Pressable onPress={onSkip} style={({ pressed }) => [st.textBtn, pressed && { opacity: 0.6 }]}>
            <Text style={[st.textBtnLabel, { color: 'rgba(255,255,255,0.8)' }]}>Maybe later</Text>
          </Pressable>
          <Text style={st.payNote}>Demo mode: no payment will be taken. Cancel anytime.</Text>
        </CtaBar>
        <Dialog visible={confirm} icon="🎉" title="Your free trial has started!" text={`You now have full access to ${tier.name} for 7 days. Enjoy unlimited Snap scans and Ria AI coaching.`} confirm="Let's go" onConfirm={() => { setConfirm(false); onTrial(months); }} />
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------------- Styles ---------------- */

const focusRing = Platform.select<object>({ ios: { shadowColor: C.primary, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }, default: {} }) as object;

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: GUTTER, paddingVertical: 8, minHeight: 56 },
  counter: { fontSize: 14, fontWeight: '700', color: C.text, minWidth: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  counterOf: { color: C.muted, fontWeight: '600' },
  qBody: { paddingHorizontal: GUTTER, paddingTop: 14, paddingBottom: 28 },
  qTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.7, lineHeight: 34 },
  qSub: { fontSize: 15, color: C.textSoft, lineHeight: 22, marginTop: 8 },
  ctaBar: { paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  ctaBarDark: { backgroundColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.1)' },

  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 16 },
  fieldFocus: { borderColor: C.primary, ...focusRing },
  fieldInput: { flex: 1, height: '100%', fontSize: 18, fontWeight: '600', color: C.text, letterSpacing: 0.2 },
  greet: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  greetText: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },

  infoCard: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, borderRadius: R.md, padding: 14, borderWidth: 1 },
  statusOk: { backgroundColor: C.primarySoft, borderColor: C.primaryTint },
  statusBad: { backgroundColor: C.dangerSoft, borderColor: '#F8D3D4' },
  statusText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },

  bmiHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  bmiNum: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'], marginTop: 2 },
  bmiTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  bmiTagDot: { width: 7, height: 7, borderRadius: 4 },
  bmiTagText: { fontSize: 12, fontWeight: '700' },
  bmiBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  bmiMarker: { position: 'absolute', top: -5, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: C.white, borderWidth: 4, borderColor: C.text, ...shadowSm },

  genderCard: { alignItems: 'center', paddingVertical: 20, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  genderOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  genderArt: { width: 64, height: 64, borderRadius: 22, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bigChip: { height: 44, paddingHorizontal: 18 },
  slotChip: { height: 40, paddingHorizontal: 16 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  groupLabel: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2, flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
  heightPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 18, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border },
  heightPillText: { fontSize: 13, fontWeight: '600', color: C.textSoft, fontVariant: ['tabular-nums'] },

  permCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 12 },
  permOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  connected: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  chartCard: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  chartEnd: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, borderWidth: 3, borderColor: C.white, ...shadowSm },
  chartFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  chartVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 3, fontVariant: ['tabular-nums'] },

  welcomeGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%' },
  welcome: { flex: 1, backgroundColor: '#0B1A17' },
  welcomePhoto: { position: 'absolute', top: 0, left: 0, right: 0, height: '72%' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: GUTTER, paddingTop: 10 },
  brandMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.4 },
  brandTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.4, marginTop: 1 },
  welcomeCopy: { paddingHorizontal: GUTTER, marginBottom: 18 },
  welcomeHead: { fontSize: 44, lineHeight: 48, fontWeight: '800', color: C.white, letterSpacing: -1.6 },
  welcomeLead: { fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.82)', marginTop: 12, maxWidth: 320 },
  slidePage: { paddingHorizontal: GUTTER, paddingVertical: 4 },
  glassCard: { height: 92, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: R.lg, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.18)' },
  glassIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  glassTitle: { fontSize: 16, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  glassText: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
  ctaLight: { backgroundColor: C.white, borderColor: C.white },
  ctaGlass: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.32)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10, paddingBottom: 18 },
  dot: { height: 7, borderRadius: 4 },
  welcomeCtas: { paddingHorizontal: GUTTER, paddingBottom: 8, gap: 10 },

  textBtn: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  textBtnLabel: { color: C.textSoft, fontWeight: '700', fontSize: 15 },
  skip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border },
  skipText: { color: C.textSoft, fontWeight: '700', fontSize: 14 },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 8, height: '100%' },
  ccText: { fontWeight: '700', fontSize: 17, color: C.text, fontVariant: ['tabular-nums'] },
  ccDivider: { width: 1, height: 24, backgroundColor: C.border, marginLeft: 6 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: C.border },
  orText: { fontSize: 12, fontWeight: '600', color: C.muted },
  otpRow: { flexDirection: 'row', gap: 12, marginTop: 28, justifyContent: 'center' },
  otpBox: { width: 62, height: 68, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  otpFilled: { backgroundColor: C.primarySoft, borderColor: C.primaryTint },
  otpActive: { borderColor: C.primary, borderWidth: 2, ...focusRing },
  otpText: { fontSize: 28, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  otpHidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0.01, color: 'transparent' },
  caret: { width: 2, height: 28, borderRadius: 1, backgroundColor: C.primary },
  resend: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 14, paddingVertical: 8, paddingHorizontal: 12 },

  phone: { width: 228, height: 252, borderRadius: 38, borderWidth: 7, borderColor: C.navy, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingHorizontal: 12, paddingTop: 12, overflow: 'hidden' },
  phoneNotch: { width: 74, height: 20, borderRadius: 10, backgroundColor: C.navy, alignSelf: 'center' },
  phoneTime: { fontSize: 48, fontWeight: '300', color: C.text, textAlign: 'center', marginTop: 8, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  phoneDate: { textAlign: 'center', color: C.textSoft, fontWeight: '600', fontSize: 12 },
  phoneFade: { position: 'absolute', left: -8, right: -8, bottom: 0, height: 56, pointerEvents: 'none' },
  notifCard: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: 11, marginTop: 16, ...shadow },
  notifLogo: { width: 18, height: 18, borderRadius: 6, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  notifyTitle: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5, lineHeight: 30, textAlign: 'center', marginTop: 28 },

  genPct: { fontSize: 40, fontWeight: '800', color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  genPctSign: { fontSize: 20, color: C.muted, fontWeight: '700' },
  genCard: { marginTop: 24, alignSelf: 'stretch', gap: 14, backgroundColor: C.card, borderRadius: R.lg, padding: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  genRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  genIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },

  hero: { borderRadius: R.xl, padding: 20, marginTop: 20, overflow: 'hidden' },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontWeight: '700', fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  heroNum: { color: C.white, fontSize: 40, fontWeight: '800', letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  heroUnit: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', marginTop: -2 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.14)' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  heroStatValue: { color: C.white, fontSize: 15, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.16)' },
  miniStat: { flex: 1, padding: 12 },
  miniVal: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.2, marginTop: 1, fontVariant: ['tabular-nums'] },
  progCard: { borderRadius: R.lg, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  progArt: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  progEyebrow: { color: 'rgba(255,255,255,0.82)', fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  progTitle: { color: C.white, fontWeight: '800', fontSize: 18, letterSpacing: -0.3, marginTop: 2 },
  progMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 2 },
  dietCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },

  crown: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  payTitle: { fontSize: 28, fontWeight: '800', color: C.white, letterSpacing: -0.7, lineHeight: 34, textAlign: 'center', marginTop: 18 },
  paySub: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.72)', textAlign: 'center', marginTop: 8 },
  featCard: { marginTop: 22, gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featText: { color: C.white, fontSize: 15, fontWeight: '600', flex: 1 },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.lg, borderWidth: 1.5 },
  payRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  payDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.gold },
  payMonths: { color: C.white, fontWeight: '800', fontSize: 16 },
  payPer: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'] },
  payBadge: { backgroundColor: C.gold, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  payBadgeText: { fontSize: 10, fontWeight: '800', color: C.navy, letterSpacing: 0.4 },
  payPrice: { color: C.white, fontWeight: '800', fontSize: 17, fontVariant: ['tabular-nums'] },
  payWas: { color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  payNote: { color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center' },
});
