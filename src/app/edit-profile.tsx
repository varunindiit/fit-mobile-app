import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ACTIVITY, fmtFull, fmtNum, fmtWeight, goalSummary, GOALS, useKeyboardShown } from '@/components/profile/shared';
import { Button, Card, Chip, Header, OptionCard, Screen, Stepper, T, tap, useToast, type IconName } from '@/components/ui';
import { cmToFtIn, round1, targets as calcTargets } from '@/lib/calc';
import { useStore, type Goal, type Profile } from '@/lib/store';
import { C, R } from '@/theme';

type Draft = Pick<Profile, 'name' | 'phone' | 'gender' | 'age' | 'heightCm' | 'goal' | 'targetKg' | 'pace' | 'activity'>;

const GENDERS: { value: Profile['gender']; label: string; icon: IconName }[] = [
  { value: 'female', label: 'Female', icon: 'female' },
  { value: 'male', label: 'Male', icon: 'male' },
  { value: 'other', label: 'Other', icon: 'male-female' },
];
const PACES = [0.25, 0.5, 0.75, 1];
const paceHint = (v: number) =>
  v <= 0.25 ? 'Gentle and easy to sustain.' : v <= 0.5 ? 'Recommended — steady, sustainable progress.' : v <= 0.75 ? 'Faster — needs good consistency.' : 'Aggressive — best with coach support.';

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

  const save = () => {
    const name = d.name.trim();
    updateProfile({ ...d, name, targetKg: directional ? d.targetKg : w });
    toast(goalsFirst ? 'Goals updated' : 'Profile updated');
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const personal = (
    <View key="personal">
      <Text style={st.sectionLabel}>Personal details</Text>
      <Card>
        <Text style={st.fieldLabel}>Full name</Text>
        <TextInput
          value={d.name}
          onChangeText={(name) => set({ name })}
          placeholder="Your name"
          placeholderTextColor={C.muted}
          style={[st.input, focus === 'name' && st.inputFocus]}
          onFocus={() => setFocus('name')}
          onBlur={() => setFocus(null)}
          autoCapitalize="words"
          returnKeyType="done"
        />
        <Text style={[st.fieldLabel, { marginTop: 14 }]}>Mobile number</Text>
        <View style={[st.input, st.phoneRow, focus === 'phone' && st.inputFocus]}>
          <Text style={st.prefix}>🇮🇳 +91</Text>
          <TextInput
            value={d.phone}
            onChangeText={(v) => set({ phone: v.replace(/\D/g, '').slice(0, 10) })}
            placeholder="98765 43210"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
            style={st.phoneInput}
            onFocus={() => setFocus('phone')}
            onBlur={() => setFocus(null)}
          />
        </View>
        <Text style={[st.fieldLabel, { marginTop: 14 }]}>Gender</Text>
        <View style={st.row}>
          {GENDERS.map((g) => (
            <Chip key={g.value} label={g.label} icon={g.icon} selected={d.gender === g.value} onPress={() => set({ gender: g.value })} />
          ))}
        </View>
        <View style={st.stepRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.stepLabel}>Age</Text>
            <Text style={T.small}>years</Text>
          </View>
          <Stepper value={d.age} onChange={(age) => set({ age })} min={13} max={90} />
        </View>
        <View style={st.stepRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.stepLabel}>Height</Text>
            <Text style={T.small}>{cmToFtIn(d.heightCm)}</Text>
          </View>
          <Stepper value={d.heightCm} onChange={(heightCm) => set({ heightCm })} min={120} max={220} format={(v) => `${v} cm`} />
        </View>
      </Card>
    </View>
  );

  const goals = (
    <View key="goals">
      <Text style={st.sectionLabel}>Your goal</Text>
      {GOALS.map((g) => (
        <OptionCard key={g.value} emoji={g.emoji} title={g.title} subtitle={g.sub} selected={d.goal === g.value} onPress={() => setGoal(g.value)} />
      ))}

      {directional && (
        <Card style={{ marginTop: 4 }}>
          <View style={st.stepRow0}>
            <View style={{ flex: 1 }}>
              <Text style={st.stepLabel}>Target weight</Text>
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
          <Pressable
            onPress={() => {
              tap();
              router.push({ pathname: '/progress', params: { log: String(Date.now()) } });
            }}
            style={st.weighLink}>
            <Ionicons name="scale-outline" size={15} color={C.primaryDark} />
            <Text style={st.weighText}>Weight changed? Log a new weigh-in</Text>
          </Pressable>

          <Text style={[st.fieldLabel, { marginTop: 16 }]}>Weekly pace</Text>
          <View style={st.row}>
            {PACES.map((v) => (
              <Chip key={v} label={`${v} kg`} selected={d.pace === v} onPress={() => set({ pace: v })} />
            ))}
          </View>
          <Text style={[T.small, { marginTop: 8 }]}>{paceHint(d.pace)}</Text>
        </Card>
      )}

      <Text style={st.sectionLabel}>Activity level</Text>
      {ACTIVITY.map((a) => (
        <OptionCard key={a.value} emoji={a.emoji} title={a.title} subtitle={a.sub} selected={d.activity === a.value} onPress={() => set({ activity: a.value })} />
      ))}

      {/* Live preview */}
      <LinearGradient colors={[C.primary, '#0B8C62']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.preview}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={st.pvLabel}>YOUR NEW PLAN · LIVE PREVIEW</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 8 }}>
          <Text style={st.pvBudget}>{fmtNum(preview.budget)}</Text>
          <Text style={st.pvUnit}>kcal / day</Text>
        </View>
        <Text style={st.pvDelta}>{delta === 0 ? 'Same as your current budget' : `${delta > 0 ? '▲' : '▼'} ${fmtNum(Math.abs(delta))} kcal vs current ${fmtNum(current.budget)}`}</Text>
        <View style={st.pvMacros}>
          <PvMacro label="Protein" value={preview.protein} />
          <PvMacro label="Carbs" value={preview.carbs} />
          <PvMacro label="Fat" value={preview.fat} />
          <PvMacro label="Steps" value={preview.stepGoal} unit="" />
        </View>
        <View style={st.pvGoal}>
          <Ionicons name="flag" size={16} color={C.white} />
          <View style={{ flex: 1 }}>
            <Text style={st.pvGoalTitle}>{summary.title}</Text>
            {directional && preview.weeks > 0 && <Text style={st.pvGoalSub}>Estimated goal date {fmtFull(preview.goalDate)}</Text>}
          </View>
        </View>
      </LinearGradient>
    </View>
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
            <Text style={T.tiny}>DAILY BUDGET</Text>
            <Text style={st.barValue}>
              {fmtNum(preview.budget)} <Text style={st.barUnit}>kcal</Text>
            </Text>
          </View>
          <Button title="Save changes" icon="checkmark" onPress={save} disabled={!d.name.trim()} style={{ flex: 1.4 }} />
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
        {unit}
      </Text>
      <Text style={st.pvMacroLbl}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 18, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: C.textSoft, marginBottom: 8 },
  input: { height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, fontSize: 16, color: C.text },
  inputFocus: { borderColor: C.primary },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prefix: { fontSize: 16, fontWeight: '600', color: C.text },
  phoneInput: { flex: 1, height: '100%', fontSize: 16, color: C.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  stepRow0: { flexDirection: 'row', alignItems: 'center' },
  stepLabel: { fontSize: 16, fontWeight: '700', color: C.text },
  weighLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  weighText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  preview: { borderRadius: R.lg, padding: 18, marginTop: 16 },
  pvLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  pvBudget: { color: C.white, fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  pvUnit: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 7 },
  pvDelta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  pvMacros: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  pvMacroVal: { color: C.white, fontSize: 16, fontWeight: '800' },
  pvMacroLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  pvGoal: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 12 },
  pvGoalTitle: { color: C.white, fontSize: 14, fontWeight: '700' },
  pvGoalSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft },
  barValue: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 2 },
  barUnit: { fontSize: 13, fontWeight: '600', color: C.muted },
});
