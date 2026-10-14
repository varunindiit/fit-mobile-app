import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fmtNum, fmtQty, foodBg, goBack, isDateKey, isMeal, MealChips, scaled, scoreBg, scoreColor, scoreWord, TYPE_META, VegDot } from '@/components/food/shared';
import { Button, Card, Chip, Dialog, Divider, EmptyState, Header, Pill, ProgressBar, Ring, Screen, Stepper, T, tap, useToast } from '@/components/ui';
import { foodById, mealLabel, type Food, type MealKey } from '@/data/foods';
import { currentMeal, relDay, round1, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore } from '@/lib/store';
import { C, R } from '@/theme';

const QUICK = [0.5, 1, 1.5, 2, 3];

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

  const eaten = useMemo(() => dayTotals(state.entries, date).total.kcal, [state.entries, date]);
  const burned = burnedOn(state, date).total;

  if (!food)
    return (
      <Screen>
        <Header title="Food" />
        <EmptyState emoji="🍽️" title="Food not found" text="We couldn't find this item. It may have been removed from the database." action="Go back" onAction={goBack} />
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
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Card style={st.hero}>
          <View style={[st.emojiCircle, { backgroundColor: foodBg(food) }]}>
            <Text style={{ fontSize: 58 }}>{food.emoji}</Text>
          </View>
          <Text style={[T.h2, { textAlign: 'center', marginTop: 12 }]}>{food.name}</Text>
          <Text style={[T.small, { marginTop: 4 }]}>
            {food.unit} · {food.kcal} kcal
          </Text>
          <View style={st.badges}>
            <View style={[st.badge, { borderColor: tm.color + '40' }]}>
              <VegDot type={food.type} size={11} />
              <Text style={[st.badgeText, { color: tm.color }]}>{tm.label}</Text>
            </View>
            <View style={[st.badge, { backgroundColor: scoreBg(food.score), borderColor: 'transparent' }]}>
              <Ionicons name="heart" size={12} color={scoreColor(food.score)} />
              <Text style={[st.badgeText, { color: scoreColor(food.score) }]}>
                {food.score}/10 · {scoreWord(food.score)}
              </Text>
            </View>
            <View style={[st.badge, { backgroundColor: C.bg, borderColor: 'transparent' }]}>
              <Text style={[st.badgeText, { color: C.textSoft }]}>{food.category}</Text>
            </View>
          </View>
          {date !== todayKey() && <Pill text={`Logging for ${relDay(date)}`} icon="calendar-outline" color={C.accent} bg={C.accentSoft} style={{ alignSelf: 'center', marginTop: 12 }} />}
        </Card>

        <View style={st.tip}>
          <View style={st.tipIcon}>
            <Ionicons name="sparkles" size={16} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.tipTitle}>Ria's insight</Text>
            <Text style={st.tipText}>{insight(food)}</Text>
          </View>
        </View>

        {/* Quantity */}
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

        {/* Meal */}
        <Text style={[T.label, { marginTop: 18, marginBottom: 10 }]}>{isEdit ? 'Meal' : 'Add to'}</Text>
        <MealChips value={meal} onChange={setMeal} style={{ marginHorizontal: -16 }} />

        {/* Nutrition */}
        <Card style={[st.card, { marginTop: 18 }]}>
          <View style={st.nutTop}>
            <Ring size={108} stroke={10} value={n.kcal / targets.budget} color={budgetPct > 40 ? C.accent : C.primary}>
              <Text style={st.kcal}>{fmtNum(n.kcal)}</Text>
              <Text style={T.tiny}>kcal</Text>
            </Ring>
            <View style={{ flex: 1, gap: 10 }}>
              {macros.map((m) => (
                <View key={m.key} style={st.macroRow}>
                  <View style={[st.dot, { backgroundColor: m.color }]} />
                  <Text style={st.macroLabel}>{m.label}</Text>
                  <Text style={st.macroG}>{round1(m.g)} g</Text>
                  <Text style={st.macroPct}>{Math.round(m.pct * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={st.split}>
            {macros.map((m) => (m.pct > 0 ? <View key={m.key} style={{ flex: m.pct, backgroundColor: m.color }} /> : null))}
            {calSum <= 1 && <View style={{ flex: 1, backgroundColor: C.borderSoft }} />}
          </View>
          <Text style={[T.tiny, { marginTop: 6 }]}>Share of calories from carbs, protein and fat</Text>

          <Divider style={{ marginVertical: 14 }} />
          <View style={st.fibreRow}>
            <View style={[st.dot, { backgroundColor: C.fiber }]} />
            <Text style={st.macroLabel}>Fibre</Text>
            <Text style={st.macroG}>{round1(n.fiber)} g</Text>
            <Text style={st.macroPct}>{Math.round((n.fiber / targets.fiber) * 100)}% of goal</Text>
          </View>
          <ProgressBar value={n.fiber / targets.fiber} color={C.fiber} height={6} style={{ marginTop: 8 }} />

          <Pressable
            onPress={() => {
              tap();
              setMore((m) => !m);
            }}
            style={st.moreBtn}>
            <Text style={st.moreText}>{more ? 'Hide nutrients' : 'More nutrients'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.primary} style={{ transform: [{ rotate: more ? '180deg' : '0deg' }] }} />
          </Pressable>
          {more && (
            <View style={{ gap: 12, marginTop: 4 }}>
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
            </View>
          )}
        </Card>

        {/* Impact */}
        <View style={[st.impact, leftAfter < 0 && { backgroundColor: C.dangerSoft }]}>
          <Ionicons name={leftAfter < 0 ? 'warning' : 'pie-chart'} size={18} color={leftAfter < 0 ? C.danger : C.primaryDark} />
          <Text style={[st.impactText, leftAfter < 0 && { color: C.danger }]}>
            Uses {budgetPct}% of your daily budget ·{' '}
            {leftAfter >= 0 ? `${fmtNum(leftAfter)} kcal left after this` : `${fmtNum(-leftAfter)} kcal over after this`}
          </Text>
        </View>
      </ScrollView>

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

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  hero: { alignItems: 'center', paddingVertical: 22, marginTop: 4 },
  emojiCircle: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: R.pill, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  tip: { flexDirection: 'row', gap: 12, backgroundColor: '#FEF7E6', borderRadius: R.md, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#FCE7B2' },
  tipIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  tipText: { fontSize: 13, color: '#78350F', marginTop: 2, lineHeight: 19 },
  card: { marginTop: 14 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 14 },
  quickChip: { flex: 1, justifyContent: 'center', paddingHorizontal: 0 },
  nutTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  kcal: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fibreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { flex: 1, fontSize: 14, color: C.textSoft, fontWeight: '600' },
  macroG: { fontSize: 14, fontWeight: '800', color: C.text },
  macroPct: { minWidth: 38, textAlign: 'right', fontSize: 12, color: C.muted, fontWeight: '600' },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 16, gap: 2 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8, borderRadius: R.sm, backgroundColor: C.primarySoft },
  moreText: { fontSize: 14, fontWeight: '700', color: C.primary },
  microRow: { flexDirection: 'row', alignItems: 'center' },
  microLabel: { flex: 1, fontSize: 13, color: C.textSoft, fontWeight: '600' },
  microVal: { fontSize: 13, fontWeight: '700', color: C.text },
  microPct: { width: 44, textAlign: 'right', fontSize: 12, color: C.muted, fontWeight: '600' },
  impact: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.primarySoft, borderRadius: R.md, padding: 14, marginTop: 14 },
  impactText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.primaryDark, lineHeight: 19 },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft },
});
