import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { fmtNum, fmtQty, foodBg, goBack, isDateKey, isMeal, MealChips, RiaNote, scaled, scoreColor, ScoreRing, scoreWord, TYPE_META, VegDot } from '@/components/food/shared';
import { Button, Card, Chip, CountUp, Dialog, Divider, EASE_OUT, EmptyState, enter, Header, Pill, PressableScale, ProgressBar, Ring, Screen, Stepper, T, tap, useToast } from '@/components/ui';
import { foodById, mealLabel, type Food, type MealKey } from '@/data/foods';
import { currentMeal, relDay, round1, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore } from '@/lib/store';
import { C, MOTION, R, shadowSm } from '@/theme';

const QUICK = [0.5, 1, 1.5, 2, 3];
const LIST = LinearTransition.duration(MOTION.base);

/** Demo micro-nutrients, derived deterministically from macros so they stay stable. */
function micros(f: Food, qty: number) {
  const salty = ['Meals', 'Snacks', 'Breakfast', 'Breads & Rice'].includes(f.category);
  const sweet = ['Sweets', 'Fruits', 'Beverages'].includes(f.category);
  return [
    { label: 'Sugar', value: f.carbs * (sweet ? 0.62 : 0.07) * qty, unit: 'g', dv: 25 },
    { label: 'Saturated fat', value: f.fat * 0.34 * qty, unit: 'g', dv: 20 },
    { label: 'Sodium', value: f.kcal * (salty ? 1.9 : 0.35) * qty, unit: 'mg', dv: 2000 },
    { label: 'Cholesterol', value: (f.type === 'egg' ? f.protein * 28 : f.type === 'nonveg' ? f.protein * 2.9 : f.fat * 0.9) * qty, unit: 'mg', dv: 300 },
    { label: 'Potassium', value: (f.carbs * 5.5 + f.protein * 9) * qty, unit: 'mg', dv: 3500 },
    { label: 'Calcium', value: (f.protein * 11 + f.fiber * 9) * qty, unit: 'mg', dv: 1000 },
    { label: 'Iron', value: (f.fiber * 0.42 + f.protein * 0.07) * qty, unit: 'mg', dv: 18 },
  ];
}

function insight(f: Food) {
  if (f.note) return f.note;
  const k = Math.max(f.kcal, 1);
  if ((f.protein * 4) / k >= 0.25) return 'Protein-rich choice. Helps you stay full for longer and supports muscle.';
  if (f.fiber >= 4) return 'High in fibre, great for digestion and steady energy levels.';
  if ((f.fat * 9) / k > 0.5) return 'Most of these calories come from fat. Keep the portion modest and pair with a salad.';
  if (f.score >= 8) return 'A wholesome pick that fits well in a balanced Indian diet.';
  return 'Balance this with a protein source like dal, curd or paneer and some veggies.';
}

export default function FoodDetailScreen() {
  const p = useLocalSearchParams<{ id: string; meal?: string; date?: string; entryId?: string }>();
  const { state, targets, addFood, updateFood, removeFood } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const food = foodById(String(p.id ?? ''));
  const entry = p.entryId ? state.entries.find((e) => e.id === p.entryId) : undefined;
  const [isEdit] = useState(!!entry);
  const [qty, setQty] = useState(entry?.qty ?? 1);
  const [meal, setMeal] = useState<MealKey>(entry?.meal ?? (isMeal(p.meal) ? p.meal : (currentMeal() as MealKey)));
  const [more, setMore] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const date = entry?.date ?? (isDateKey(p.date) ? p.date : todayKey());

  const eaten = dayTotals(state.entries, date).total.kcal;
  const burned = burnedOn(state, date).total;

  if (!food)
    return (
      <Screen>
        <Header title="Food" />
        <EmptyState icon="fast-food-outline" title="Food not found" text="We couldn't find this item. It may have been removed from the database." action="Go back" onAction={goBack} />
      </Screen>
    );

  const n = scaled(food, qty);
  const cal = { carbs: n.carbs * 4, protein: n.protein * 4, fat: n.fat * 9 };
  const calSum = cal.carbs + cal.protein + cal.fat || 1;
  const macros = [
    { key: 'carbs', label: 'Carbs', g: n.carbs, pct: cal.carbs / calSum, color: C.carbs },
    { key: 'protein', label: 'Protein', g: n.protein, pct: cal.protein / calSum, color: C.protein },
    { key: 'fat', label: 'Fat', g: n.fat, pct: cal.fat / calSum, color: C.fat },
  ];
  const base = isEdit && entry ? eaten - food.kcal * entry.qty : eaten;
  const leftAfter = Math.round(targets.budget + burned - base - n.kcal);
  const budgetPct = Math.round((n.kcal / targets.budget) * 100);
  const changed = !entry || qty !== entry.qty || meal !== entry.meal;
  const tm = TYPE_META[food.type];
  const sc = scoreColor(food.score);

  const add = () => {
    addFood(food.id, meal, qty, date);
    toast(`Added ${food.name} to ${mealLabel(meal)}`);
    goBack();
  };
  const save = () => {
    if (!entry) return add();
    updateFood(entry.id, { qty, meal });
    toast(`Updated ${food.name} · ${fmtQty(qty)} × in ${mealLabel(meal)}`);
    goBack();
  };
  const remove = () => {
    setConfirm(false);
    if (entry) removeFood(entry.id);
    toast(`Removed ${food.name}`, 'trash');
    setTimeout(goBack, 120);
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <Header title={isEdit ? 'Edit entry' : 'Food details'} />
      <Animated.ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View entering={enter(0)} style={[st.hero, { backgroundColor: foodBg(food) }]}>
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Circle cx="12%" cy="8%" r={70} fill={C.white} opacity={0.45} />
            <Circle cx="94%" cy="88%" r={92} fill={C.white} opacity={0.35} />
          </Svg>
          <View style={st.emojiTile}>
            <Text style={{ fontSize: 64 }}>{food.emoji}</Text>
          </View>
          <Text style={st.name}>{food.name}</Text>
          <Text style={st.unitLine}>
            {food.unit} · <Text style={{ color: C.text, fontWeight: '700' }}>{food.kcal} kcal</Text>
          </Text>
          <View style={st.badges}>
            <View style={st.badge}>
              <VegDot type={food.type} size={11} />
              <Text style={[st.badgeText, { color: tm.color }]}>{tm.label}</Text>
            </View>
            <View style={st.badge}>
              <Text style={[st.badgeText, { color: C.textSoft }]}>{food.category}</Text>
            </View>
          </View>
          {date !== todayKey() && <Pill text={`Logging for ${relDay(date)}`} icon="calendar-outline" color={C.accent} bg={C.card} style={{ alignSelf: 'center', marginTop: 12 }} />}
        </Animated.View>

        {/* Health score + Ria */}
        <Animated.View entering={enter(1)}>
          <RiaNote style={{ marginTop: 14 }}>
            <View style={st.scoreRow}>
              <ScoreRing score={food.score} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={st.scoreTitle}>
                  Health score <Text style={{ color: sc }}>{food.score}/10</Text>
                </Text>
                <Text style={[st.scoreWord, { color: sc }]}>{scoreWord(food.score)}</Text>
              </View>
              <Ionicons name="heart" size={18} color={sc} />
            </View>
            <View style={st.riaRule} />
            <Text style={st.riaText}>{insight(food)}</Text>
          </RiaNote>
        </Animated.View>

        {/* Quantity */}
        <Animated.View entering={enter(2)}>
          <Card style={st.card}>
            <View style={st.qtyRow}>
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>Quantity</Text>
                <Text style={[T.small, { marginTop: 2 }]} numberOfLines={1}>
                  × {food.unit}
                </Text>
              </View>
              <Stepper value={qty} onChange={setQty} step={0.5} min={0.5} max={10} format={fmtQty} />
            </View>
            <View style={st.quick}>
              {QUICK.map((v) => (
                <Chip key={v} label={`${fmtQty(v)}×`} selected={qty === v} onPress={() => setQty(v)} style={st.quickChip} />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Meal */}
        <Animated.View entering={enter(3)}>
          <Text style={[T.label, { marginTop: 22, marginBottom: 10 }]}>{isEdit ? 'Meal' : 'Add to'}</Text>
          <MealChips value={meal} onChange={setMeal} style={{ marginHorizontal: -16 }} />
        </Animated.View>

        {/* Nutrition */}
        <Animated.View entering={enter(4)} layout={LIST}>
          <Card style={[st.card, { marginTop: 22 }]}>
            <View style={st.cardHead}>
              <Text style={T.h3}>Nutrition</Text>
              <Text style={T.tiny}>
                {fmtQty(qty)} × serving
              </Text>
            </View>
            <View style={st.nutTop}>
              <Ring size={112} stroke={10} value={n.kcal / targets.budget} color={budgetPct > 40 ? C.accent : C.primary} track={budgetPct > 40 ? C.accentSoft : C.primarySoft}>
                <CountUp value={n.kcal} format={fmtNum} style={st.kcal} />
                <Text style={T.tiny}>kcal</Text>
              </Ring>
              <View style={{ flex: 1, gap: 12 }}>
                {macros.map((m) => (
                  <View key={m.key}>
                    <View style={st.macroRow}>
                      <View style={[st.dot, { backgroundColor: m.color }]} />
                      <Text style={st.macroLabel}>{m.label}</Text>
                      <Text style={st.macroG}>{round1(m.g)} g</Text>
                      <Text style={st.macroPct}>{Math.round(m.pct * 100)}%</Text>
                    </View>
                    <ProgressBar value={m.pct} color={m.color} height={4} style={{ marginTop: 6, marginLeft: 18 }} />
                  </View>
                ))}
              </View>
            </View>
            <View style={st.split}>
              {macros.map((m) => (m.pct > 0 ? <View key={m.key} style={{ flex: m.pct, backgroundColor: m.color }} /> : null))}
              {calSum <= 1 && <View style={{ flex: 1, backgroundColor: C.borderSoft }} />}
            </View>
            <Text style={[T.tiny, { marginTop: 8 }]}>Share of calories from carbs, protein and fat</Text>

            <Divider style={{ marginVertical: 16 }} />
            <View style={st.fibreRow}>
              <View style={[st.dot, { backgroundColor: C.fiber }]} />
              <Text style={st.macroLabel}>Fibre</Text>
              <Text style={st.macroG}>{round1(n.fiber)} g</Text>
              <Text style={st.macroPct}>{Math.round((n.fiber / targets.fiber) * 100)}% of goal</Text>
            </View>
            <ProgressBar value={n.fiber / targets.fiber} color={C.fiber} height={6} style={{ marginTop: 8 }} />

            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                tap();
                setMore((m) => !m);
              }}
              style={st.moreBtn}
              accessibilityRole="button"
              accessibilityState={{ expanded: more }}>
              <Text style={st.moreText}>{more ? 'Hide nutrients' : 'More nutrients'}</Text>
              <Chevron open={more} />
            </PressableScale>
            {more && (
              <Animated.View entering={FadeInDown.duration(MOTION.base).withInitialValues({ transform: [{ translateY: -6 }] })} exiting={FadeOutUp.duration(MOTION.fast)} style={{ gap: 12, marginTop: 6 }}>
                {micros(food, qty).map((m) => (
                  <View key={m.label}>
                    <View style={st.microRow}>
                      <Text style={st.microLabel}>{m.label}</Text>
                      <Text style={st.microVal}>
                        {m.value < 10 ? round1(m.value) : fmtNum(m.value)} {m.unit}
                      </Text>
                      <Text style={st.microPct}>{Math.round((m.value / m.dv) * 100)}%</Text>
                    </View>
                    <ProgressBar value={m.value / m.dv} color={C.primary} height={4} style={{ marginTop: 5 }} />
                  </View>
                ))}
                <Text style={T.tiny}>% of daily value · approximate values for a standard home recipe</Text>
              </Animated.View>
            )}
          </Card>
        </Animated.View>

        {/* Impact */}
        <Animated.View entering={enter(5)} layout={LIST} style={[st.impact, leftAfter < 0 && { backgroundColor: C.dangerSoft, borderColor: 'rgba(229,72,77,0.18)' }]}>
          <View style={[st.impactIcon, leftAfter < 0 && { backgroundColor: C.card }]}>
            <Ionicons name={leftAfter < 0 ? 'warning' : 'pie-chart'} size={17} color={leftAfter < 0 ? C.danger : C.primaryDark} />
          </View>
          <Text style={[st.impactText, leftAfter < 0 && { color: C.danger }]}>
            Uses {budgetPct}% of your daily budget ·{' '}
            {leftAfter >= 0 ? `${fmtNum(leftAfter)} kcal left after this` : `${fmtNum(-leftAfter)} kcal over after this`}
          </Text>
        </Animated.View>
      </Animated.ScrollView>

      {/* Action bar */}
      <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isEdit ? (
          <>
            <Button title="Remove" icon="trash-outline" variant="danger" onPress={() => setConfirm(true)} style={{ paddingHorizontal: 18 }} />
            <Button title={changed ? `Update · ${fmtNum(n.kcal)} kcal` : 'No changes'} icon="checkmark" disabled={!changed} onPress={save} style={{ flex: 1 }} />
          </>
        ) : (
          <Button title={`Add to ${mealLabel(meal)} · ${fmtNum(n.kcal)} kcal`} icon="add-circle" onPress={add} style={{ flex: 1 }} />
        )}
      </View>

      <Dialog
        visible={confirm}
        icon={food.emoji}
        title={`Remove ${food.name}?`}
        text={`This removes ${fmtQty(entry?.qty ?? qty)} × ${food.unit} from ${mealLabel(entry?.meal ?? meal)} (${relDay(date)}).`}
        confirm="Remove"
        cancel="Keep"
        danger
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

function Chevron({ open }: { open: boolean }) {
  const r = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    r.set(withTiming(open ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [open, r]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get() * 180}deg` }] }));
  return (
    <Animated.View style={spin}>
      <Ionicons name="chevron-down" size={16} color={C.primaryDark} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 26, paddingBottom: 20, paddingHorizontal: 16, marginTop: 4, borderRadius: R.xl, overflow: 'hidden' },
  emojiTile: { width: 124, height: 124, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', ...shadowSm },
  name: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.6, textAlign: 'center', marginTop: 16 },
  unitLine: { fontSize: 14, color: C.textSoft, marginTop: 4, textAlign: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: R.pill, backgroundColor: C.card },
  badgeText: { fontSize: 12, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  scoreTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  scoreWord: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  riaRule: { height: 1, backgroundColor: C.aiBorder, marginVertical: 12, opacity: 0.7 },
  riaText: { fontSize: 14, color: C.text, lineHeight: 20 },
  card: { marginTop: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 16 },
  quickChip: { flex: 1, justifyContent: 'center', paddingHorizontal: 0 },
  nutTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  kcal: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fibreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { flex: 1, fontSize: 14, color: C.textSoft, fontWeight: '600' },
  macroG: { fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  macroPct: { minWidth: 38, textAlign: 'right', fontSize: 12, color: C.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 18, gap: 2 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, height: 40, borderRadius: R.sm, backgroundColor: C.primarySoft },
  moreText: { fontSize: 14, fontWeight: '700', color: C.primaryDark },
  microRow: { flexDirection: 'row', alignItems: 'center' },
  microLabel: { flex: 1, fontSize: 13, color: C.textSoft, fontWeight: '600' },
  microVal: { fontSize: 13, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  microPct: { width: 44, textAlign: 'right', fontSize: 12, color: C.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  impact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primarySoft, borderRadius: R.md, padding: 12, marginTop: 14, borderWidth: 1, borderColor: C.primaryTint },
  impactIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  impactText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.primaryDark, lineHeight: 19 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
});
