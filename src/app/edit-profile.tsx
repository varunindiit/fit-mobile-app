import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IndiaFlag } from '@/components/IndiaFlag';
import { PACES as PACE_OPTIONS } from '@/components/onboarding/kit';
import { ACTIVITY, ACTIVITY_ICON, Decor, fmtFull, fmtNum, fmtWeight, GOAL_ICON, goalSummary, GOALS, GroupLabel, useKeyboardShown } from '@/components/profile/shared';
import { Button, Card, CountUp, enter, Header, IconTile, layoutTransition, nativeOnly, OptionCard, PressableScale, Screen, Segmented, Stepper, T, tap, useToast, type IconName } from '@/components/ui';
import { cmToFtIn, round1, targets as calcTargets } from '@/lib/calc';
import { useStore, type Goal, type Profile } from '@/lib/store';
import { C, G, MOTION, R } from '@/theme';

type Draft = Pick<Profile, 'name' | 'phone' | 'gender' | 'age' | 'heightCm' | 'goal' | 'targetKg' | 'pace' | 'activity'>;

const GENDERS: { value: Profile['gender']; label: string; icon: IconName }[] = [
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'other', label: 'Other', icon: 'male-female' },
];
/** Same pace steps as onboarding, so a pace picked there is always selectable here. */
const PACES = PACE_OPTIONS.map((x) => x.v);
const paceHint = (v: number) =>
  v <= 0.25 ? 'Gentle and easy to sustain.' : v <= 0.5 ? 'Recommended — steady, sustainable progress.' : v <= 0.75 ? 'Faster — needs good consistency.' : 'Aggressive — best with coach support.';

/** Labelled input shell whose border eases to the brand colour on focus. */
function Field({ label, focused, children, style }: { label: string; focused: boolean; children: React.ReactNode; style?: ViewStyle }) {
  const f = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    f.set(withTiming(focused ? 1 : 0, { duration: MOTION.fast }));
  }, [focused, f]);
  const box = useAnimatedStyle(() => ({ borderColor: interpolateColor(f.get(), [0, 1], [C.border, C.primary]) }));
  return (
    <View style={style}>
      <Text style={[st.fieldLabel, focused && { color: C.primaryDark }]}>{label}</Text>
      <Animated.View style={[st.input, box]}>{children}</Animated.View>
    </View>
  );
}

export default function EditProfile() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const goalsFirst = section === 'goals';
  const { state, targets: current, updateProfile } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardShown();
  const units = state.settings.units;
  const w = state.profile.weightKg;

  const [d, setD] = useState<Draft>(() => {
    const p = state.profile;
    return { name: p.name, phone: p.phone, gender: p.gender, age: p.age, heightCm: p.heightCm, goal: p.goal, targetKg: p.targetKg, pace: p.pace, activity: p.activity };
  });
  const [focus, setFocus] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const preview = useMemo(() => calcTargets({ ...state.profile, ...d }), [state.profile, d]);
  const delta = preview.budget - current.budget;
  const summary = goalSummary({ ...d, weightKg: w }, preview, units);
  const directional = d.goal === 'lose' || d.goal === 'gain' || d.goal === 'muscle';

  const setGoal = (g: Goal) => {
    let targetKg = d.targetKg;
    if (g === 'lose' && targetKg >= w) targetKg = round1(Math.max(40, w - 5));
    if ((g === 'gain' || g === 'muscle') && targetKg <= w) targetKg = round1(w + 4);
    set({ goal: g, targetKg });
  };

  const name = d.name.trim() || state.profile.name;
  // A phone number is optional, but a half-typed one is never saved.
  const phoneBad = d.phone.length > 0 && d.phone.length !== 10;
  const paceOpts = PACES.includes(d.pace) ? PACES : [...PACES, d.pace].sort((a, b) => a - b);

  /** Write the edits. A partial phone keeps the saved number. */
  const commit = () =>
    updateProfile({
      ...d,
      name,
      phone: phoneBad ? state.profile.phone : d.phone,
      birthYear: new Date().getFullYear() - d.age,
      targetKg: directional ? d.targetKg : w,
    });

  const save = () => {
    commit();
    toast(goalsFirst ? 'Goals updated' : 'Profile updated');
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const personal = (
    <Animated.View key="personal" entering={enter(goalsFirst ? 3 : 0)}>
      <GroupLabel title="Personal details" style={{ marginTop: goalsFirst ? 26 : 10 }} />
      <Card>
        <Field label="Full name" focused={focus === 'name'}>
          <TextInput
            value={d.name}
            onChangeText={(name) => set({ name })}
            placeholder="Your name"
            placeholderTextColor={C.muted}
            style={st.textInput}
            onFocus={() => setFocus('name')}
            onBlur={() => setFocus(null)}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </Field>
        <Field label="Mobile number" focused={focus === 'phone'} style={{ marginTop: 16 }}>
          <View style={st.prefixBox}>
            <IndiaFlag width={22} />
            <Text style={st.prefix}>+91</Text>
          </View>
          <TextInput
            value={d.phone}
            onChangeText={(v) => set({ phone: v.replace(/\D/g, '').slice(0, 10) })}
            placeholder="98765 43210"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
            style={st.textInput}
            onFocus={() => setFocus('phone')}
            onBlur={() => setFocus(null)}
          />
        </Field>
        {phoneBad && focus !== 'phone' && <Text style={st.error}>Enter all 10 digits, or leave it empty.</Text>}
        <Text style={[st.fieldLabel, { marginTop: 16 }]}>Gender</Text>
        <Segmented<Profile['gender']> options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} value={d.gender} onChange={(gender) => set({ gender })} />
        <View style={st.stepRow}>
          <IconTile icon="calendar-outline" color={C.steps} bg={C.stepsSoft} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={st.stepLabel}>Age</Text>
            <Text style={T.small}>years</Text>
          </View>
          <Stepper value={d.age} onChange={(age) => set({ age })} min={13} max={90} />
        </View>
        <View style={st.stepRow}>
          <IconTile icon="body-outline" color={C.water} bg={C.waterSoft} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={st.stepLabel}>Height</Text>
            <Text style={T.small}>{cmToFtIn(d.heightCm)}</Text>
          </View>
          <Stepper value={d.heightCm} onChange={(heightCm) => set({ heightCm })} min={120} max={220} format={(v) => `${v} cm`} />
        </View>
      </Card>
    </Animated.View>
  );

  const goals = (
    <Animated.View key="goals" entering={enter(goalsFirst ? 0 : 1)}>
      <GroupLabel title="Your goal" style={{ marginTop: goalsFirst ? 10 : 26 }} />
      {GOALS.map((g) => (
        <OptionCard key={g.value} icon={GOAL_ICON[g.value]} title={g.title} subtitle={g.sub} selected={d.goal === g.value} onPress={() => setGoal(g.value)} />
      ))}

      {directional && (
        <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.base))} exiting={nativeOnly(FadeOutUp.duration(MOTION.fast))}>
          <Card style={{ marginTop: 4 }}>
            <View style={st.stepRow0}>
              <View style={{ flex: 1 }}>
                <Text style={st.stepLabel} numberOfLines={1}>
                  Target weight
                </Text>
                <Text style={T.small}>Now {fmtWeight(w, units)}</Text>
              </View>
              <Stepper
                value={d.targetKg}
                step={0.5}
                min={d.goal === 'lose' ? 35 : w + 0.5}
                max={d.goal === 'lose' ? w - 0.5 : 200}
                onChange={(targetKg) => set({ targetKg })}
                format={(v) => fmtWeight(v, units)}
              />
            </View>
            <PressableScale
              scaleTo={0.96}
              accessibilityRole="button"
              onPress={() => {
                tap();
                // Leaving this screen drops the draft, so keep the edits made so far.
                commit();
                toast('Changes saved', 'checkmark-circle');
                router.push({ pathname: '/progress', params: { log: String(Date.now()) } });
              }}
              style={st.weighLink}>
              <Ionicons name="scale-outline" size={15} color={C.primaryDark} />
              <Text style={st.weighText}>Weight changed? Log a new weigh-in</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primaryDark} />
            </PressableScale>

            <View style={st.hair} />
            <Text style={st.fieldLabel}>Weekly pace (kg / week)</Text>
            <Segmented<string> options={paceOpts.map((v) => ({ value: String(v), label: String(v) }))} value={String(d.pace)} onChange={(v) => set({ pace: Number(v) })} />
            <View style={st.hint}>
              <Ionicons name="information-circle-outline" size={15} color={C.muted} />
              <Text style={[T.small, { flex: 1 }]}>{paceHint(d.pace)}</Text>
            </View>
          </Card>
        </Animated.View>
      )}

      <Animated.View layout={layoutTransition}>
        <GroupLabel title="Activity level" />
        {ACTIVITY.map((a) => (
          <OptionCard key={a.value} icon={ACTIVITY_ICON[a.value]} title={a.title} subtitle={a.sub} selected={d.activity === a.value} onPress={() => set({ activity: a.value })} />
        ))}

        {/* Live preview */}
        <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.preview}>
          <Decor />
          <View style={st.pvHead}>
            <Ionicons name="sparkles" size={13} color={C.gold} />
            <Text style={st.pvLabel}>YOUR NEW PLAN · LIVE PREVIEW</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
            <CountUp value={preview.budget} format={fmtNum} style={st.pvBudget} duration={MOTION.progress} />
            <Text style={st.pvUnit}>kcal / day</Text>
          </View>
          <View style={st.pvDeltaRow}>
            {delta !== 0 && <Ionicons name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={13} color="rgba(255,255,255,0.85)" />}
            <Text style={st.pvDelta}>{delta === 0 ? 'Same as your current budget' : `${fmtNum(Math.abs(delta))} kcal vs current ${fmtNum(current.budget)}`}</Text>
          </View>
          <View style={st.pvMacros}>
            <PvMacro label="Protein" value={preview.protein} />
            <PvMacro label="Carbs" value={preview.carbs} />
            <PvMacro label="Fat" value={preview.fat} />
            <PvMacro label="Steps" value={preview.stepGoal} unit="" />
          </View>
          <View style={st.pvGoal}>
            <View style={st.pvGoalIcon}>
              <Ionicons name="flag" size={15} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.pvGoalTitle}>{summary.title}</Text>
              {directional && preview.weeks > 0 && <Text style={st.pvGoalSub}>Estimated goal date {fmtFull(preview.goalDate)}</Text>}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );

  return (
    <Screen>
      <Header title={goalsFirst ? 'Edit goals' : 'Edit profile'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {goalsFirst ? [goals, personal] : [personal, goals]}
        </ScrollView>
        <View style={[st.bar, { paddingBottom: kb ? 10 : Math.max(insets.bottom, 12) }]}>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Daily budget</Text>
            <CountUp value={preview.budget} format={fmtNum} style={st.barValue} duration={MOTION.base * 2}>
              <Text style={st.barUnit}> kcal</Text>
            </CountUp>
          </View>
          <Button title="Save changes" icon="checkmark" onPress={save} disabled={phoneBad || (!goalsFirst && !name)} style={{ flex: 1.4 }} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PvMacro({ label, value, unit = 'g' }: { label: string; value: number; unit?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.pvMacroVal}>
        {fmtNum(value)}
        <Text style={st.pvMacroUnit}>{unit}</Text>
      </Text>
      <Text style={st.pvMacroLbl}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.textSoft, marginBottom: 8, marginLeft: 2 },
  error: { fontSize: 12.5, fontWeight: '600', color: C.danger, marginTop: 6, marginLeft: 2 },
  input: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, overflow: 'hidden' },
  textInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 16, color: C.text },
  prefixBox: { height: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: C.surfaceAlt, borderRightWidth: 1, borderRightColor: C.borderSoft },
  prefix: { fontSize: 15, fontWeight: '600', color: C.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  stepRow0: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepLabel: { fontSize: 15, fontWeight: '700', color: C.text },
  weighLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.primarySoft },
  weighText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  hair: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft, marginTop: 16, marginBottom: 14 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  preview: { borderRadius: R.lg, padding: 18, marginTop: 16, overflow: 'hidden' },
  pvHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pvLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  pvBudget: { color: C.white, fontSize: 38, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  pvUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 7 },
  pvDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pvDelta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pvMacros: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.18)' },
  pvMacroVal: { color: C.white, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pvMacroUnit: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  pvMacroLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  pvGoal: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.sm, padding: 12, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  pvGoalIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  pvGoalTitle: { color: C.white, fontSize: 14, fontWeight: '700' },
  pvGoalSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.border },
  barValue: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 2, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  barUnit: { fontSize: 13, fontWeight: '600', color: C.muted, letterSpacing: 0 },
});
