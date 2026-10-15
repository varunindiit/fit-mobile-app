import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyShape, SHAPES, bodyFat } from '@/components/onboarding/BodyShape';
import { IMG } from '@/components/onboarding/assets';
import { Analysis, Intro, LoginSheet, Motivation, Paywall, PlanResult, Welcome } from '@/components/onboarding/FullScreens';
import { ActivityCards, ActivityHero, StepGoal, type ActivityOption } from '@/components/onboarding/Activity';
import { BeforeAfter } from '@/components/onboarding/BeforeAfter';
import { BenefitsHero, CompareTable } from '@/components/onboarding/Benefits';
import { BmiGauge } from '@/components/onboarding/BmiGauge';
import { DailyTargets, DietGrid, PlateHero, type DietOption } from '@/components/onboarding/Diet';
import { IntensityList, StoryGrid, type IntensityOption, type StoryOption } from '@/components/onboarding/Choices';
import { GoalCurve } from '@/components/onboarding/GoalCurve';
import { HeightStage } from '@/components/onboarding/HeightStage';
import { GUTTER, OnbHeader, PACES, QTitle, StepSlider, UnitToggle, fmtWeight, fromUnit, stepIn, toUnit, useOn, type WeightUnit } from '@/components/onboarding/kit';
import { PacePicker } from '@/components/onboarding/PacePicker';
import { MAX_REST, RestPlanner } from '@/components/onboarding/RestPlanner';
import { RewardWall } from '@/components/onboarding/Rewards';
import { RulerPicker } from '@/components/onboarding/RulerPicker';
import { YearWheel } from '@/components/onboarding/YearWheel';
import { Button, CountUp, EASE_OUT, nativeOnly, PressableScale, tap, useToast, type IconName } from '@/components/ui';
import { bmi, bmiLabel, dateKey, fmtDate, targets } from '@/lib/calc';
import { DEFAULT_PROFILE, isPremiumActive, useStore, type Goal, type Profile } from '@/lib/store';
import { BRAND, C, MOTION, R, shadowSm } from '@/theme';

/* ---------------- Flow ---------------- */

type StepId =
  | 'intro' | 'welcome' | 'gender' | 'shape' | 'desired' | 'birth' | 'height' | 'weight' | 'target' | 'preview' | 'timeline' | 'benefits'
  | 'experience' | 'level' | 'activity' | 'rest' | 'diet' | 'dietinfo' | 'reward' | 'motivation' | 'analysis' | 'result' | 'paywall';

const STEPS: StepId[] = [
  'intro', 'welcome', 'gender', 'shape', 'desired', 'birth', 'height', 'weight', 'target', 'preview', 'timeline', 'benefits',
  'experience', 'level', 'activity', 'rest', 'diet', 'dietinfo', 'reward', 'motivation', 'analysis', 'result', 'paywall',
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
};
const QUESTIONS = STEPS.filter((s) => SECTION[s]);

/* ---------------- Options ---------------- */

// `v` is the stored answer (kept stable so saved profiles still match); `t` is what the screen shows.
const EXPERIENCE: StoryOption[] = [
  { v: 'I tried but lost motivation', t: 'Lost motivation', s: 'Started strong, then it faded', icon: 'battery-dead-outline', reply: "Totally normal. We'll keep it fun with small wins you can feel every day." },
  { v: 'I succeeded but regained weight', t: 'It came back', s: 'Lost the weight, then regained it', icon: 'repeat-outline', reply: "We'll build habits that stick around long after you reach your goal." },
  { v: 'Achieved but plateaued', t: 'Hit a plateau', s: 'Progress suddenly stopped', icon: 'pause-circle-outline', reply: 'A fresh routine and a clear weekly pace are a great way to get moving again.' },
  { v: 'Still trying', t: 'Still at it', s: "I'm working on it right now", icon: 'trending-down-outline', reply: "Love the effort. Let's give it a clear plan so every week counts." },
  { v: 'This is my first time', t: 'First time', s: 'Starting fresh, no history yet', icon: 'rocket-outline', reply: "Perfect place to start. We'll guide you one simple step at a time." },
];
const LEVELS: (IntensityOption & { program: Profile['program'] })[] = [
  { v: 'Easy to start', t: 'Ease into it', tag: 'Beginner · low intensity', bars: 1, program: 'belly', detail: 'Gentle sessions that build the habit without wearing you out.' },
  { v: 'Break a light sweat', t: 'Break a sweat', tag: 'Intermediate · moderate', bars: 2, program: 'abs', detail: 'Steady, effective workouts at an intensity that suits you.' },
  { v: 'A bit challenging', t: 'Push me', tag: 'Advanced · high intensity', bars: 3, program: 'sixpack', detail: 'Higher-volume training that takes you a little further every week.' },
];
const ACTIVITY: ActivityOption<Profile['activity']>[] = [
  { v: 'light', t: 'Lightly active', s: 'Casual walks and daily errands', icon: 'walk-outline' },
  { v: 'sedentary', t: 'Mostly sitting', s: 'Desk work, long hours at a screen', icon: 'laptop-outline' },
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// `t` is the stored diet type (Profile matches on it); `label` / `s` are what the screen shows.
const DIETS: (DietOption & { hero: number; diet: string })[] = [
  { t: 'Meat-based', label: 'Meat lover', s: 'Chicken, fish, eggs and red meat', img: IMG.dietMeat, hero: IMG.dietHeroMeat, diet: 'Non-vegetarian' },
  { t: 'Regular diet', label: 'Bit of everything', s: 'A balanced mix, no strict rules', img: IMG.dietRegular, hero: IMG.diet, diet: 'Non-vegetarian' },
  { t: 'Vegetarian', label: 'Vegetarian', s: 'No meat, with dairy', img: IMG.dietVegetarian, hero: IMG.dietHeroVegetarian, diet: 'Vegetarian' },
  { t: 'Vegan', label: 'Fully vegan', s: '100% plant-based', img: IMG.dietVegan, hero: IMG.dietHeroVegan, diet: 'Vegan' },
  { t: 'Other', label: 'Something else', s: 'Keto, Jain or my own style', img: IMG.dietOther, hero: IMG.dietHeroOther, diet: 'Other' },
];
// `t` is the stored reward; `label` is what the screen shows.
const REWARDS: { t: string; label: string; icon: IconName; img: number; imgMale: number }[] = [
  { t: 'Treat myself to a nice meal', label: 'A great dinner out', icon: 'restaurant', img: IMG.rewardMeal, imgMale: IMG.rewardMealMale },
  { t: 'Buy new gym clothes', label: 'Fresh workout gear', icon: 'shirt', img: IMG.rewardClothes, imgMale: IMG.rewardClothesMale },
  { t: 'Take a trip somewhere', label: 'A well-earned getaway', icon: 'airplane', img: IMG.rewardTrip, imgMale: IMG.rewardTripMale },
  { t: 'Get a makeover', label: 'A brand-new look', icon: 'cut', img: IMG.rewardMakeover, imgMale: IMG.rewardMakeoverMale },
];
const GENDERS: { v: 'male' | 'female'; label: string; icon: IconName; img: number }[] = [
  { v: 'male', label: 'Male', icon: 'male', img: IMG.genderMale },
  { v: 'female', label: 'Female', icon: 'female', img: IMG.genderFemale },
];

/** Age bracket for the birth step: how the plan adapts. */
const ageGroup = (age: number): { title: string; icon: IconName; note: string } =>
  age < 18
    ? { title: 'Strong foundations', icon: 'school', note: 'Form-first, bodyweight-led sessions that build safe, lasting habits.' }
    : age < 30
      ? { title: 'Peak recovery', icon: 'flash', note: "You bounce back fast, so we'll push volume and intensity." }
      : age < 40
        ? { title: 'Strength builder', icon: 'barbell', note: 'Balanced strength and cardio, with smart recovery days.' }
        : age < 50
          ? { title: 'Smart & steady', icon: 'fitness', note: 'Joint-friendly progressions that keep you strong and mobile.' }
          : { title: 'Active longevity', icon: 'leaf', note: 'Low-impact strength, balance and mobility to keep you moving well.' };

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const yearNow = new Date().getFullYear();
const YEARS = Array.from({ length: 78 }, (_, i) => yearNow - 90 + i); // ages 13–90

/** Same weight: a leaner target body is a health/recomp goal, a bulkier one is muscle building. */
const goalFor = (p: Profile): Goal =>
  p.targetKg < p.weightKg - 0.05
    ? 'lose'
    : p.targetKg > p.weightKg + 0.05
      ? 'gain'
      : p.targetShape > p.bodyShape
        ? 'muscle'
        : p.targetShape < p.bodyShape
          ? 'healthy'
          : 'maintain';

/** Final profile: derived fields the rest of the app reads (goal, age, weekly goal). */
function finalize(p: Profile): Profile {
  return {
    ...p,
    goal: goalFor(p),
    age: Math.max(13, yearNow - p.birthYear),
    weeklyGoal: Math.max(2, Math.min(6, 7 - p.restDays.length)),
  };
}

/* ---------------- Screen ---------------- */

export default function Onboarding() {
  const { state, completeOnboarding, logIn, subscribe, updateSettings, saveOnboardingDraft } = useStore();
  const toast = useToast();
  // The saved draft survives reloads and app kills, so answers and position are never lost.
  const [draft] = useState(() => state.onboardingDraft);
  // Only an already-onboarded user arriving here (not one finishing right now) is sent back to the app.
  const [wasOnboarded] = useState(state.onboarded);
  const [p, setP] = useState<Profile>(() => draft?.p ?? { ...DEFAULT_PROFILE, ...state.profile });
  // Updater form reads the latest answers, so rapid taps on multi-selects never drop a choice.
  const set = (patch: Partial<Profile> | ((d: Profile) => Partial<Profile>)) => setP((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }));
  const [step, setStep] = useState<StepId>(() => {
    const s = draft?.step as StepId | undefined;
    if (s === 'analysis') return 'result';
    return s && STEPS.includes(s) ? s : 'intro';
  });
  // Nothing is pre-selected on a fresh start; once picked, going back shows the choice.
  const [genderPicked, setGenderPicked] = useState(() => draft?.genderPicked ?? false);
  const [login, setLogin] = useState(false);
  // True while the before/after divider is held, so the step's ScrollView doesn't move with the finger.
  const [dragging, setDragging] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const units: WeightUnit = state.settings.units;
  const setUnits = (u: WeightUnit) => updateSettings({ units: u });
  const heightUnit = state.settings.heightUnit;
  const setHeightUnit = (u: 'cm' | 'ft') => updateSettings({ heightUnit: u });

  useEffect(() => {
    if (wasOnboarded) return;
    // Short debounce so dragging a ruler doesn't re-render the whole app every frame.
    const t = setTimeout(() => saveOnboardingDraft({ p, step, genderPicked }), 250);
    return () => clearTimeout(t);
  }, [p, step, genderPicked, wasOnboarded, saveOnboardingDraft]);

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
      if (step === 'intro') return false;
      back();
      return true;
    });
    return () => sub.remove();
  });

  /** completeOnboarding also clears the saved draft. */
  const finish = () => {
    completeOnboarding(finalize(p));
    router.replace('/(tabs)');
    setTimeout(() => toast(`Welcome to ${BRAND}! Your plan is ready`, 'sparkles'), 400);
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

  if (wasOnboarded) return <Redirect href="/(tabs)" />;

  if (step === 'intro')
    return (
      <>
        <Intro onStart={next} onLogin={() => setLogin(true)} />
        <LoginSheet
          visible={login}
          onClose={() => setLogin(false)}
          onLogin={() => {
            setLogin(false);
            // A returning user on this device goes straight back in with their saved logs and profile.
            if (state.weights.length || state.entries.length) logIn();
            else completeOnboarding(finalize(p));
            router.replace('/(tabs)');
            setTimeout(() => toast('Welcome back!', 'person-circle'), 400);
          }}
        />
      </>
    );
  if (step === 'welcome') return <Welcome onNext={next} />;
  if (step === 'motivation')
    return (
      <Motivation
        male={p.gender === 'male'}
        onNext={next}
        goal={Math.abs(p.targetKg - p.weightKg) >= 0.05 ? { from: fmtWeight(p.weightKg, units), to: fmtWeight(p.targetKg, units) } : undefined}
        reward={REWARDS.find((r) => p.rewards.includes(r.t))?.label}
      />
    );
  if (step === 'analysis') return <Analysis p={final} units={units} onDone={next} />;
  if (step === 'result') return <PlanResult p={final} units={units} onBack={back} onNext={next} />;
  if (step === 'paywall') return <Paywall male={p.gender === 'male'} gaining={final.goal === 'gain' || final.goal === 'muscle'} onSkip={finish} onPaid={(tier, months, amount) => {
        // Resumed onto the paywall after already paying: don't record a second purchase.
        if (!isPremiumActive(state.premium)) subscribe(tier, months, amount);
      }} onDone={finish} />;

  const qIndex = QUESTIONS.indexOf(step);
  const cta = step === 'gender' ? null : 'Next';

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
      case 'gender': {
        const picked = genderPicked ? p.gender : null;
        // Brief pause so the selected state reads before the step advances.
        const pick = (g: Profile['gender'], delay: number) => {
          set({ gender: g });
          setGenderPicked(true);
          setTimeout(() => go('shape', 1), delay);
        };
        return (
          <Body>
            <QTitle text="Which best *describes* you?" sub="We tune calorie burn and training intensity to your metabolism." />
            <View style={st.genderRow}>
              {GENDERS.map((g, i) => (
                <Rise key={g.v} i={i + 1} style={{ flex: 1 }}>
                  <GenderCard label={g.label} icon={g.icon} img={g.img} on={picked === g.v} dim={!!picked && picked !== g.v} onPress={() => pick(g.v, 380)} />
                </Rise>
              ))}
            </View>
            <Rise i={3} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
              <OtherRow on={picked === 'other'} onPress={() => pick('other', 280)} />
            </Rise>
            <Rise i={4} style={st.privacy}>
              <Ionicons name="lock-closed" size={12} color={C.muted} />
              <Text style={st.privacyText}>Private. Only used to personalize your plan.</Text>
            </Rise>
          </Body>
        );
      }
      case 'shape':
      case 'desired': {
        const desired = step === 'desired';
        const level = desired ? p.targetShape : p.bodyShape;
        const bf = bodyFat(level, p.gender);
        // On the desired step the verdict reflects how far the target is from the current shape.
        const drop = p.bodyShape - p.targetShape;
        const info: { verdict: string; tone: 'good' | 'ok' | 'high'; icon: IconName; note: string } = desired
          ? drop >= 3
            ? { verdict: 'Bold goal', tone: 'high', icon: 'flame', note: "Ambitious and absolutely doable. Expect to sweat; we'll pace it so you stay on track." }
            : drop >= 1
              ? { verdict: 'Smart target', tone: 'good', icon: 'checkmark-circle', note: 'A realistic, sustainable goal. Steady progress, real results.' }
              : drop === 0
                ? { verdict: 'Hold & refine', tone: 'good', icon: 'shield-checkmark', note: "We'll keep your shape while building strength and definition." }
                : { verdict: 'Size up', tone: 'ok', icon: 'barbell', note: "Building size? We'll pair strength training with the right fuel." }
          : bf.tone === 'high'
            ? { verdict: bf.verdict, tone: 'high', icon: 'flame', note: 'Extra body fat can slow your metabolism. The good news: it responds fast to the right plan.' }
            : bf.tone === 'ok'
              ? { verdict: bf.verdict, tone: 'ok', icon: 'trending-up', note: 'A solid base. A little focus will bring out real definition.' }
              : { verdict: bf.verdict, tone: 'good', icon: 'sparkles', note: "You're already in great shape. We'll help you sharpen it further." };
        const toneColor = info.tone === 'good' ? C.primary : info.tone === 'ok' ? C.warning : C.accent;
        const toneSoft = info.tone === 'good' ? C.primarySoft : info.tone === 'ok' ? C.warningSoft : C.accentSoft;
        return (
          <Body>
            <QTitle
              text={desired ? 'Picture your *goal* body' : 'Where are you *starting* from?'}
              sub={desired ? "Slide to the shape you're working toward." : 'Slide until the photo looks most like you today.'}
            />
            <Rise i={1} style={st.shapeWrap}>
              <View style={st.shapeStage}>
                <BodyShape level={level} gender={p.gender} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['rgba(19,35,31,0)', 'rgba(19,35,31,0.78)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={st.shapeBadge}>
                  <Ionicons name={desired ? 'flag' : 'body'} size={12} color={C.primaryDark} />
                  <Text style={st.shapeBadgeText}>{desired ? 'Your goal' : 'You today'}</Text>
                </View>
                {desired && (
                  <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter).delay(360))} style={st.shapeNow}>
                    <BodyShape level={p.bodyShape} gender={p.gender} style={st.shapeNowImg} />
                    <Text style={st.shapeNowText}>Now</Text>
                  </Animated.View>
                )}
                <View style={st.shapeReadout}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.shapeKey}>{desired ? 'Target body fat' : 'Estimated body fat'}</Text>
                    <Animated.Text key={level} entering={nativeOnly(FadeInDown.duration(MOTION.base))} style={st.shapeRange}>
                      {bf.range}
                    </Animated.Text>
                  </View>
                  <Animated.View key={info.verdict} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[st.shapeVerdict, { backgroundColor: toneColor }]}>
                    <Text style={st.shapeVerdictText}>{info.verdict}</Text>
                  </Animated.View>
                </View>
              </View>
            </Rise>
            <Rise i={2} style={{ marginTop: 16 }}>
              <StepSlider
                variant="pill"
                count={SHAPES}
                value={level}
                anchor={desired ? p.bodyShape : undefined}
                label={desired ? 'Goal' : 'You'}
                onChange={(v) => set(desired ? { targetShape: v } : { bodyShape: v, targetShape: Math.min(p.targetShape, v) })}
                left="Leaner"
                right="Fuller"
              />
            </Rise>
            <Rise i={3} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
              <View style={st.insight}>
                <View style={[st.insightIcon, { backgroundColor: toneSoft }]}>
                  <Ionicons name={info.icon} size={18} color={toneColor} />
                </View>
                <Animated.Text key={info.note} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={st.insightText}>
                  {info.note}
                </Animated.Text>
              </View>
            </Rise>
          </Body>
        );
      }
      case 'birth': {
        const age = yearNow - p.birthYear;
        const group = ageGroup(age);
        return (
          <Body>
            <QTitle text="When were you *born*?" sub="Age shapes your recovery time and how hard we push." />
            <Rise i={1} style={st.wheelCard}>
              <YearWheel
                values={YEARS}
                value={p.birthYear}
                onChange={(birthYear) => set({ birthYear })}
                left={<Text style={st.wheelCaption}>BORN</Text>}
                right={
                  <View style={st.agePill}>
                    <Text style={st.agePillKey}>Age</Text>
                    <Text style={st.agePillVal}>{age}</Text>
                  </View>
                }
              />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
              <View style={st.insight}>
                <View style={[st.insightIcon, { backgroundColor: C.primarySoft }]}>
                  <Ionicons name={group.icon} size={18} color={C.primaryDark} />
                </View>
                <Animated.View key={group.title} entering={nativeOnly(FadeInDown.duration(MOTION.base))} style={{ flex: 1 }}>
                  <Text style={st.tipTitle}>{group.title}</Text>
                  <Text style={[st.insightText, { marginTop: 2 }]}>{group.note}</Text>
                </Animated.View>
              </View>
            </Rise>
          </Body>
        );
      }
      case 'height': {
        const inches = Math.round(p.heightCm / 2.54);
        const cmMode = heightUnit === 'cm';
        // ± nudges by one ruler tick in the active unit (1 cm or 1 inch), within the ruler's range.
        // Updater form so rapid taps each count.
        const nudge = (d: 1 | -1) =>
          set((x) =>
            cmMode
              ? { heightCm: Math.min(220, Math.max(120, x.heightCm + d)) }
              : { heightCm: Math.round(Math.min(86, Math.max(48, Math.round(x.heightCm / 2.54) + d)) * 2.54) },
          );
        return (
          <Body>
            <QTitle text="What's your *height*?" sub="Helps us calculate your BMI and daily calorie burn." />
            <Rise i={1} style={{ marginTop: 18 }}>
              <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={setHeightUnit} />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
              <HeightStage
                cm={p.heightCm}
                unit={heightUnit}
                gender={p.gender}
                onStep={nudge}
                canDown={cmMode ? p.heightCm > 120 : inches > 48}
                canUp={cmMode ? p.heightCm < 220 : inches < 86}
              />
            </Rise>
            <Rise i={3} style={{ marginTop: 22 }}>
              {cmMode ? (
                <RulerPicker key="cm" min={120} max={220} step={1} major={10} value={p.heightCm} onChange={(heightCm) => set({ heightCm })} />
              ) : (
                <RulerPicker key="in" min={48} max={86} step={1} major={12} value={inches} onChange={(v) => set({ heightCm: Math.round(v * 2.54) })} label={(v) => `${Math.round(v / 12)}′`} />
              )}
            </Rise>
            <Rise i={4} style={st.privacy}>
              <Ionicons name="hand-left-outline" size={12} color={C.muted} />
              <Text style={st.privacyText}>Slide the ruler or tap − / + to fine-tune</Text>
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
        const onChange = (nv: number) => {
          const nk = fromUnit(nv, units);
          set(isTarget ? { targetKg: nk } : { weightKg: nk });
        };
        return (
          <Body>
            <QTitle
              text={isTarget ? "What's your *target* weight?" : "What's your *current* weight?"}
              sub={isTarget ? 'Slide from where you are to where you want to be.' : 'Your starting point. We track every win from here.'}
            />
            <Rise i={1} style={{ marginTop: 18 }}>
              <UnitToggle options={['kg', 'lb']} value={units} onChange={setUnits} />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER, marginTop: 20, marginBottom: 18 }}>
              <BmiGauge value={v.toFixed(1)} unit={units} bmi={b} from={isTarget ? bmi(p.weightKg, p.heightCm) : undefined} badge={isTarget ? goalBadge(p, units) : undefined} />
            </Rise>
            <Rise i={3}>
              <RulerPicker key={units} min={units === 'kg' ? 30 : 66} max={units === 'kg' ? 200 : 440} step={0.1} major={10} value={v} onChange={onChange} />
            </Rise>
            <Rise i={4} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
              {isTarget ? <TargetNote p={p} units={units} /> : <BmiInsight value={b} heightCm={p.heightCm} units={units} />}
            </Rise>
          </Body>
        );
      }
      case 'preview':
        return (
          <Body scroll={!dragging}>
            <QTitle text={`Meet the *new you* your ${BRAND} plan is built for`} sub="Drag the slider to compare today with your goal." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
              <BeforeAfter before={p.bodyShape} after={p.targetShape} gender={p.gender} onDrag={setDragging} />
            </Rise>
            <View style={st.statRow}>
              <Rise i={2} style={{ flex: 1 }}>
                <StatTile icon="flame-outline" label="Body fat" from={bodyFat(p.bodyShape, p.gender).range} to={bodyFat(p.targetShape, p.gender).range} />
              </Rise>
              <Rise i={3} style={{ flex: 1 }}>
                <StatTile icon="scale-outline" label={`Weight (${units})`} from={toUnit(p.weightKg, units).toFixed(1)} to={toUnit(p.targetKg, units).toFixed(1)} />
              </Rise>
            </View>
            <Rise i={4} style={st.privacy}>
              <Ionicons name="sparkles" size={12} color={C.primary} />
              <Text style={st.privacyText}>Your plan is built around your answers</Text>
            </Rise>
          </Body>
        );
      case 'timeline': {
        const pi = Math.max(0, PACES.findIndex((x) => x.v === p.pace));
        const pace = PACES[pi];
        const t = targets({ ...p, goal: goalFor(p) });
        const goalText = `${toUnit(p.targetKg, units).toFixed(1)} ${units}`;
        const sameYear = t.goalDate.getFullYear() === new Date().getFullYear();
        const dateText = `${fmtDate(dateKey(t.goalDate))}${sameYear ? '' : ` ${t.goalDate.getFullYear()}`}`;
        return (
          <Body>
            <QTitle text="Choose your *pace* to the goal" sub="Faster isn't always better — pick what you can stick to." />
            <Rise i={1} style={st.paceHero}>
              <View style={st.paceHeroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={st.eyebrow}>{t.weeks === 0 ? 'YOUR GOAL' : 'ESTIMATED GOAL DATE'}</Text>
                  <Animated.Text key={dateText + t.weeks} entering={nativeOnly(FadeInDown.duration(MOTION.base).easing(EASE_OUT))} style={st.goalDate}>
                    {t.weeks === 0 ? 'Maintain' : dateText}
                  </Animated.Text>
                  <Text style={st.goalSub}>{t.weeks === 0 ? `Hold steady at ${goalText}` : `Reach ${goalText}`}</Text>
                </View>
                {t.weeks > 0 && (
                  <Animated.View key={t.weeks} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.weeksPill}>
                    <Text style={st.weeksNum}>{t.weeks}</Text>
                    <Text style={st.weeksLabel}>{t.weeks === 1 ? 'week' : 'weeks'}</Text>
                  </Animated.View>
                )}
              </View>
              <GoalCurve from={toUnit(p.weightKg, units)} to={toUnit(p.targetKg, units)} fromText={`${toUnit(p.weightKg, units).toFixed(1)} ${units}`} toText={goalText} height={110} />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
              <PacePicker value={pi} onChange={(i) => set({ pace: PACES[i].v })} units={units} />
            </Rise>
            <Rise i={3} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
              <View style={st.insight}>
                <View style={[st.insightIcon, { backgroundColor: C.primarySoft }]}>
                  <Ionicons name={pace.icon} size={18} color={C.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Animated.Text key={pi} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={st.insightText}>
                    {pace.note}
                  </Animated.Text>
                  <Text style={st.rangeText}>
                    Daily calories ≈ <CountUp value={t.budget} style={st.bold} /> kcal
                  </Text>
                </View>
              </View>
            </Rise>
          </Body>
        );
      }
      case 'benefits':
        return (
          <Body>
            <QTitle text={`Why *${BRAND}* works for you`} sub="Everything in your plan comes from your answers." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER }}>
              <BenefitsHero male={p.gender === 'male'} />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER }}>
              <CompareTable />
            </Rise>
          </Body>
        );
      case 'experience':
        return (
          <Body>
            <QTitle text="What's your *weight-loss* story so far?" sub="No judgement. It helps us plan around what got in your way." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
              <StoryGrid options={EXPERIENCE} value={p.experience} onChange={(experience) => set({ experience })} />
            </Rise>
          </Body>
        );
      case 'level':
        return (
          <Body>
            <QTitle text="How hard do you want to *train*?" sub="Pick the intensity that feels right today." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
              <IntensityList
                options={LEVELS}
                value={p.workoutLevel}
                onChange={(v) => {
                  const l = LEVELS.find((x) => x.v === v);
                  if (l) set({ workoutLevel: l.v, program: l.program });
                }}
              />
            </Rise>
          </Body>
        );
      case 'activity':
        return (
          <Body>
            <QTitle text="What does your *everyday* look like?" sub="Not counting workouts — this shapes your daily step goal and calorie burn." />
            <Rise i={1}>
              <ActivityHero />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER, marginTop: 6 }}>
              <ActivityCards options={ACTIVITY} value={p.activity} onChange={(activity) => set({ activity })} />
            </Rise>
            <Rise i={3} style={{ paddingHorizontal: GUTTER }}>
              <StepGoal steps={targets(p).stepGoal} />
            </Rise>
          </Body>
        );
      case 'rest':
        return (
          <Body>
            <QTitle text="Plan your *rest* days" sub="Recovery is where progress happens. Tap the days you'll take off." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
              <RestPlanner
                days={DAYS}
                value={p.restDays}
                onChange={(restDays) => set({ restDays })}
                onToggle={(d) => set((x) => ({ restDays: x.restDays.includes(d) || x.restDays.length < MAX_REST ? toggleIn(x.restDays, d) : x.restDays }))}
              />
            </Rise>
          </Body>
        );
      case 'diet':
        return (
          <Body>
            <QTitle text="How do you like to *eat*?" sub="Your meal plan will match the way you already eat." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
              <DietGrid
                options={DIETS}
                value={p.dietType}
                onChange={(t) => {
                  const d = DIETS.find((x) => x.t === t);
                  if (d) set({ dietType: d.t, diet: d.diet });
                }}
              />
            </Rise>
          </Body>
        );
      case 'dietinfo': {
        const d = DIETS.find((x) => x.t === p.dietType);
        const t = targets({ ...p, goal: goalFor(p) });
        return (
          <Body>
            <QTitle text="Your plate, *perfectly planned*" sub="Daily targets worked out from your answers so far." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
              <PlateHero img={d?.hero ?? IMG.diet} label={`${d?.label ?? 'Balanced'} plan`} />
            </Rise>
            <Rise i={2} style={{ paddingHorizontal: GUTTER }}>
              <DailyTargets kcal={t.budget} protein={t.protein} carbs={t.carbs} fat={t.fat} />
            </Rise>
          </Body>
        );
      }
      case 'reward':
        return (
          <Body>
            <QTitle text="What's your *reward* for crushing it?" sub="Pick as many as you like. A goal feels closer with a prize waiting." />
            <Rise i={1} style={{ paddingHorizontal: GUTTER, marginTop: 22 }}>
              <RewardWall
                options={REWARDS.map((r) => ({ t: r.t, label: r.label, icon: r.icon, img: p.gender === 'male' ? r.imgMale : r.img }))}
                value={p.rewards}
                onToggle={(t) => set((x) => ({ rewards: toggleIn(x.rewards, t) }))}
              />
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
function Body({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <ScrollView scrollEnabled={scroll} contentContainerStyle={{ paddingTop: 10, paddingBottom: 28 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

/** Portrait card: figure over a mint halo, floating label pill. Selected lifts and deepens; the other card recedes. */
function GenderCard({ label, icon, img, on, dim, onPress }: { label: string; icon: IconName; img: number; on: boolean; dim: boolean; onPress: () => void }) {
  const p = useOn(on);
  const d = useOn(dim);
  const card = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primary]),
    opacity: 1 - d.get() * 0.45,
    transform: [{ translateY: -4 * p.get() }],
  }));
  const halo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.primarySoft, C.primaryTint]),
    transform: [{ scale: 1 + 0.08 * p.get() }],
  }));
  const pill = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primaryDark]) }));
  const text = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [C.text, C.white]) }));
  return (
    <PressableScale scaleTo={0.97} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => { tap(); onPress(); }}>
      <Animated.View style={[st.genderCard, card]}>
        <Animated.View style={[st.genderHalo, halo]} />
        <Image source={img} style={st.genderImg} contentFit="contain" contentPosition="bottom" transition={200} />
        <LinearGradient colors={['rgba(255,255,255,0)', C.card]} style={st.genderFade} pointerEvents="none" />
        <Animated.View style={[st.genderPill, pill]}>
          <View style={[st.genderIcon, on && { backgroundColor: C.white }]}>
            <Ionicons name={icon} size={13} color={C.primaryDark} />
          </View>
          <Animated.Text style={[st.genderLabel, text]}>{label}</Animated.Text>
        </Animated.View>
        <View style={[st.genderRadio, on && st.genderRadioOn]}>
          {on && (
            <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
              <Ionicons name="checkmark" size={14} color={C.white} />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

function OtherRow({ on, onPress }: { on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primary]),
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primarySoft]),
  }));
  return (
    <PressableScale scaleTo={0.98} accessibilityRole="radio" accessibilityLabel="Other or prefer not to say" accessibilityState={{ checked: on }} onPress={() => { tap(); onPress(); }}>
      <Animated.View style={[st.otherRow, box]}>
        <View style={st.otherIcon}>
          <Ionicons name="male-female" size={17} color={C.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.otherTitle}>Other / Prefer not to say</Text>
          <Text style={st.otherSub}>We&apos;ll use balanced, neutral defaults</Text>
        </View>
        <Ionicons name={on ? 'checkmark-circle' : 'chevron-forward'} size={20} color={on ? C.primary : C.muted} />
      </Animated.View>
    </PressableScale>
  );
}

/** Verdict note under the BMI dial, with the weight range that counts as healthy at this height. */
function BmiInsight({ value, heightCm, units }: { value: number; heightCm: number; units: WeightUnit }) {
  const { color } = bmiLabel(value);
  const msg =
    value < 18.5
      ? 'You have a great potential to build a better shape. Move now!'
      : value < 23
        ? "You're in a healthy range. Let's sculpt and tone!"
        : value < 27.5
          ? 'A few smart changes will make a big difference. You can do it!'
          : "Let's start with small, steady steps toward a healthier you.";
  const icon: IconName = value < 18.5 ? 'barbell' : value < 23 ? 'sparkles' : value < 27.5 ? 'trending-down' : 'footsteps';
  // Same 18.5–23 band `bmiLabel` calls Healthy, expressed as weight at this height.
  const m2 = Math.pow(heightCm / 100, 2);
  const range = `${toUnit(18.5 * m2, units).toFixed(1)} – ${toUnit(23 * m2, units).toFixed(1)} ${units}`;
  return (
    <View style={st.insight}>
      <View style={[st.insightIcon, { backgroundColor: color + '1F' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Animated.Text key={msg} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={st.insightText}>
          {msg}
        </Animated.Text>
        <Text style={st.rangeText}>
          Healthy for your height: <Text style={st.bold}>{range}</Text>
        </Text>
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
  let icon: IconName = 'thumbs-up';
  let title: string;
  let text: string;
  if (tb < 18.5) {
    tone = 'warn';
    icon = 'warning';
    title = 'A healthier target weight for you';
    text = 'This target is below a healthy BMI. Consider a slightly higher goal; you can adjust it later in your plan.';
  } else if (Math.abs(diff) < 0.05) {
    title = 'Maintain & tone';
    text = "We'll focus on strength and definition while keeping your weight steady.";
  } else if (pct > 20) {
    tone = 'warn';
    icon = 'warning';
    title = `Ambitious: ${diff < 0 ? 'lose' : 'gain'} ${amount}`;
    text = `That's ${pct.toFixed(0)}% of your body weight. We'll get there step by step; you can always adjust it later.`;
  } else {
    title = `Realistic target: ${diff < 0 ? 'lose' : 'gain'} ${amount}`;
    text = `${pct.toFixed(0)}% of your body weight. A healthy, achievable goal for you.`;
  }
  const color = tone === 'warn' ? C.warning : C.primary;
  return (
    <View style={st.insight}>
      <View style={[st.insightIcon, { backgroundColor: tone === 'warn' ? C.warningSoft : C.primarySoft }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Animated.View key={title} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={{ flex: 1 }}>
        <Text style={st.tipTitle}>{title}</Text>
        <Text style={[st.insightText, { marginTop: 2 }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

/** Small from → to stat card used under the before/after comparison. */
function StatTile({ icon, label, from, to }: { icon: IconName; label: string; from: string; to: string }) {
  return (
    <View style={st.stat}>
      <View style={st.statHead}>
        <Ionicons name={icon} size={14} color={C.primaryDark} />
        <Text style={st.statLabel}>{label}</Text>
      </View>
      <Text style={st.statFrom} numberOfLines={1}>
        {from}
      </Text>
      <View style={st.statToRow}>
        <Ionicons name="arrow-forward" size={13} color={C.primary} />
        <Text style={st.statTo} numberOfLines={1} adjustsFontSizeToFit>
          {to}
        </Text>
      </View>
    </View>
  );
}

/** Direction and size of the change from current to target weight, shown above the goal value. */
function goalBadge(p: Profile, units: WeightUnit) {
  const d = toUnit(p.targetKg, units) - toUnit(p.weightKg, units);
  if (Math.abs(d) < 0.05) return 'Maintain';
  return `${d < 0 ? '↓' : '↑'} ${Math.abs(d).toFixed(1)} ${units} to ${d < 0 ? 'lose' : 'gain'}`;
}

/* ---------------- Styles ---------------- */

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  ctaBar: { paddingHorizontal: GUTTER, paddingTop: 12, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  list: { paddingHorizontal: GUTTER, gap: 10, marginTop: 22 },
  bold: { fontWeight: '800', color: C.text },
  tipTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  tipText: { fontSize: 13, color: C.textSoft, lineHeight: 18 },

  genderRow: { flexDirection: 'row', gap: 12, paddingHorizontal: GUTTER, marginTop: 24 },
  genderCard: { height: 290, borderRadius: R.xl, borderWidth: 2, backgroundColor: C.card, alignItems: 'center', ...shadowSm },
  genderHalo: { position: 'absolute', top: 30, width: '84%', aspectRatio: 1, borderRadius: R.pill },
  genderImg: { position: 'absolute', top: 18, left: 6, right: 6, bottom: 34 },
  genderFade: { position: 'absolute', left: 2, right: 2, bottom: 34, height: 40 },
  genderPill: { position: 'absolute', bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 5, paddingRight: 14, paddingVertical: 5, borderRadius: R.pill, ...shadowSm },
  genderIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  genderLabel: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  genderRadio: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  genderRadioOn: { borderColor: C.primary, backgroundColor: C.primary },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.lg, borderWidth: 1.5 },
  otherIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  otherTitle: { fontSize: 14.5, fontWeight: '700', color: C.text },
  otherSub: { fontSize: 12.5, color: C.muted, marginTop: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  privacyText: { fontSize: 12, fontWeight: '500', color: C.muted },

  shapeWrap: { alignSelf: 'stretch', paddingHorizontal: GUTTER, marginTop: 20 },
  // Percentage width resolves against the wrapper, so the photo spans exactly the slider track; height follows.
  shapeStage: { width: '100%', aspectRatio: 1.05, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.skeleton },
  shapeBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.92)' },
  shapeBadgeText: { fontSize: 12, fontWeight: '800', color: C.primaryDark, letterSpacing: 0.2 },
  shapeNow: { position: 'absolute', top: 12, right: 12, alignItems: 'center', gap: 4 },
  shapeNowImg: { width: 56, height: 56, borderRadius: R.sm, borderWidth: 2, borderColor: C.white },
  shapeNowText: { fontSize: 11, fontWeight: '800', color: C.white, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 },
  shapeReadout: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  shapeKey: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.6, textTransform: 'uppercase' },
  shapeRange: { fontSize: 30, fontWeight: '900', color: C.white, letterSpacing: -0.8, fontVariant: ['tabular-nums'], marginTop: 1 },
  shapeVerdict: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, marginBottom: 4 },
  shapeVerdictText: { fontSize: 12.5, fontWeight: '800', color: C.white },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: C.textSoft },

  wheelCard: { marginHorizontal: GUTTER, marginTop: 22, paddingVertical: 6, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', ...shadowSm },
  wheelCaption: { fontSize: 11, fontWeight: '800', color: C.primary, letterSpacing: 1.4 },
  agePill: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, backgroundColor: C.primaryDark },
  agePillKey: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  agePillVal: { fontSize: 15, fontWeight: '900', color: C.white, fontVariant: ['tabular-nums'] },

  rangeText: { fontSize: 12.5, color: C.muted, marginTop: 4, fontVariant: ['tabular-nums'] },

  statRow: { flexDirection: 'row', gap: 12, paddingHorizontal: GUTTER, marginTop: 14 },
  stat: { padding: 14, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 12, fontWeight: '700', color: C.textSoft },
  statFrom: { fontSize: 13.5, fontWeight: '600', color: C.muted, marginTop: 8, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  statToRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statTo: { flex: 1, fontSize: 19, fontWeight: '800', color: C.primaryDark, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },

  paceHero: { marginHorizontal: GUTTER, marginTop: 20, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  paceHeroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingHorizontal: 4 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 1.4 },
  goalDate: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8, marginTop: 4 },
  goalSub: { fontSize: 13, fontWeight: '600', color: C.textSoft, marginTop: 1 },
  weeksPill: { alignItems: 'center', minWidth: 64, paddingVertical: 8, paddingHorizontal: 10, borderRadius: R.md, backgroundColor: C.primarySoft },
  weeksNum: { fontSize: 22, fontWeight: '900', color: C.primaryDark, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  weeksLabel: { fontSize: 11, fontWeight: '700', color: C.primaryDark, marginTop: -2 },






});
