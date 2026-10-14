import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiTile, fmtNum, goBack, isDateKey, isMeal, MealChips, VegDot } from '@/components/food/shared';
import { Button, Chip, EmptyState, Header, IconButton, T, tap, useToast } from '@/components/ui';
import { FOOD_CATEGORIES, FOODS, foodById, mealLabel, POPULAR_IDS, type Food, type MealKey } from '@/data/foods';
import { currentMeal, relDay, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

type Cat = (typeof FOOD_CATEGORIES)[number];
// Hide the browser focus ring on react-native-web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export default function FoodSearchScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, addFood } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [meal, setMeal] = useState<MealKey>(isMeal(params.meal) ? params.meal : (currentMeal() as MealKey));
  const date = isDateKey(params.date) ? params.date : todayKey();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Cat>('All');
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [startIds] = useState(() => new Set(state.entries.map((e) => e.id)));

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      FOODS.filter(
        (f) => (cat === 'All' || f.category === cat) && (!q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.id.includes(q)),
      ),
    [q, cat],
  );
  const recent = useMemo(() => {
    const ids: string[] = [];
    for (let i = state.entries.length - 1; i >= 0 && ids.length < 5; i--) {
      const id = state.entries[i].foodId;
      if (!ids.includes(id) && foodById(id)) ids.push(id);
    }
    return ids.map((id) => foodById(id)!);
  }, [state.entries]);
  const popular = useMemo(() => POPULAR_IDS.map((id) => foodById(id)).filter(Boolean) as Food[], []);

  const session = state.entries.filter((e) => !startIds.has(e.id));
  const sessionKcal = session.reduce((a, e) => a + (foodById(e.foodId)?.kcal ?? 0) * e.qty, 0);

  const quickAdd = (f: Food) => {
    addFood(f.id, meal, 1, date);
    toast(`Added ${f.name} to ${mealLabel(meal)}`);
    setJustAdded((s) => ({ ...s, [f.id]: true }));
    timers.current.push(setTimeout(() => setJustAdded((s) => ({ ...s, [f.id]: false })), 1500));
  };
  const open = (f: Food) => router.push({ pathname: '/food/[id]', params: { id: f.id, meal, date } });

  const browsing = !q && cat === 'All';
  const row = (f: Food, i: number, list: Food[]) => (
    <FoodRow key={f.id} food={f} added={!!justAdded[f.id]} onAdd={() => quickAdd(f)} onPress={() => open(f)} last={i === list.length - 1} />
  );

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <Header
        title={`Add to ${mealLabel(meal)}`}
        right={<IconButton icon="camera-outline" onPress={() => router.push({ pathname: '/snap', params: { meal, date } })} />}
      />
      {date !== todayKey() && <Text style={st.dateNote}>Logging for {relDay(date)}</Text>}
      <MealChips value={meal} onChange={setMeal} style={{ flexGrow: 0, marginTop: 4 }} />

      <View style={st.searchWrap}>
        <Ionicons name="search" size={20} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search dal, roti, paneer, chai…"
          placeholderTextColor={C.muted}
          style={[st.input, webNoOutline]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!query && (
          <Pressable hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={C.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.cats} keyboardShouldPersistTaps="handled">
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} color={C.navy} style={{ height: 32 }} />
        ))}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {browsing ? (
            <>
              {recent.length > 0 && (
                <>
                  <Text style={[T.label, st.section]}>Recently logged</Text>
                  <View style={st.group}>{recent.map(row)}</View>
                </>
              )}
              <Text style={[T.label, st.section]}>Popular in India</Text>
              <View style={st.group}>{popular.map(row)}</View>
            </>
          ) : results.length ? (
            <>
              <Text style={[T.label, st.section]}>
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {cat !== 'All' ? ` in ${cat}` : ''}
              </Text>
              <View style={st.group}>{results.map(row)}</View>
            </>
          ) : (
            <EmptyState
              emoji="🔍"
              title={`No results for '${query.trim()}'`}
              text={cat !== 'All' ? `Nothing matched in ${cat}. Try "All" or snap a photo and let AI identify it.` : 'Try a different spelling, or snap a photo and let AI identify it.'}
              action="Snap it instead"
              onAction={() => router.push({ pathname: '/snap', params: { meal, date } })}
            />
          )}
        </ScrollView>

        <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={{ flex: 1 }}>
            {session.length ? (
              <>
                <Text style={st.footTitle}>
                  {session.length} item{session.length > 1 ? 's' : ''} added
                </Text>
                <Text style={T.tiny}>{fmtNum(sessionKcal)} kcal logged</Text>
              </>
            ) : (
              <Text style={T.small}>Tap + to quick-add 1 serving</Text>
            )}
          </View>
          <Button title="Done" small onPress={goBack} style={{ paddingHorizontal: 28 }} variant={session.length ? 'primary' : 'outline'} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function FoodRow({ food, added, onAdd, onPress, last }: { food: Food; added: boolean; onAdd: () => void; onPress: () => void; last: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [st.row, !last && st.rowBorder, pressed && { backgroundColor: C.bg }]}>
      <EmojiTile food={food} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <VegDot type={food.type} size={11} />
          <Text style={st.name} numberOfLines={1}>
            {food.name}
          </Text>
        </View>
        <Text style={st.unit} numberOfLines={1}>
          {food.unit} · <Text style={{ color: C.text, fontWeight: '700' }}>{food.kcal} kcal</Text>
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={() => {
          tap();
          onAdd();
        }}
        style={({ pressed }) => [st.plus, added && st.plusDone, pressed && { transform: [{ scale: 0.92 }] }]}>
        <Ionicons name={added ? 'checkmark' : 'add'} size={22} color={added ? C.white : C.primary} />
      </Pressable>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  dateNote: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: C.accent, marginTop: -4, marginBottom: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 50, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  input: { flex: 1, fontSize: 16, color: C.text, height: '100%' },
  cats: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { marginTop: 8, marginBottom: 8 },
  group: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  unit: { fontSize: 12, color: C.muted, marginTop: 3 },
  plus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  plusDone: { backgroundColor: C.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft },
  footTitle: { fontSize: 15, fontWeight: '800', color: C.text },
});
