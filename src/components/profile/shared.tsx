import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Dialog, Divider, ListRow, Pill, Segmented, Sheet, T, Toggle, tap, useToast, type IconName } from '@/components/ui';
import type { PlanTier } from '@/data/plans';
import { parseKey, round1, targets as calcTargets } from '@/lib/calc';
import { useStore, type Goal, type Profile, type Settings } from '@/lib/store';
import { BRAND, C, R } from '@/theme';

export type Targets = ReturnType<typeof calcTargets>;
export type Units = Settings['units'];

/* ---------- Formatting ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtFull = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString('en-IN');
export const fmtWeight = (kg: number, units: Units = 'kg') => (units === 'lb' ? `${Math.round(kg * 2.20462)} lb` : `${round1(kg)} kg`);
export const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return p;
};
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'F';
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';
/** Date the plan renews, from a `since` date key. */
export const planEnd = (since: string, months: number) => {
  const d = parseKey(since);
  d.setMonth(d.getMonth() + months);
  return d;
};

/* ---------- Domain options ---------- */

export const DIETS = [
  { value: 'Vegetarian', emoji: '🥦', sub: 'Plant foods plus dairy' },
  { value: 'Non-vegetarian', emoji: '🍗', sub: 'Includes chicken, fish, meat and eggs' },
  { value: 'Eggetarian', emoji: '🥚', sub: 'Vegetarian plus eggs' },
  { value: 'Vegan', emoji: '🌱', sub: 'No animal products at all' },
  { value: 'Jain', emoji: '🙏', sub: 'No root vegetables, onion or garlic' },
];

export type DietKind = 'veg' | 'vegan' | 'egg' | 'nonveg';
export const dietKind = (diet: string): DietKind => {
  const d = diet.toLowerCase();
  if (d.includes('vegan')) return 'vegan';
  if (d.includes('non')) return 'nonveg';
  if (d.includes('egg')) return 'egg';
  return 'veg';
};

export const CONDITIONS = ['Diabetes / Pre-diabetes', 'PCOS / PCOD', 'Thyroid', 'Hypertension (BP)', 'High cholesterol', 'Fatty liver'];
export const realConditions = (c: string[]) => c.filter((x) => x.toLowerCase() !== 'none');
export const realRestrictions = (r: string[]) => r.filter((x) => !x.toLowerCase().startsWith('no restriction'));

export const GOALS: { value: Goal; title: string; emoji: string; sub: string }[] = [
  { value: 'lose', title: 'Lose weight', emoji: '🔥', sub: 'Burn fat at a healthy, steady pace' },
  { value: 'maintain', title: 'Maintain weight', emoji: '⚖️', sub: 'Stay where you are, eat balanced' },
  { value: 'gain', title: 'Gain weight', emoji: '🍽️', sub: 'Add healthy weight with good food' },
  { value: 'muscle', title: 'Build muscle', emoji: '💪', sub: 'More protein, strength training' },
  { value: 'healthy', title: 'Get healthier', emoji: '🌿', sub: 'Better habits, more energy' },
];

export const ACTIVITY: { value: Profile['activity']; title: string; emoji: string; sub: string }[] = [
  { value: 'sedentary', title: 'Sedentary', emoji: '🪑', sub: 'Desk job, little movement' },
  { value: 'light', title: 'Lightly active', emoji: '🚶', sub: 'Light exercise 1–3 days a week' },
  { value: 'moderate', title: 'Moderately active', emoji: '🏃', sub: 'Exercise 3–5 days a week' },
  { value: 'very', title: 'Very active', emoji: '🔥', sub: 'Hard exercise 6–7 days a week' },
];

export const goalMeta = (g: Goal) => GOALS.find((x) => x.value === g) ?? GOALS[0];

/** One-line summary of the user's weight goal. */
export function goalSummary(p: Pick<Profile, 'goal' | 'weightKg' | 'targetKg' | 'pace'>, t: Targets, units: Units) {
  const diff = Math.abs(p.weightKg - p.targetKg);
  if (p.goal === 'maintain') return { title: `Maintain ${fmtWeight(p.weightKg, units)}`, sub: 'Balanced intake to hold your weight steady' };
  if (p.goal === 'healthy') return { title: 'Get healthier', sub: 'Better nutrition, more energy, steady habits' };
  if (t.weeks === 0) return { title: 'Goal weight reached 🎉', sub: `You're at ${fmtWeight(p.weightKg, units)} — set a new target` };
  const verb = p.goal === 'lose' ? 'Lose' : 'Gain';
  return {
    title: `${verb} ${fmtWeight(diff, units)} by ${fmtFull(t.goalDate)}`,
    sub: `${fmtWeight(p.weightKg, units)} → ${fmtWeight(p.targetKg, units)} · ${p.pace} kg/week · ${t.weeks} weeks`,
  };
}

/* ---------- Hooks ---------- */

export function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setShown(true));
    const b = Keyboard.addListener(hideEvt, () => setShown(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return shown;
}

/* ---------- Small components ---------- */

export const GOLD = ['#F7D774', '#E2A21B'] as const;
export const PREMIUM_BG = [C.navy, '#3B1E7A'] as const;

export function Avatar({ name, size = 68, premium }: { name: string; size?: number; premium?: boolean }) {
  return (
    <LinearGradient
      colors={premium ? GOLD : ([C.primary, '#0D9488'] as const)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: premium ? C.navy : C.white, fontSize: size * 0.36, fontWeight: '800' }}>{initials(name)}</Text>
    </LinearGradient>
  );
}

export function PlanBadge({ tier }: { tier?: PlanTier | null }) {
  if (!tier) return <Pill text="FREE PLAN" color={C.textSoft} bg={C.borderSoft} />;
  return (
    <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.badge}>
      <Ionicons name={tier === 'pro' ? 'diamond' : 'star'} size={11} color={C.navy} />
      <Text style={st.badgeText}>{tier === 'pro' ? 'PRO' : 'SMART'} MEMBER</Text>
    </LinearGradient>
  );
}

export function Accordion({ q, a, last }: { q: string; a: string; last?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={!last && st.accBorder}>
      <Pressable
        onPress={() => {
          tap();
          setOpen(!open);
        }}
        style={st.accHead}>
        <Text style={st.accQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
      </Pressable>
      {open && <Text style={st.accA}>{a}</Text>}
    </View>
  );
}

/* ---------- Settings sections (shared by Profile and Settings) ---------- */

type ReminderKey = 'mealReminders' | 'waterReminders' | 'weighInReminders';

export function RemindersCard() {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  const mt = state.profile.mealTimes;
  const rows: { key: ReminderKey; title: string; sub: string; icon: IconName; color: string; bg: string }[] = [
    { key: 'mealReminders', title: 'Meal reminders', sub: `${mt.breakfast} · ${mt.lunch} · ${mt.dinner}`, icon: 'restaurant-outline', color: C.primaryDark, bg: C.primarySoft },
    { key: 'waterReminders', title: 'Water reminders', sub: 'Every 2 hours, 9 AM – 9 PM', icon: 'water-outline', color: C.water, bg: C.waterSoft },
    { key: 'weighInReminders', title: 'Weekly weigh-in', sub: 'Every Monday at 7:30 AM', icon: 'scale-outline', color: C.weight, bg: '#E3F8F5' },
  ];
  const set = (r: (typeof rows)[number], v: boolean) => {
    updateSettings({ [r.key]: v } as Partial<Settings>);
    toast(`${r.title} ${v ? 'turned on' : 'turned off'}`, v ? 'notifications' : 'notifications-off');
  };
  return (
    <Card style={st.listCard}>
      {rows.map((r, i) => (
        <View key={r.key}>
          {i > 0 && <Divider style={st.inset} />}
          <ListRow
            icon={r.icon}
            iconColor={r.color}
            iconBg={r.bg}
            title={r.title}
            subtitle={r.sub}
            chevron={false}
            onPress={() => set(r, !state.settings[r.key])}
            right={<Toggle value={state.settings[r.key]} onChange={(v) => set(r, v)} />}
          />
        </View>
      ))}
    </Card>
  );
}

export const HEALTH_APP = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

export function ConnectedAppsCard() {
  const { state, updateProfile } = useStore();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const on = state.profile.healthSync;
  const toggle = (v: boolean) => {
    if (v) return setAsk(true);
    updateProfile({ healthSync: false });
    toast(`Disconnected from ${HEALTH_APP}`, 'unlink');
  };
  return (
    <Card style={st.listCard}>
      <ListRow
        icon={Platform.OS === 'ios' ? 'heart' : 'fitness'}
        iconColor={C.danger}
        iconBg={C.dangerSoft}
        title={HEALTH_APP}
        subtitle={on ? 'Connected · steps & workouts syncing' : 'Sync steps, workouts, sleep & weight'}
        chevron={false}
        onPress={() => toggle(!on)}
        right={<Toggle value={on} onChange={toggle} />}
      />
      {on && (
        <View style={st.syncRow}>
          <Ionicons name="checkmark-circle" size={15} color={C.primary} />
          <Text style={[T.tiny, { color: C.primaryDark }]}>Last synced just now</Text>
        </View>
      )}
      <Dialog
        visible={ask}
        icon="❤️"
        title={`“${BRAND}” would like to access ${HEALTH_APP}`}
        text="Allow Fitora to read your steps, workouts, sleep and weight, and to write your nutrition data."
        confirm="Allow"
        cancel="Don't allow"
        onCancel={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false);
          updateProfile({ healthSync: true });
          toast(`Connected to ${HEALTH_APP}`, 'link');
        }}
      />
    </Card>
  );
}

export function UnitsRow() {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  return (
    <ListRow
      icon="swap-horizontal"
      iconColor={C.workout}
      iconBg={C.workoutSoft}
      title="Units"
      subtitle="Body weight"
      right={
        <Segmented<Units>
          style={{ width: 116 }}
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={state.settings.units}
          onChange={(u) => {
            if (u === state.settings.units) return;
            updateSettings({ units: u });
            toast(`Weight now shown in ${u === 'kg' ? 'kilograms' : 'pounds'}`, 'swap-horizontal');
          }}
        />
      }
    />
  );
}

const HELP = [
  { q: 'How is my calorie budget calculated?', a: 'We use the Mifflin-St Jeor equation with your age, height, weight, gender and activity level, then adjust it for your goal and weekly pace. It updates automatically whenever these change.' },
  { q: 'How do I log food faster?', a: 'Tap the + button and choose Snap to photograph your plate, or search from 50+ Indian dishes. Portions use familiar units like katori, roti and plate.' },
  { q: 'Can I change my goal later?', a: 'Yes. Go to Profile → Edit goals. Your calorie budget, macros and goal date are recalculated instantly.' },
  { q: `How do I sync steps from ${HEALTH_APP}?`, a: `Turn on ${HEALTH_APP} under Connected apps. Steps and workouts then sync automatically in the background.` },
  { q: 'What do I get with Premium?', a: 'Smart unlocks unlimited Ria chats, Snap scans and personalised plans. Pro adds a dedicated nutritionist and personal trainer with weekly video check-ins.' },
];

export function HelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Help & FAQ" scroll>
      {HELP.map((h, i) => (
        <Accordion key={h.q} q={h.q} a={h.a} last={i === HELP.length - 1} />
      ))}
      <Button
        title="Still stuck? Ask Ria"
        icon="sparkles"
        variant="secondary"
        style={{ marginTop: 16 }}
        onPress={() => {
          onClose();
          setTimeout(() => router.push('/coach'), 250);
        }}
      />
    </Sheet>
  );
}

export function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="About & Privacy" scroll>
      <View style={st.aboutHead}>
        <LinearGradient colors={[C.primary, '#0D9488']} style={st.logo}>
          <Ionicons name="leaf" size={28} color={C.white} />
        </LinearGradient>
        <View>
          <Text style={T.h3}>{BRAND}</Text>
          <Text style={T.small}>Version 1.0.0 · demo build</Text>
        </View>
      </View>
      <Text style={st.aboutH}>About</Text>
      <Text style={T.body}>{BRAND} helps you eat better the Indian way — track meals in katoris and rotis, get coached by Ria, our AI nutritionist, and reach your goals with certified experts.</Text>
      <Text style={st.aboutH}>Your privacy</Text>
      <Text style={T.body}>This is a client demo. Everything you enter stays on this device — nothing is uploaded to a server, and no real payments are ever processed.</Text>
      <Text style={st.aboutH}>Health disclaimer</Text>
      <Text style={T.body}>{BRAND} is not a substitute for medical advice. Please consult your doctor before making major changes to your diet or exercise.</Text>
      <Text style={[T.tiny, { textAlign: 'center', marginTop: 20 }]}>Made with 💚 in India</Text>
    </Sheet>
  );
}

const st = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.navy, letterSpacing: 0.3 },
  accBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  accQ: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  accA: { fontSize: 14, color: C.textSoft, lineHeight: 20, paddingBottom: 14, marginTop: -4 },
  listCard: { paddingVertical: 4, paddingHorizontal: 12 },
  inset: { marginLeft: 52 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 52, paddingBottom: 10, marginTop: -4 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  logo: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aboutH: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 4 },
});

export const shared = st;
