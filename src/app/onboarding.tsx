import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ZoomIn, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyFigure, SHAPES, bodyFat } from '@/components/onboarding/BodyFigure';
import { IMG } from '@/components/onboarding/assets';
import { Analysis, Motivation, Paywall, PlanResult, Welcome } from '@/components/onboarding/FullScreens';
import { GoalCurve } from '@/components/onboarding/GoalCurve';
import { ChoiceRow, GUTTER, OnbHeader, Photo, QTitle, StepSlider, TipCard, UnitToggle, fromUnit, stepIn, toUnit, useOn, type WeightUnit } from '@/components/onboarding/kit';
import { RulerPicker } from '@/components/onboarding/RulerPicker';
import { YearWheel } from '@/components/onboarding/YearWheel';
import { Button, EASE_OUT, nativeOnly, PressableScale, tap, useToast } from '@/components/ui';
import { bmi, bmiLabel, cmToFtIn, targets } from '@/lib/calc';
import { DEFAULT_PROFILE, useStore, type Goal, type Profile } from '@/lib/store';
import { BRAND, C, MOTION, R, shadowSm } from '@/theme';

/* ---------------- Flow ---------------- */

type StepId =
  | 'welcome' | 'gender' | 'shape' | 'desired' | 'birth' | 'height' | 'weight' | 'target' | 'preview' | 'timeline' | 'benefits'
  | 'experience' | 'level' | 'activity' | 'rest' | 'diet' | 'dietinfo' | 'reward' | 'proof' | 'motivation' | 'analysis' | 'result' | 'paywall';

const STEPS: StepId[] = [
  'welcome', 'gender', 'shape', 'desired', 'birth', 'height', 'weight', 'target', 'preview', 'timeline', 'benefits',
  'experience', 'level', 'activity', 'rest', 'diet', 'dietinfo', 'reward', 'proof', 'motivation', 'analysis', 'result', 'paywall',
];

/** Question steps share the persistent header; the rest are full-screen. Value = section label. */
const SECTION: Partial<Record<StepId, string>> = {
  gender: 'Goal & Focus',
  shape: 'Goal & Focus',
  desired: 'Goal & Focus',
  birth: 'Know Your Body',
  height: 'Know Your Body',
  weight: 'Know Your Body',
  target: 'Know Your Body',
  preview: 'Fitness Assessment',
  timeline: 'Know Your Goal',
  benefits: 'Program Benefits',
  experience: 'Fitness Assessment',
  level: 'Fitness Assessment',
  activity: 'Fitness Assessment',
  rest: 'Fitness Assessment',
  diet: 'Fitness Assessment',
  dietinfo: 'Nutrition Plan',
  reward: 'Nutrition Plan',
  proof: 'Social Proof',
};
const QUESTIONS = STEPS.filter((s) => SECTION[s]);

/* ---------------- Options ---------------- */

const EXPERIENCE = ['I tried but lost motivation', 'I succeeded but regained weight', 'Achieved but plateaued', 'Still trying', 'This is my first time'];
const LEVELS: { t: string; emoji: string; program: Profile['program']; detail: string }[] = [
  { t: 'Easy to start', emoji: '🙂', program: 'belly', detail: 'Gentle, beginner-friendly sessions to build the habit without burning out.' },
  { t: 'Break a light sweat', emoji: '💦', program: 'abs', detail: "We'll tailor effective workouts with the right intensity just for you!" },
  { t: 'A bit challenging', emoji: '🔥', program: 'sixpack', detail: 'Higher-volume training that pushes you a little further every week.' },
];
const ACTIVITY: { t: string; s: string; v: Profile['activity'] }[] = [
  { t: 'I do some light physical activity', s: '(such as casual walks)', v: 'light' },
  { t: 'I spend much of the day sitting', s: '(such as desk work)', v: 'sedentary' },
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIETS: { t: string; emoji: string; diet: string }[] = [
  { t: 'Meat-based', emoji: '🍖', diet: 'Non-vegetarian' },
  { t: 'Regular diet', emoji: '🍱', diet: 'Non-vegetarian' },
  { t: 'Vegetarian', emoji: '🥦', diet: 'Vegetarian' },
  { t: 'Vegan', emoji: '🌱', diet: 'Vegan' },
  { t: 'Other', emoji: '🥚', diet: '' },
];
const REWARDS: { t: string; img: number }[] = [
  { t: 'Treat myself to a nice meal', img: IMG.rewardMeal },
  { t: 'Buy new gym clothes', img: IMG.rewardClothes },
  { t: 'Take a trip somewhere', img: IMG.rewardTrip },
  { t: 'Get a makeover', img: IMG.rewardMakeover },
];
/** Goal pace, kg per week, Easy → Master. */
const PACES: { v: number; emoji: string; note: string }[] = [
  { v: 0.25, emoji: '🐢', note: 'Slow and steady. Very easy to stick with.' },
  { v: 0.4, emoji: '👏', note: 'Good choice! This level is easy for most people. Friendly for beginners.' },
  { v: 0.5, emoji: '💪', note: 'Recommended. The best balance of speed and comfort.' },
  { v: 0.75, emoji: '⚡', note: 'Faster results. Needs consistent effort every week.' },
  { v: 1, emoji: '🔥', note: 'Aggressive pace. Best for experienced, disciplined people.' },
];
const BENEFITS_LEFT: [React.ComponentProps<typeof Ionicons>['name'], string][] = [
  ['body-outline', 'Personalized workout plan'],
  ['restaurant-outline', 'Custom meal plan'],
  ['ribbon-outline', 'Expert guidance'],
];
const BENEFITS_RIGHT = ['Start up faster', 'Get a toned body', 'Build healthy habits', 'Long-term results'];

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const yearNow = new Date().getFullYear();
const YEARS = Array.from({ length: 78 }, (_, i) => yearNow - 90 + i); // ages 13–90

const goalFor = (p: Profile): Goal => (p.targetKg < p.weightKg - 0.05 ? 'lose' : p.targetKg > p.weightKg + 0.05 ? 'gain' : 'maintain');

/** Final profile: derived fields the rest of the app reads (goal, age, weekly goal, motivations). */
function finalize(p: Profile): Profile {
  return {
    ...p,
    goal: goalFor(p),
    age: Math.max(13, yearNow - p.birthYear),
    weeklyGoal: Math.max(2, Math.min(6, 7 - p.restDays.length)),
    motivations: p.rewards,
  };
}

/* ---------------- Screen ---------------- */

// Survives remounts (e.g. a reload mid-onboarding) so answers and position are never lost.
let resume: { p: Profile; step: StepId } | null = null;

export default function Onboarding() {
  const { state, completeOnboarding, subscribe, updateSettings } = useStore();
  const toast = useToast();
  const [p, setP] = useState<Profile>(() => resume?.p ?? { ...DEFAULT_PROFILE, ...state.profile });
  const set = (patch: Partial<Profile>) => setP((d) => ({ ...d, ...patch }));
  const [step, setStep] = useState<StepId>(() => (resume?.step === 'analysis' ? 'result' : resume?.step) ?? 'welcome');
  const [dir, setDir] = useState<1 | -1>(1);
  const units: WeightUnit = state.settings.units;
  const setUnits = (u: WeightUnit) => updateSettings({ units: u });
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

  useEffect(() => {
    resume = { p, step };
  }, [p, step]);

  const go = (to: StepId, d: 1 | -1) => {
    setDir(d);
    setStep(to);
  };
  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) go(STEPS[i + 1], 1);
  };
  const back = () => {
    // The analysis screen is a one-way transition; going back from the result skips it.
    if (step === 'result') return go('motivation', -1);
    const i = STEPS.indexOf(step);
    if (i > 0) go(STEPS[i - 1], -1);
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'welcome') return false;
      back();
      return true;
    });
    return () => sub.remove();
  });

  const finish = (premium: boolean) => {
    resume = null;
    completeOnboarding(finalize(p));
    if (premium) subscribe('smart', 1);
    router.replace('/(tabs)');
    setTimeout(() => toast(`Welcome to ${BRAND}! Your plan is ready 🎉`, 'sparkles'), 400);
  };

  const canNext = (() => {
    switch (step) {
      case 'experience': return !!p.experience;
      case 'level': return !!p.workoutLevel;
      case 'rest': return p.restDays.length > 0;
      case 'diet': return !!p.dietType;
      case 'reward': return p.rewards.length > 0;
      default: return true;
    }
  })();

  const final = useMemo(() => finalize(p), [p]);

  if (step === 'welcome') return <Welcome onNext={next} />;
  if (step === 'motivation') return <Motivation male={p.gender === 'male'} onNext={next} />;
  if (step === 'analysis') return <Analysis p={final} units={units} onDone={next} />;
  if (step === 'result') return <PlanResult p={final} units={units} onBack={back} onNext={next} />;
  if (step === 'paywall') return <Paywall male={p.gender === 'male'} gaining={final.goal === 'gain'} onSkip={() => finish(false)} onSubscribe={() => finish(true)} />;

  const qIndex = QUESTIONS.indexOf(step);
  const cta = step === 'gender' ? null : step === 'proof' ? 'Get My Plan' : 'Next';

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <StatusBar style="dark" />
      <OnbHeader section={SECTION[step] ?? ''} progress={(qIndex + 1) / QUESTIONS.length} onBack={back} />
      <Animated.View key={step} entering={stepIn(dir)} style={{ flex: 1 }}>
        {renderStep()}
      </Animated.View>
      {cta && (
        <CtaBar>
          <Button title={cta} disabled={!canNext} onPress={next} />
        </CtaBar>
      )}
    </SafeAreaView>
  );

  function renderStep() {
    switch (step) {
      case 'gender':
        return (
          <Body>
            <QTitle text="What's your gender?" />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
              <TipCard emoji="💡">
                <Text style={st.tipText}>Knowing your gender can help us tailor the intensity for you based on different metabolic rates.</Text>
              </TipCard>
            </Rise>
            <Rise i={2} style={st.genderRow}>
              {(['male', 'female'] as const).map((g) => (
                <GenderCard
                  key={g}
                  label={g === 'male' ? 'Male' : 'Female'}
                  img={g === 'male' ? IMG.genderMale : IMG.genderFemale}
                  on={p.gender === g}
                  onPress={() => {
                    set({ gender: g });
                    setTimeout(() => go('shape', 1), 320);
                  }}
                />
              ))}
            </Rise>
            <Rise i={3} style={{ alignItems: 'center', marginTop: 18 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  tap();
                  set({ gender: 'other' });
                  setTimeout(() => go('shape', 1), 200);
                }}
                style={({ pressed }) => [st.otherBtn, p.gender === 'other' && st.otherBtnOn, pressed && { opacity: 0.6 }]}>
                <Text style={[st.otherText, p.gender === 'other' && { color: C.primaryDark }]}>Others / I&apos;d rather not say</Text>
              </Pressable>
            </Rise>
          </Body>
        );
      case 'shape':
      case 'desired': {
        const desired = step === 'desired';
        const level = desired ? p.targetShape : p.bodyShape;
        const bf = bodyFat(level, p.gender);
        const toneColor = bf.tone === 'good' ? C.primary : bf.tone === 'ok' ? C.warning : C.accent;
        const note = desired
          ? bf.tone === 'good'
            ? level === 0
              ? 'Very lean takes serious dedication. We will get you there step by step.'
              : "You're on the right track! Keep it up for a healthier, more confident you!"
            : 'A realistic first goal. You can always aim higher later.'
          : bf.tone === 'high'
            ? 'You may have a slow metabolism, and face some potential health problems.'
            : bf.tone === 'ok'
              ? 'A solid starting point. A little focus will reveal real definition.'
              : "Great shape already! We'll help you sharpen it even further.";
        return (
          <Body>
            <QTitle text={desired ? "What's your *desired* body shape?" : "What's your *current* body shape?"} />
            <Rise i={1} style={{ alignItems: 'center', marginTop: 10 }}>
              <View style={st.figureBox}>
                <BodyFigure level={level} gender={p.gender} size={210} />
              </View>
              <Text style={st.figureLabel}>{desired ? 'Desired' : 'Current'}</Text>
            </Rise>
            <Rise i={2} style={{ marginTop: 6 }}>
              <StepSlider count={SHAPES} value={level} onChange={(v) => set(desired ? { targetShape: v } : { bodyShape: v, targetShape: Math.min(p.targetShape, v) })} left="Cut" right="Extra" />
            </Rise>
            <Rise i={3} style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>
              <View style={st.fatCard}>
                <Text style={st.fatTitle}>{desired ? 'Your Target Body Fat (Approx.)' : 'Your Estimated Body Fat (Approx.)'}</Text>
                <Animated.Text key={level} entering={nativeOnly(FadeInDown.duration(MOTION.base))} style={[st.fatValue, { color: toneColor }]}>
                  {bf.range} <Text style={st.fatVerdict}>({bf.verdict})</Text>
                </Animated.Text>
                <Text style={st.fatNote}>{note}</Text>
              </View>
            </Rise>
          </Body>
        );
      }
      case 'birth':
        return (
          <Body>
            <QTitle text="What's your *birth* year?" />
            <Rise i={1} style={{ marginTop: 24 }}>
              <YearWheel values={YEARS} value={p.birthYear} onChange={(birthYear) => set({ birthYear })} />
            </Rise>
            <Rise i={2} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={st.helper}>{yearNow - p.birthYear} years old</Text>
            </Rise>
          </Body>
        );
      case 'height': {
        const inches = Math.round(p.heightCm / 2.54);
        return (
          <Body>
            <QTitle text="What's your *height*?" />
            <Rise i={1} style={{ marginTop: 18 }}>
              <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={setHeightUnit} />
            </Rise>
            <Rise i={2} style={st.bigValueWrap}>
              <Text style={st.bigValue}>
                {heightUnit === 'cm' ? p.heightCm : cmToFtIn(p.heightCm)}
                {heightUnit === 'cm' && <Text style={st.bigUnit}> cm</Text>}
              </Text>
            </Rise>
            <Rise i={3}>
              {heightUnit === 'cm' ? (
                <RulerPicker key="cm" min={120} max={220} step={1} major={10} value={p.heightCm} onChange={(heightCm) => set({ heightCm })} />
              ) : (
                <RulerPicker key="in" min={48} max={86} step={1} major={12} value={inches} onChange={(v) => set({ heightCm: Math.round(v * 2.54) })} label={(v) => `${Math.round(v / 12)}′`} />
              )}
            </Rise>
          </Body>
        );
      }
      case 'weight':
      case 'target': {
        const isTarget = step === 'target';
        const kg = isTarget ? p.targetKg : p.weightKg;
        const v = toUnit(kg, units);
        const b = bmi(kg, p.heightCm);
        const l = bmiLabel(b);
        const onChange = (nv: number) => {
          const nk = fromUnit(nv, units);
          set(isTarget ? { targetKg: nk } : { weightKg: nk });
        };
        return (
          <Body>
            <QTitle text={isTarget ? "What's your *target* weight?" : "What's your *current* weight?"} />
            <Rise i={1} style={{ marginTop: 18 }}>
              <UnitToggle options={['kg', 'lb']} value={units} onChange={setUnits} />
            </Rise>
            <Rise i={2} style={st.bigValueWrap}>
              <Text style={st.bigValue}>
                {v.toFixed(1)}
                <Text style={st.bigUnit}> {units}</Text>
              </Text>
            </Rise>
            <Rise i={3}>
              <RulerPicker key={units} min={units === 'kg' ? 30 : 66} max={units === 'kg' ? 200 : 440} step={0.1} major={10} value={v} onChange={onChange} />
            </Rise>
            <Rise i={4} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
              {isTarget ? <TargetNote p={p} units={units} /> : <BmiCard value={b} label={l.label} color={l.color} />}
            </Rise>
          </Body>
        );
      }
      case 'preview':
        return (
          <Body>
            <QTitle text={`See incredible changes with your personal ${BRAND} plan!`} />
            <View style={st.previewRow}>
              <Rise i={1} style={st.previewCard}>
                <View style={st.previewArt}>
                  <BodyFigure level={p.bodyShape} gender={p.gender} size={140} />
                </View>
                <Text style={st.previewLabel}>Before</Text>
              </Rise>
              <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(420))} style={st.previewArrow}>
                <Ionicons name="arrow-forward" size={18} color={C.white} />
              </Animated.View>
              <Rise i={3} style={[st.previewCard, st.previewCardOn]}>
                <View style={[st.previewArt, { backgroundColor: C.primarySoft }]}>
                  <BodyFigure level={p.targetShape} gender={p.gender} size={140} />
                </View>
                <View style={st.previewTag}>
                  <Text style={[st.previewLabel, { color: C.white, marginTop: 0 }]}>After</Text>
                </View>
              </Rise>
            </View>
            <Rise i={4} style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
              <TipCard emoji="📈" tone="good">
                <Text style={st.tipText}>
                  From <Text style={st.bold}>{bodyFat(p.bodyShape, p.gender).range}</Text> to <Text style={st.bold}>{bodyFat(p.targetShape, p.gender).range}</Text> body fat with a plan built around your answers.
                </Text>
              </TipCard>
            </Rise>
          </Body>
        );
      case 'timeline': {
        const pi = Math.max(0, PACES.findIndex((x) => x.v === p.pace));
        const pace = PACES[pi];
        const t = targets({ ...p, goal: goalFor(p) });
        return (
          <Body>
            <QTitle text="How fast do you want to reach your goal?" />
            <Rise i={1} style={[st.card, { marginHorizontal: GUTTER, marginTop: 20, paddingTop: 16 }]}>
              <GoalCurve from={toUnit(p.weightKg, units)} to={toUnit(p.targetKg, units)} fromText={`${toUnit(p.weightKg, units).toFixed(1)} ${units}`} toText={`${toUnit(p.targetKg, units).toFixed(1)} ${units}`} height={130} />
            </Rise>
            <Rise i={2} style={{ alignItems: 'center', marginTop: 18 }}>
              <Animated.Text key={t.weeks} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.weeks}>
                {t.weeks === 0 ? 'Maintain' : `${t.weeks} Week${t.weeks === 1 ? '' : 's'}`}
              </Animated.Text>
              <Text style={st.paceKg}>
                {toUnit(pace.v, units)} {units} per week
              </Text>
            </Rise>
            <Rise i={3} style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
              <TipCard emoji={pace.emoji}>
                <Animated.Text key={pi} entering={nativeOnly(FadeInDown.duration(MOTION.base))} style={st.tipText}>
                  {pace.note}
                </Animated.Text>
              </TipCard>
            </Rise>
            <Rise i={4} style={{ marginTop: 20 }}>
              <StepSlider count={PACES.length} value={pi} onChange={(i) => set({ pace: PACES[i].v })} left="Easy" right="Master" />
            </Rise>
          </Body>
        );
      }
      case 'benefits':
        return (
          <Body>
            <QTitle text={`Discover the benefits of ${BRAND}'s program`} />
            <View style={st.benefitRow}>
              <Rise i={1} style={st.benefitLeft}>
                {BENEFITS_LEFT.map(([icon, label]) => (
                  <View key={label} style={st.benefitItem}>
                    <View style={st.benefitIcon}>
                      <Ionicons name={icon} size={22} color={C.primaryDark} />
                    </View>
                    <Text style={st.benefitText}>{label}</Text>
                  </View>
                ))}
              </Rise>
              <Rise i={2} style={st.benefitCard}>
                <LinearGradient colors={[C.primary, C.primaryDark]} style={StyleSheet.absoluteFill} />
                <Photo source={p.gender === 'male' ? IMG.benefitsMale : IMG.benefits} position="top" style={st.benefitPhoto} />
                <View style={st.benefitBadge}>
                  <Text style={st.benefitBadgeText}>Your {BRAND} plan</Text>
                </View>
                <View style={{ padding: 12, gap: 8 }}>
                  {BENEFITS_RIGHT.map((b) => (
                    <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Ionicons name="checkmark-circle" size={16} color={C.white} />
                      <Text style={st.benefitCardText}>{b}</Text>
                    </View>
                  ))}
                </View>
              </Rise>
            </View>
          </Body>
        );
      case 'experience':
        return (
          <Body>
            <QTitle text="How was your last experience with weight loss?" />
            <View style={st.list}>
              {EXPERIENCE.map((e, i) => (
                <Rise key={e} i={i + 1}>
                  <ChoiceRow radio title={e} selected={p.experience === e} onPress={() => set({ experience: e })} />
                </Rise>
              ))}
            </View>
          </Body>
        );
      case 'level':
        return (
          <Body>
            <QTitle text="Choose your preferred workout level" />
            <View style={st.list}>
              {LEVELS.map((l, i) => (
                <Rise key={l.t} i={i + 1}>
                  <ChoiceRow emoji={l.emoji} title={l.t} detail={l.detail} selected={p.workoutLevel === l.t} onPress={() => set({ workoutLevel: l.t, program: l.program })} />
                </Rise>
              ))}
            </View>
          </Body>
        );
      case 'activity':
        return (
          <Body>
            <QTitle text="What's your activity level?" />
            <Rise i={1} style={{ alignItems: 'center', marginTop: 16 }}>
              <Photo source={IMG.activity} style={st.activityArt} />
            </Rise>
            <View style={st.list}>
              {ACTIVITY.map((a, i) => (
                <Rise key={a.v} i={i + 2}>
                  <ChoiceRow radio title={a.t} sub={a.s} selected={p.activity === a.v} onPress={() => set({ activity: a.v })} />
                </Rise>
              ))}
            </View>
          </Body>
        );
      case 'rest':
        return (
          <Body>
            <QTitle
              text="Which days do you want to rest each week?"
              sub={p.restDays.length ? `${7 - p.restDays.length} workout days · ${p.restDays.length} rest day${p.restDays.length === 1 ? '' : 's'}` : 'Pick at least one day to recover.'}
            />
            <Rise i={1} style={st.dayGrid}>
              {DAYS.map((d) => (
                <DayChip key={d} label={d} on={p.restDays.includes(d)} onPress={() => set({ restDays: p.restDays.includes(d) || p.restDays.length < 5 ? toggleIn(p.restDays, d) : p.restDays })} />
              ))}
            </Rise>
          </Body>
        );
      case 'diet':
        return (
          <Body>
            <QTitle text="What's your diet type?" />
            <View style={st.list}>
              {DIETS.map((d, i) => (
                <Rise key={d.t} i={i + 1}>
                  <ChoiceRow emoji={d.emoji} title={d.t} selected={p.dietType === d.t} onPress={() => set({ dietType: d.t, diet: d.diet })} />
                </Rise>
              ))}
            </View>
          </Body>
        );
      case 'dietinfo':
        return (
          <Body>
            <QTitle text="Get the best diet for your goals" />
            <Rise i={1} style={st.dietArt}>
              <Photo source={IMG.diet} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']} style={StyleSheet.absoluteFill} />
              <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(380))} style={[st.dietTag, { left: 14, bottom: 16, backgroundColor: C.white }]}>
                <Text style={[st.dietTagText, { color: C.primaryDark }]}>LOW CALORIES</Text>
              </Animated.View>
              <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(520))} style={[st.dietTag, { right: 14, top: 18, backgroundColor: C.accent }]}>
                <Text style={st.dietTagText}>HIGH PROTEIN</Text>
              </Animated.View>
              <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(660))} style={[st.dietTag, { right: 18, bottom: 16, backgroundColor: C.primary }]}>
                <Text style={st.dietTagText}>BALANCED CARBS</Text>
              </Animated.View>
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER + 8, marginTop: 18 }}>
              <Text style={st.centerCopy}>Help you achieve the goal faster and with the least effort possible.</Text>
            </Rise>
          </Body>
        );
      case 'reward':
        return (
          <Body>
            <QTitle text="How would you reward yourself after reaching your goals?" />
            <View style={st.rewardGrid}>
              {REWARDS.map((r, i) => (
                <Rise key={r.t} i={i + 1} style={st.rewardCell}>
                  <RewardCard label={r.t} img={r.img} on={p.rewards.includes(r.t)} onPress={() => set({ rewards: toggleIn(p.rewards, r.t) })} />
                </Rise>
              ))}
            </View>
          </Body>
        );
      case 'proof':
        return (
          <Body>
            <QTitle text={"Don't worry.\nWe can help!"} />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 8 }}>
              <Text style={st.centerCopy}>
                We&apos;ve helped <Text style={{ color: C.primary, fontWeight: '800' }}>1M+</Text> users get their dream body!
              </Text>
            </Rise>
            <Rise i={2} style={[st.card, { marginHorizontal: GUTTER, marginTop: 18, padding: 0, overflow: 'hidden' }]}>
              <Photo source={IMG.testimonial} style={{ height: 190 }} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={st.proofTitle}>Seeing real changes</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <Animated.View key={n} entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(500 + n * 70))}>
                        <Ionicons name="star" size={15} color={C.gold} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
                <Text style={st.proofQuote}>
                  &ldquo;Incredibly intuitive! The crafted plan is just right for my beginner level. Workouts are interesting, by the way. Gonna recommend it to all my pals.&rdquo;
                </Text>
                <Text style={st.proofName}>Priya, 31 · lost 9 kg</Text>
              </View>
            </Rise>
          </Body>
        );
      default:
        return null;
    }
  }
}

/* ---------------- Building blocks ---------------- */

/** Scrollable step body with consistent top/bottom spacing. */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ paddingTop: 10, paddingBottom: 28 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Staggered entrance for step content: title first, then content in reading order. */
function Rise({ i, children, style }: { i: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.enter).delay(80 + Math.min(i, 8) * 70).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 16 }] }))} style={style}>
      {children}
    </Animated.View>
  );
}

function CtaBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[st.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{children}</View>;
}

function GenderCard({ label, img, on, onPress }: { label: string; img: number; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.surfaceAlt, C.primary]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.border, C.primary]),
  }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [C.text, C.white]) }));
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { tap(); onPress(); }} style={{ flex: 1 }}>
      <Animated.View style={[st.genderCard, box]}>
        <Image source={img} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={200} />
        <LinearGradient colors={['rgba(0,0,0,0)', on ? 'rgba(18,168,125,0.92)' : 'rgba(255,255,255,0.94)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
        <Animated.Text style={[st.genderLabel, text]}>{label}</Animated.Text>
        {on && (
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.genderCheck}>
            <Ionicons name="checkmark" size={15} color={C.primary} />
          </Animated.View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

function DayChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primary]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.border, C.primary]),
  }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [C.text, C.white]) }));
  return (
    <PressableScale scaleTo={0.95} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { tap(); onPress(); }} style={st.dayCell}>
      <Animated.View style={[st.day, box]}>
        <Animated.Text style={[st.dayText, text]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

function RewardCard({ label, img, on, onPress }: { label: string; img: number; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const box = useAnimatedStyle(() => ({ borderColor: interpolateColor(p.get(), [0, 1], [C.border, C.primary]) }));
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { tap(); onPress(); }}>
      <Animated.View style={[st.reward, box]}>
        <Photo source={img} style={st.rewardImg} />
        <Text style={st.rewardText} numberOfLines={2}>
          {label}
        </Text>
        {on && (
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.rewardCheck}>
            <Ionicons name="checkmark" size={14} color={C.white} />
          </Animated.View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

function BmiCard({ value, label, color }: { value: number; label: string; color: string }) {
  const msg =
    value < 18.5
      ? 'You have a great potential to build a better shape. Move now!'
      : value < 23
        ? "You're in a healthy range. Let's sculpt and tone!"
        : value < 27.5
          ? 'A few smart changes will make a big difference. You can do it!'
          : "Let's start with small, steady steps toward a healthier you.";
  return (
    <View style={st.bmiCard}>
      <Text style={st.bmiKey}>Current BMI</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <Text style={[st.bmiVal, { color }]}>{value.toFixed(1)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[st.bmiLabel, { color }]}>{label}</Text>
          <Text style={st.bmiMsg}>{msg}</Text>
        </View>
      </View>
    </View>
  );
}

function TargetNote({ p, units }: { p: Profile; units: WeightUnit }) {
  const diff = p.targetKg - p.weightKg;
  const pct = Math.abs(diff / p.weightKg) * 100;
  const tb = bmi(p.targetKg, p.heightCm);
  const amount = `${Math.abs(toUnit(p.targetKg, units) - toUnit(p.weightKg, units)).toFixed(1)} ${units}`;
  let tone: 'warn' | 'good' = 'good';
  let emoji = '👍';
  let title: string;
  let text: string;
  if (tb < 18.5) {
    tone = 'warn';
    emoji = '⚠️';
    title = 'A healthier target weight for you';
    text = 'This target is below a healthy BMI. Consider a slightly higher goal; you can adjust it later in your plan.';
  } else if (Math.abs(diff) < 0.05) {
    title = 'Maintain & tone';
    text = "We'll focus on strength and definition while keeping your weight steady.";
  } else if (pct > 20) {
    tone = 'warn';
    emoji = '⚠️';
    title = `Ambitious: ${diff < 0 ? 'lose' : 'gain'} ${amount}`;
    text = `That's ${pct.toFixed(0)}% of your body weight. We'll get there step by step; you can always adjust it later.`;
  } else {
    title = `Realistic target: ${diff < 0 ? 'lose' : 'gain'} ${amount}`;
    text = `${pct.toFixed(0)}% of your body weight. A healthy, achievable goal for you.`;
  }
  return (
    <TipCard emoji={emoji} tone={tone}>
      <Text style={st.tipTitle}>{title}</Text>
      <Text style={[st.tipText, { marginTop: 2 }]}>{text}</Text>
    </TipCard>
  );
}

/* ---------------- Styles ---------------- */

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  ctaBar: { paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  list: { paddingHorizontal: GUTTER, gap: 10, marginTop: 22 },
  bold: { fontWeight: '800', color: C.text },
  helper: { fontSize: 14, fontWeight: '600', color: C.muted },
  centerCopy: { fontSize: 15, color: C.textSoft, lineHeight: 22, textAlign: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  tipText: { fontSize: 13, color: C.textSoft, lineHeight: 18 },

  genderRow: { flexDirection: 'row', gap: 12, paddingHorizontal: GUTTER, marginTop: 18 },
  genderCard: { height: 250, borderRadius: R.lg, borderWidth: 2, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  genderLabel: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  genderCheck: { position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  otherBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  otherBtnOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  otherText: { fontSize: 13, fontWeight: '600', color: C.textSoft },

  figureBox: { width: 230, height: 230, borderRadius: R.xl, backgroundColor: '#ECEAE8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  figureLabel: { fontSize: 13, fontWeight: '700', color: C.textSoft, marginTop: 10 },
  fatCard: { backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: 1, borderColor: C.borderSoft },
  fatTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  fatValue: { fontSize: 19, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },
  fatVerdict: { fontSize: 14, fontWeight: '700' },
  fatNote: { fontSize: 12.5, color: C.textSoft, lineHeight: 17, marginTop: 4 },

  bigValueWrap: { alignItems: 'center', marginTop: 26, marginBottom: 14 },
  bigValue: { fontSize: 52, fontWeight: '800', color: C.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  bigUnit: { fontSize: 18, fontWeight: '700', color: C.textSoft, letterSpacing: 0 },
  bmiCard: { backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: 1, borderColor: C.borderSoft },
  bmiKey: { fontSize: 13, fontWeight: '700', color: C.text },
  bmiVal: { fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  bmiLabel: { fontSize: 13, fontWeight: '800' },
  bmiMsg: { fontSize: 12.5, color: C.textSoft, lineHeight: 17, marginTop: 1 },

  previewRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: GUTTER, marginTop: 24 },
  previewCard: { flex: 1, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, overflow: 'hidden', alignItems: 'center', paddingBottom: 12 },
  previewCardOn: { borderColor: C.primary },
  previewArt: { alignSelf: 'stretch', height: 190, backgroundColor: '#ECEAE8', alignItems: 'center', justifyContent: 'center' },
  previewLabel: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 10 },
  previewTag: { marginTop: 10, backgroundColor: C.primary, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 4 },
  previewArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: -10, zIndex: 2, borderWidth: 3, borderColor: C.bg },

  weeks: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  paceKg: { fontSize: 13, fontWeight: '600', color: C.muted, marginTop: 2 },

  benefitRow: { flexDirection: 'row', gap: 12, paddingHorizontal: GUTTER, marginTop: 22 },
  benefitLeft: { flex: 0.9, gap: 10 },
  benefitItem: { backgroundColor: C.card, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.borderSoft, gap: 8 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 17 },
  benefitCard: { flex: 1.1, borderRadius: R.lg, overflow: 'hidden', paddingBottom: 6 },
  benefitPhoto: { height: 190 },
  benefitBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4 },
  benefitBadgeText: { color: C.white, fontSize: 10.5, fontWeight: '800' },
  benefitCardText: { color: C.white, fontSize: 12.5, fontWeight: '700', flex: 1 },

  activityArt: { width: 170, height: 170, borderRadius: R.xl },

  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: GUTTER, marginTop: 26 },
  dayCell: { width: '30%' },
  day: { height: 52, borderRadius: R.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  dayText: { fontSize: 14, fontWeight: '700' },

  dietArt: { marginHorizontal: GUTTER, marginTop: 22, height: 300, borderRadius: R.xl, overflow: 'hidden' },
  dietTag: { position: 'absolute', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, ...shadowSm },
  dietTagText: { color: C.white, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },

  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: GUTTER, marginTop: 22 },
  rewardCell: { width: '47.8%' },
  reward: { borderRadius: R.lg, borderWidth: 2, backgroundColor: C.card, overflow: 'hidden', paddingBottom: 10 },
  rewardImg: { height: 128 },
  rewardText: { fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'center', marginTop: 8, paddingHorizontal: 8, minHeight: 34 },
  rewardCheck: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },

  proofTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  proofQuote: { fontSize: 13.5, color: C.textSoft, lineHeight: 20, marginTop: 8, fontStyle: 'italic' },
  proofName: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: 10 },
});
