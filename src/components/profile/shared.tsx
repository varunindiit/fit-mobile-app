import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Button, Card, Dialog, Divider, EASE_OUT, IconTile, layoutTransition, ListRow, nativeOnly, Pill, Segmented, Sheet, T, tap, Toggle, useToast, type IconName } from '@/components/ui';
import type { PlanTier } from '@/data/plans';
import { parseKey, round1, targets as calcTargets } from '@/lib/calc';
import { useStore, type Goal, type Profile, type Settings } from '@/lib/store';
import { BRAND, C, G, MOTION, R } from '@/theme';

const LOGO = require('@/assets/images/logo-mark.png');

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
  if (t.weeks === 0) return { title: 'Goal weight reached', sub: `You're at ${fmtWeight(p.weightKg, units)} — set a new target` };
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
/** Premium surfaces: all-black (profile header, paywall hero, premium banner, success). */
export const PREMIUM_BG = G.premium;

/** Icon for each goal (used instead of emoji in chrome). */
export const GOAL_ICON: Record<Goal, IconName> = { lose: 'flame', maintain: 'scale', gain: 'restaurant', muscle: 'barbell', healthy: 'leaf' };
/** Icon for each activity level. */
export const ACTIVITY_ICON: Record<Profile['activity'], IconName> = { sedentary: 'desktop-outline', light: 'walk', moderate: 'bicycle', very: 'flame' };

/** Soft tint of a hex colour (#RRGGBB + alpha) for icon tiles without a dedicated *Soft token. */
export const tint = (hex: string, alpha = '1F') => (hex.length === 7 ? hex + alpha : hex);

/** Small uppercase group label above a settings card. */
export function GroupLabel({ title, right, style }: { title: string; right?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[st.groupRow, style]}>
      <Text style={T.label}>{title}</Text>
      {right}
    </View>
  );
}

/** Decorative low-opacity rings for premium / hero gradients. Absolutely fills its parent. */
export function Decor({ color = C.white, accent = C.gold }: { color?: string; accent?: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMaxYMin slice">
        <Circle cx={372} cy={18} r={118} fill="none" stroke={color} strokeOpacity={0.07} strokeWidth={30} />
        <Circle cx={372} cy={18} r={182} fill="none" stroke={color} strokeOpacity={0.06} strokeWidth={1.5} />
        <Circle cx={292} cy={150} r={5} fill={accent} fillOpacity={0.55} />
        <Circle cx={22} cy={252} r={84} fill={color} fillOpacity={0.035} />
      </Svg>
    </View>
  );
}

/** Initials avatar. `ring` adds the brand (or gold, for premium) ring used on the profile header. */
export function Avatar({ name, size = 68, premium, ring }: { name: string; size?: number; premium?: boolean; ring?: boolean }) {
  if (!ring)
    return (
      <LinearGradient
        colors={premium ? GOLD : G.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: premium ? C.navy : C.onPrimary, fontSize: size * 0.36, fontWeight: '800' }}>{initials(name)}</Text>
      </LinearGradient>
    );
  const outer = size + 10;
  return (
    <View style={{ width: outer, height: outer }}>
      <LinearGradient colors={premium ? GOLD : G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.ring, { width: outer, height: outer, borderRadius: outer / 2 }]}>
        <View style={[st.ringGap, { width: size + 5, height: size + 5, borderRadius: (size + 5) / 2 }]}>
          <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: premium ? '#FFF4D6' : C.primarySoft }}>
            <Text style={{ color: premium ? '#8A5A00' : C.primaryDark, fontSize: size * 0.34, fontWeight: '800', letterSpacing: -0.5 }}>{initials(name)}</Text>
          </View>
        </View>
      </LinearGradient>
      {premium && (
        <LinearGradient colors={GOLD} style={st.ringBadge}>
          <Ionicons name="diamond" size={11} color={C.navy} />
        </LinearGradient>
      )}
    </View>
  );
}

export function PlanBadge({ tier }: { tier?: PlanTier | null }) {
  if (!tier) return <Pill text="FREE PLAN" icon="leaf-outline" color={C.textSoft} bg="#EEEDEB" />;
  return (
    <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.badge}>
      <Ionicons name={tier === 'pro' ? 'diamond' : 'sparkles'} size={11} color={C.navy} />
      <Text style={st.badgeText}>{tier === 'pro' ? 'PRO' : 'SMART'} MEMBER</Text>
    </LinearGradient>
  );
}

export function Accordion({ q, a, last }: { q: string; a: string; last?: boolean }) {
  const [open, setOpen] = useState(false);
  const rot = useSharedValue(0);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.get() * 180}deg` }] }));
  return (
    <Animated.View layout={layoutTransition} style={!last && st.accBorder}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          tap();
          rot.set(withTiming(open ? 0 : 1, { duration: MOTION.base, easing: EASE_OUT }));
          setOpen(!open);
        }}
        style={({ pressed }) => [st.accHead, pressed && { opacity: 0.7 }]}>
        <Text style={[st.accQ, open && { color: C.primaryDark }]}>{q}</Text>
        <Animated.View style={[st.accChevron, open && { backgroundColor: C.primarySoft }, chevron]}>
          <Ionicons name="chevron-down" size={16} color={open ? C.primaryDark : C.muted} />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.Text entering={nativeOnly(FadeInDown.duration(MOTION.base).withInitialValues({ transform: [{ translateY: -6 }] }))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} style={st.accA}>
          {a}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

/* ---------- Settings sections (shared by Profile and Settings) ---------- */

type ReminderKey = 'mealReminders' | 'waterReminders' | 'weighInReminders';

export function RemindersCard() {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  const mt = state.profile.mealTimes;
  const rows: { key: ReminderKey; title: string; sub: string; icon: IconName; color: string; bg: string }[] = [
    { key: 'mealReminders', title: 'Meal reminders', sub: `${mt.breakfast} · ${mt.lunch} · ${mt.dinner}`, icon: 'restaurant-outline', color: C.accent, bg: C.accentSoft },
    { key: 'waterReminders', title: 'Water reminders', sub: 'Every 2 hours, 9 AM – 9 PM', icon: 'water-outline', color: C.water, bg: C.waterSoft },
    { key: 'weighInReminders', title: 'Weekly weigh-in', sub: 'Every Monday at 7:30 AM', icon: 'scale-outline', color: C.weight, bg: C.weightSoft },
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
        <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} style={st.syncRow}>
          <View style={st.syncDot} />
          <Text style={[T.tiny, { color: C.primaryDark }]}>Last synced just now</Text>
        </Animated.View>
      )}
      <Dialog
        visible={ask}
        icon="❤️"
        title={`“${BRAND}” would like to access ${HEALTH_APP}`}
        text="Allow Fittelo to read your steps, workouts, sleep and weight, and to write your nutrition data."
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
      iconColor={C.steps}
      iconBg={C.stepsSoft}
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
  { q: 'What do I get with Premium?', a: 'Smart unlocks unlimited Saathi chats, Snap scans and personalised plans. Pro adds a dedicated nutritionist and personal trainer with weekly video check-ins.' },
];

export function HelpSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Help & FAQ" scroll>
      <View style={st.faqList}>
        {HELP.map((h, i) => (
          <Accordion key={h.q} q={h.q} a={h.a} last={i === HELP.length - 1} />
        ))}
      </View>
      <Button
        title="Still stuck? Ask Saathi"
        icon="sparkles"
        variant="secondary"
        style={st.askRia}
        textStyle={{ color: C.ai }}
        onPress={() => {
          onClose();
          setTimeout(() => router.push('/coach'), 250);
        }}
      />
    </Sheet>
  );
}

const ABOUT: { icon: IconName; color: string; bg: string; title: string; text: string }[] = [
  {
    icon: 'leaf',
    color: C.primaryDark,
    bg: C.primarySoft,
    title: 'About',
    text: `${BRAND} helps you eat better the Indian way — track meals in katoris and rotis, get coached by Saathi, our AI nutritionist, and reach your goals with certified experts.`,
  },
  {
    icon: 'lock-closed',
    color: C.protein,
    bg: tint(C.protein),
    title: 'Your privacy',
    text: 'This is a client demo. Everything you enter stays on this device — nothing is uploaded to a server, and no real payments are ever processed.',
  },
  {
    icon: 'medical',
    color: C.danger,
    bg: C.dangerSoft,
    title: 'Health disclaimer',
    text: `${BRAND} is not a substitute for medical advice. Please consult your doctor before making major changes to your diet or exercise.`,
  },
];

export function AboutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="About & Privacy" scroll>
      <View style={st.aboutHead}>
        <View style={st.logo}>
          <Image source={LOGO} style={{ width: 28, height: 28 }} contentFit="contain" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={T.h3}>{BRAND}</Text>
          <Pill text="VERSION 1.0.0 · DEMO BUILD" color={C.textSoft} bg="#EEEDEB" />
        </View>
      </View>
      {ABOUT.map((x) => (
        <View key={x.title} style={st.aboutItem}>
          <IconTile icon={x.icon} color={x.color} bg={x.bg} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={st.aboutH}>{x.title}</Text>
            <Text style={[T.small, { lineHeight: 20 }]}>{x.text}</Text>
          </View>
        </View>
      ))}
      <View style={st.madeWith}>
        <Text style={T.tiny}>Made with</Text>
        <Ionicons name="heart" size={12} color={C.primary} />
        <Text style={T.tiny}>in India</Text>
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10, marginLeft: 4, minHeight: 20 },
  ring: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ringGap: { backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  ringBadge: { position: 'absolute', right: 0, bottom: 2, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.card },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start', overflow: 'hidden' },
  badgeText: { fontSize: 11, fontWeight: '700', color: C.navy, letterSpacing: 0.4 },
  accBorder: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  accQ: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 21 },
  accChevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  accA: { fontSize: 14, color: C.textSoft, lineHeight: 21, paddingBottom: 16, paddingRight: 36, marginTop: -4 },
  listCard: { paddingVertical: 4, paddingHorizontal: 12 },
  inset: { marginLeft: 52 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 52, paddingBottom: 12, marginTop: -4 },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
  faqList: { backgroundColor: C.card },
  askRia: { marginTop: 18, backgroundColor: C.aiSoft, borderColor: C.aiBorder, borderWidth: 1 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  aboutItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  aboutH: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3, marginTop: 1 },
  madeWith: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 24 },
});

export const shared = st;
