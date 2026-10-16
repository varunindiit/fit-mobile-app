import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiTile, fmtNum, goBack, isDateKey, isMeal, MealChips, notFuture, VegDot } from '@/components/food/shared';
import { Button, Chip, CountUp, EmptyState, enter, fadeEnter, Header, IconButton, nativeOnly, PressableScale, T, tap, useToast, type IconName } from '@/components/ui';
import { FOOD_CATEGORIES, FOODS, foodById, mealLabel, POPULAR_IDS, type Food, type MealKey } from '@/data/foods';
import { currentMeal, relDay, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, MOTION, R, shadow } from '@/theme';

type Cat = (typeof FOOD_CATEGORIES)[number];
// Hide the browser focus ring on react-native-web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

export default function FoodSearchScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { state, addFood, addRecentSearch, clearRecentSearches } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [meal, setMeal] = useState<MealKey>(isMeal(params.meal) ? params.meal : (currentMeal() as MealKey));
  const today = todayKey();
  const date = isDateKey(params.date) ? notFuture(params.date, today) : today;
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
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
  const favourites = useMemo(() => state.favoriteFoods.map((id) => foodById(id)).filter((f): f is Food => !!f), [state.favoriteFoods]);

  const session = state.entries.filter((e) => !startIds.has(e.id));
  const sessionKcal = session.reduce((a, e) => a + (foodById(e.foodId)?.kcal ?? 0) * e.qty, 0);

  /** Remember the query once the user commits to it (submit, open or add a result). */
  const rememberQuery = () => {
    if (query.trim()) addRecentSearch(query);
  };
  const quickAdd = (f: Food) => {
    rememberQuery();
    addFood(f.id, meal, 1, date);
    toast(`Added ${f.name} to ${mealLabel(meal)}`);
    setJustAdded((s) => ({ ...s, [f.id]: true }));
    timers.current.push(setTimeout(() => setJustAdded((s) => ({ ...s, [f.id]: false })), 1500));
  };
  const open = (f: Food) => {
    rememberQuery();
    router.push({ pathname: '/food/[id]', params: { id: f.id, meal, date } });
  };

  const browsing = !q && cat === 'All';
  const row = (f: Food, i: number, list: Food[]) => (
    <FoodRow key={f.id} food={f} added={!!justAdded[f.id]} onAdd={() => quickAdd(f)} onPress={() => open(f)} last={i === list.length - 1} />
  );

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <Header
        title={`Add to ${mealLabel(meal)}`}
        right={<IconButton icon="camera-outline" bordered onPress={() => router.push({ pathname: '/snap', params: { meal, date } })} />}
      />
      {date !== today && (
        <View style={st.dateNote}>
          <Ionicons name="calendar-outline" size={12} color={C.accent} />
          <Text style={st.dateNoteText}>Logging for {relDay(date)}</Text>
        </View>
      )}
      <MealChips value={meal} onChange={setMeal} style={{ flexGrow: 0, marginTop: 4 }} />

      <View style={[st.searchWrap, focused && st.searchFocus]}>
        <Ionicons name="search" size={19} color={focused ? C.primary : C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search dal, roti, paneer, chai…"
          placeholderTextColor={C.muted}
          style={[st.input, webNoOutline]}
          returnKeyType="search"
          onSubmitEditing={rememberQuery}
          autoCorrect={false}
          autoCapitalize="none"
          selectionColor={C.primary}
        />
        {!!query && (
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.fast))} exiting={nativeOnly(ZoomOut.duration(MOTION.fast))}>
            <Pressable hitSlop={10} onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={C.muted} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.cats} keyboardShouldPersistTaps="handled">
        {FOOD_CATEGORIES.map((c) => (
          <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} style={{ height: 34 }} />
        ))}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {browsing ? (
            <Animated.View key="browse" entering={fadeEnter()}>
              {state.recentSearches.length > 0 && (
                <Animated.View entering={enter(0)}>
                  <View style={st.sectionRow}>
                    <SectionLabel icon="search-outline" text="Recent searches" />
                    <Pressable hitSlop={10} onPress={clearRecentSearches} accessibilityRole="button" accessibilityLabel="Clear recent searches">
                      <Text style={st.clear}>Clear</Text>
                    </Pressable>
                  </View>
                  <View style={st.recentChips}>
                    {state.recentSearches.map((s) => (
                      <Chip key={s} label={s} icon="time-outline" onPress={() => setQuery(s)} style={{ height: 34 }} />
                    ))}
                  </View>
                </Animated.View>
              )}
              {favourites.length > 0 && (
                <Animated.View entering={enter(0)}>
                  <SectionLabel icon="heart-outline" text="Favourites" />
                  <View style={st.group}>{favourites.map(row)}</View>
                </Animated.View>
              )}
              {recent.length > 0 && (
                <Animated.View entering={enter(0)}>
                  <SectionLabel icon="time-outline" text="Recently logged" />
                  <View style={st.group}>{recent.map(row)}</View>
                </Animated.View>
              )}
              <Animated.View entering={enter(1)}>
                <SectionLabel icon="flame-outline" text="Popular in India" />
                <View style={st.group}>{popular.map(row)}</View>
              </Animated.View>
            </Animated.View>
          ) : results.length ? (
            <Animated.View key="results" entering={fadeEnter()}>
              <SectionLabel
                icon="search-outline"
                text={`${results.length} ${results.length === 1 ? 'result' : 'results'}${cat !== 'All' ? ` in ${cat}` : ''}`}
              />
              <View style={st.group}>{results.map(row)}</View>
            </Animated.View>
          ) : (
            <Animated.View key="empty" entering={fadeEnter()}>
              <EmptyState
                icon="search-outline"
                title={`No results for '${query.trim()}'`}
                text={cat !== 'All' ? `Nothing matched in ${cat}. Try "All" or snap a photo and let AI identify it.` : 'Try a different spelling, or snap a photo and let AI identify it.'}
                action="Snap it instead"
                onAction={() => router.push({ pathname: '/snap', params: { meal, date } })}
              />
            </Animated.View>
          )}
        </ScrollView>

        <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={{ flex: 1 }}>
            {session.length ? (
              <Animated.View key="added" entering={fadeEnter()} style={st.footRow}>
                <View style={st.footBadge}>
                  <Text style={st.footBadgeText}>{session.length}</Text>
                </View>
                <View>
                  <Text style={st.footTitle}>
                    item{session.length > 1 ? 's' : ''} added
                  </Text>
                  <CountUp value={sessionKcal} format={fmtNum} style={T.tiny}>
                    {' kcal logged'}
                  </CountUp>
                </View>
              </Animated.View>
            ) : (
              <Animated.View key="hint" entering={fadeEnter()}>
                <Text style={T.small}>Tap + to quick-add 1 serving</Text>
              </Animated.View>
            )}
          </View>
          <Button title="Done" small onPress={goBack} style={{ paddingHorizontal: 28 }} variant={session.length ? 'primary' : 'outline'} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionLabel({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={st.section}>
      <Ionicons name={icon} size={13} color={C.muted} />
      <Text style={T.label}>{text}</Text>
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
      style={({ pressed }) => [st.row, pressed && { backgroundColor: C.surfaceAlt }]}>
      <EmojiTile food={food} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <VegDot type={food.type} size={11} />
          <Text style={st.name} numberOfLines={1}>
            {food.name}
          </Text>
        </View>
        <Text style={st.unit} numberOfLines={1}>
          {food.unit} · <Text style={st.kcal}>{food.kcal} kcal</Text>
        </Text>
      </View>
      <AddButton
        added={added}
        onPress={() => {
          tap();
          onAdd();
        }}
      />
      {!last && <View style={st.sep} />}
    </Pressable>
  );
}

/** "+" that morphs into a filled check with a small pop when the item is added. */
function AddButton({ added, onPress }: { added: boolean; onPress: () => void }) {
  const p = useSharedValue(added ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    p.set(withTiming(added ? 1 : 0, { duration: MOTION.base }));
    if (added) pop.set(withSequence(withTiming(1.18, { duration: MOTION.fast }), withSpring(1, MOTION.pressSpring)));
  }, [added, p, pop]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.primarySoft, C.primary]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.primaryTint, C.primary]),
    transform: [{ scale: pop.get() }],
  }));
  const plus = useAnimatedStyle(() => ({ opacity: 1 - p.get(), transform: [{ rotate: `${p.get() * 90}deg` }, { scale: 1 - p.get() * 0.4 }] }));
  const check = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: interpolate(p.get(), [0, 1], [0.4, 1]) }] }));
  return (
    <PressableScale scaleTo={0.88} hitSlop={8} onPress={onPress} accessibilityRole="button" accessibilityLabel={added ? 'Added' : 'Quick add'}>
      <Animated.View style={[st.plus, box]}>
        <Animated.View style={[st.glyph, plus]}>
          <Ionicons name="add" size={22} color={C.primaryDark} />
        </Animated.View>
        <Animated.View style={[st.glyph, check]}>
          <Ionicons name="checkmark" size={20} color={C.onPrimary} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  dateNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, alignSelf: 'center', backgroundColor: C.accentSoft, paddingHorizontal: 10, height: 24, borderRadius: R.pill, marginTop: -2, marginBottom: 6 },
  dateNoteText: { fontSize: 12, fontWeight: '700', color: C.accent },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, height: 50, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  searchFocus: { borderColor: C.primary },
  input: { flex: 1, fontSize: 16, color: C.text, height: '100%' },
  cats: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 10, marginLeft: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { fontSize: 13, fontWeight: '700', color: C.primary, marginTop: -4 },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  group: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', marginBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, minHeight: 68 },
  sep: { position: 'absolute', left: 72, right: 0, bottom: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  unit: { fontSize: 12, color: C.muted, marginTop: 4 },
  kcal: { color: C.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  plus: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  glyph: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footBadge: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  footBadgeText: { fontSize: 14, fontWeight: '800', color: C.primaryDark, fontVariant: ['tabular-nums'] },
  footTitle: { fontSize: 15, fontWeight: '700', color: C.text },
});
