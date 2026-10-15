import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Chip, nativeOnly, Ring, type IconName } from '@/components/ui';
import { MEALS, type Food, type MealKey } from '@/data/foods';
import { dateKey, parseKey, todayKey } from '@/lib/calc';
import { C, MOTION, R } from '@/theme';
import { Glyph } from '@/components/Glyph';
import { FOOD_ART } from '@/components/glyphs';

export const isMeal = (m?: string | string[]): m is MealKey => typeof m === 'string' && MEALS.some((x) => x.key === m);
/** A real calendar day in `YYYY-MM-DD` form (rejects e.g. 2025-02-31). */
export const isDateKey = (d?: string | string[]): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && dateKey(parseKey(d)) === d;
/** Food can't be logged in the future: later dates fall back to today. */
export const notFuture = (d: string, today = todayKey()) => (d > today ? today : d);

/** 1 → "1", 1.5 → "1.5", 0.25 → "0.25" */
export const fmtQty = (q: number) => String(Math.round(q * 100) / 100);
/** 1240.4 → "1,240" */
export const fmtNum = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export const scoreColor = (s: number) => (s >= 8 ? C.primary : s >= 5 ? C.warning : C.danger);
export const scoreBg = (s: number) => (s >= 8 ? C.primarySoft : s >= 5 ? C.warningSoft : C.dangerSoft);
export const scoreWord = (s: number) => (s >= 8 ? 'Healthy pick' : s >= 5 ? 'Moderate' : 'Indulgent');

export const TYPE_META: Record<Food['type'], { color: string; label: string }> = {
  veg: { color: '#16A34A', label: 'Vegetarian' },
  egg: { color: '#D97706', label: 'Contains egg' },
  nonveg: { color: '#B42318', label: 'Non-vegetarian' },
};

const CAT_BG: Record<Food['category'], string> = {
  Breakfast: '#FFF4E0',
  Meals: '#FDEEE6',
  'Breads & Rice': '#F7F0E3',
  Snacks: '#FFF2E8',
  Fruits: '#FDEEF1',
  Beverages: '#E8F4FB',
  Protein: '#ECF2FE',
  Sweets: '#FBECF4',
};
export const foodBg = (f: Food) => CAT_BG[f.category] ?? C.surfaceAlt;

export const MEAL_ICON = (k: MealKey) => (MEALS.find((m) => m.key === k)?.icon ?? 'restaurant-outline') as IconName;

/** Nutrition for a given quantity of a food. */
export const scaled = (f: Food, qty: number) => ({
  kcal: f.kcal * qty,
  protein: f.protein * qty,
  carbs: f.carbs * qty,
  fat: f.fat * qty,
  fiber: f.fiber * qty,
});

/** Indian-style veg / non-veg mark: square outline with a filled dot. */
export function VegDot({ type, size = 12, style }: { type: Food['type']; size?: number; style?: ViewStyle }) {
  const color = TYPE_META[type].color;
  return (
    <View style={[{ width: size, height: size, borderWidth: 1.5, borderColor: color, borderRadius: Math.max(2, size * 0.22), alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }, style]}>
      <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

export function EmojiTile({ food, size = 46 }: { food: Food; size?: number }) {
  return (
    <View style={[st.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: foodBg(food) }]}>
      <Glyph emoji={food.emoji} src={FOOD_ART[food.id]} size={Math.round(size * 0.7)} />
    </View>
  );
}

/** Horizontally scrolling meal picker. */
export function MealChips({ value, onChange, style, dark }: { value: MealKey; onChange: (m: MealKey) => void; style?: ViewStyle; dark?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={st.chips} keyboardShouldPersistTaps="handled">
      {MEALS.map((m) => (
        <Chip
          key={m.key}
          label={m.label}
          icon={m.icon as IconName}
          selected={value === m.key}
          onPress={() => onChange(m.key)}
          color={dark ? C.navy : C.primaryDark}
        />
      ))}
    </ScrollView>
  );
}

export function MiniMacro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={st.miniMacro}>
      <View style={[st.miniDot, { backgroundColor: color }]} />
      <Text style={st.miniVal}>{Math.round(value)}g</Text>
      <Text style={st.miniLabel}>{label}</Text>
    </View>
  );
}

export function CheckMark({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <View style={[st.check, { width: size, height: size, borderRadius: size * 0.32 }, on && st.checkOn]}>
      {on && (
        <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
          <Ionicons name="checkmark" size={size * 0.68} color={C.white} />
        </Animated.View>
      )}
    </View>
  );
}

/** Health-score ring badge (score out of 10), coloured by band. */
export function ScoreRing({ score, size = 44, stroke }: { score: number; size?: number; stroke?: number }) {
  const color = scoreColor(score);
  return (
    <Ring size={size} stroke={stroke ?? Math.max(3, Math.round(size * 0.09))} value={score / 10} color={color} track={scoreBg(score)}>
      <Text style={{ fontSize: Math.round(size * 0.34), fontWeight: '800', color, fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}>{score}</Text>
    </Ring>
  );
}

/** Saathi (AI) note: mint fill, tinted hairline, sparkles. One style everywhere AI speaks. */
export function RiaNote({ title = "Saathi's insight", text, children, style }: { title?: string; text?: string; children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[st.ria, style]}>
      <View style={st.riaHead}>
        <View style={st.riaIcon}>
          <Ionicons name="sparkles" size={13} color={C.ai} />
        </View>
        <Text style={st.riaTitle}>{title}</Text>
      </View>
      {!!text && <Text style={st.riaText}>{text}</Text>}
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(28,25,23,0.04)' },
  chips: { gap: 8, paddingHorizontal: 16 },
  miniMacro: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniDot: { width: 7, height: 7, borderRadius: 4 },
  miniVal: { fontSize: 13, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  miniLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  check: { borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  ria: { backgroundColor: C.aiSoft, borderRadius: R.lg, borderWidth: 1, borderColor: C.aiBorder, padding: 14 },
  riaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riaIcon: { width: 26, height: 26, borderRadius: 9, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.aiBorder },
  riaTitle: { fontSize: 13, fontWeight: '700', color: C.ai, letterSpacing: 0.1 },
  riaText: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 8 },
});
