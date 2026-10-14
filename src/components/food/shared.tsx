import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Chip, type IconName } from '@/components/ui';
import { MEALS, type Food, type MealKey } from '@/data/foods';
import { C } from '@/theme';

export const isMeal = (m?: string | string[]): m is MealKey => typeof m === 'string' && MEALS.some((x) => x.key === m);
export const isDateKey = (d?: string | string[]): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** 1 → "1", 1.5 → "1.5", 0.25 → "0.25" */
export const fmtQty = (q: number) => String(Math.round(q * 100) / 100);
/** 1240.4 → "1,240" */
export const fmtNum = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export const scoreColor = (s: number) => (s >= 8 ? C.primary : s >= 5 ? C.carbs : C.danger);
export const scoreBg = (s: number) => (s >= 8 ? C.primarySoft : s >= 5 ? '#FEF3C7' : C.dangerSoft);
export const scoreWord = (s: number) => (s >= 8 ? 'Healthy pick' : s >= 5 ? 'Moderate' : 'Indulgent');

export const TYPE_META: Record<Food['type'], { color: string; label: string }> = {
  veg: { color: '#16A34A', label: 'Vegetarian' },
  egg: { color: '#D97706', label: 'Contains egg' },
  nonveg: { color: '#B42318', label: 'Non-vegetarian' },
};

const CAT_BG: Record<Food['category'], string> = {
  Breakfast: '#FFF4E0',
  Meals: '#FDECE3',
  'Breads & Rice': '#F6EEDF',
  Snacks: '#FFF1E6',
  Fruits: '#FDECEF',
  Beverages: '#E6F4FB',
  Protein: '#EAF1FE',
  Sweets: '#FBEAF3',
};
export const foodBg = (f: Food) => CAT_BG[f.category] ?? C.bg;

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
    <View style={[{ width: size, height: size, borderWidth: 1.5, borderColor: color, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

export function EmojiTile({ food, size = 46 }: { food: Food; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: foodBg(food), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{food.emoji}</Text>
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
          color={dark ? C.navy : C.primary}
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
    <View style={[st.check, { width: size, height: size, borderRadius: size * 0.3 }, on && st.checkOn]}>
      {on && <Ionicons name="checkmark" size={size * 0.68} color={C.white} />}
    </View>
  );
}

const st = StyleSheet.create({
  chips: { gap: 8, paddingHorizontal: 16 },
  miniMacro: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniVal: { fontSize: 13, fontWeight: '800', color: C.text },
  miniLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  check: { borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
});
