import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmojiTile, fmtNum, fmtQty, isDateKey, MiniMacro } from '@/components/food/shared';
import { Button, Card, Divider, IconButton, MacroBar, Pill, Ring, Screen, T, tap, useToast, type IconName } from '@/components/ui';
import { foodById, MEALS, mealLabel, type MealKey } from '@/data/foods';
import { addDays, currentMeal, dayShort, fmtDate, parseKey, relDay, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore, type FoodEntry } from '@/lib/store';
import { C, R, shadow } from '@/theme';

const dayTitle = (k: string) => {
  const r = relDay(k);
  return r === 'Today' || r === 'Yesterday' || r === 'Tomorrow' ? `${r}, ${fmtDate(k)}` : r;
};

export default function DiaryScreen() {
  const { state, targets, removeFood, addFood } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = todayKey();
  const [date, setDate] = useState(isDateKey(params.date) ? params.date : today);
  const [collapsed, setCollapsed] = useState<Partial<Record<MealKey, boolean>>>({});
  const [undo, setUndo] = useState<FoodEntry | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isDateKey(params.date)) setDate(params.date);
  }, [params.date]);
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const { total, byMeal } = useMemo(() => dayTotals(state.entries, date), [state.entries, date]);
  const dayEntries = useMemo(() => state.entries.filter((e) => e.date === date), [state.entries, date]);
  const prevDate = addDays(date, -1);
  const prevEntries = useMemo(() => state.entries.filter((e) => e.date === prevDate), [state.entries, prevDate]);
  const burned = burnedOn(state, date).total;
  const goal = targets.budget + burned;
  const remaining = Math.round(goal - total.kcal);
  const over = remaining < 0;

  const weekStart = addDays(date, -((parseKey(date).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const loggedDays = useMemo(() => new Set(state.entries.map((e) => e.date)), [state.entries]);

  const remove = (e: FoodEntry) => {
    removeFood(e.id);
    setUndo(e);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
  };
  const restore = () => {
    if (!undo) return;
    tap();
    addFood(undo.foodId, undo.meal, undo.qty, undo.date);
    toast(`Restored ${foodById(undo.foodId)?.name ?? 'item'}`, 'arrow-undo');
    setUndo(null);
  };
  const copyPrev = () => {
    prevEntries.forEach((e) => addFood(e.foodId, e.meal, e.qty, date));
    const kcal = prevEntries.reduce((a, e) => a + (foodById(e.foodId)?.kcal ?? 0) * e.qty, 0);
    toast(`Copied ${prevEntries.length} items · ${fmtNum(kcal)} kcal`, 'copy');
  };
  const addTo = (meal: MealKey) => router.push({ pathname: '/food-search', params: { meal, date } });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={st.top}>
          <IconButton icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={T.h1}>Food Diary</Text>
            <Text style={[T.small, { marginTop: 2 }]}>{dayTitle(date)}</Text>
          </View>
          {date !== today && (
            <Pressable
              onPress={() => {
                tap();
                setDate(today);
              }}
              style={st.todayBtn}>
              <Text style={st.todayBtnText}>Today</Text>
            </Pressable>
          )}
          <IconButton icon="calendar-outline" onPress={() => setDate(today)} />
        </View>

        {/* Week strip */}
        <Card style={st.weekCard}>
          <View style={st.weekHead}>
            <IconButton icon="chevron-back" size={18} bg={C.bg} onPress={() => setDate(addDays(date, -7))} />
            <Text style={st.weekLabel}>
              {fmtDate(week[0])} – {fmtDate(week[6])}
            </Text>
            <IconButton icon="chevron-forward" size={18} bg={C.bg} onPress={() => setDate(addDays(date, 7))} />
          </View>
          <View style={st.weekRow}>
            {week.map((d) => {
              const sel = d === date;
              const isToday = d === today;
              return (
                <Pressable
                  key={d}
                  onPress={() => {
                    tap();
                    setDate(d);
                  }}
                  style={[st.day, sel && st.daySel]}>
                  <Text style={[st.dayName, sel && { color: 'rgba(255,255,255,0.85)' }]}>{dayShort(d)}</Text>
                  <Text style={[st.dayNum, sel && { color: C.white }, d > today && !sel && { color: C.muted }]}>{parseKey(d).getDate()}</Text>
                  <View style={[st.dayDot, isToday ? { backgroundColor: sel ? C.white : C.accent } : loggedDays.has(d) ? { backgroundColor: sel ? 'rgba(255,255,255,0.6)' : C.primary + '55' } : null]} />
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Summary */}
        <Card style={st.summary}>
          <View style={st.ringRow}>
            <Stat icon="restaurant" color={C.primary} label="Eaten" value={total.kcal} />
            <Ring size={140} stroke={12} value={over ? 1 : total.kcal / goal} color={over ? C.danger : C.primary}>
              <Text style={[st.ringNum, over && { color: C.danger }]}>{fmtNum(Math.abs(remaining))}</Text>
              <Text style={[st.ringLbl, over && { color: C.danger }]}>{over ? 'kcal over' : 'kcal left'}</Text>
            </Ring>
            <Stat icon="flame" color={C.steps} label="Burned" value={burned} />
          </View>
          {over ? (
            <View style={st.overBox}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={st.overText}>
                {fmtNum(-remaining)} kcal over budget. A 30 min brisk walk burns ~140 kcal.
              </Text>
            </View>
          ) : (
            <Text style={st.budgetLine}>
              Budget {fmtNum(targets.budget)} kcal{burned ? ` + ${fmtNum(burned)} burned` : ''}
            </Text>
          )}
          <Divider style={{ marginVertical: 14 }} />
          <View style={st.macros}>
            <MacroBar label="Carbs" value={total.carbs} target={targets.carbs} color={C.carbs} />
            <MacroBar label="Protein" value={total.protein} target={targets.protein} color={C.protein} />
            <MacroBar label="Fat" value={total.fat} target={targets.fat} color={C.fat} />
            <MacroBar label="Fibre" value={total.fiber} target={targets.fiber} color={C.fiber} />
          </View>
        </Card>

        {/* Snap promo */}
        <Pressable
          onPress={() => {
            tap();
            router.push({ pathname: '/snap', params: date === today ? { meal: currentMeal(), date } : { date } });
          }}
          style={({ pressed }) => [st.snap, pressed && { transform: [{ scale: 0.985 }] }]}>
          <View style={st.snapIcon}>
            <Ionicons name="camera" size={22} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={st.snapTitle}>Snap your meal</Text>
              <Pill text="AI" color={C.navy} bg={C.gold} />
            </View>
            <Text style={st.snapSub}>Click a photo, we'll log the calories for you</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Copy previous day */}
        {dayEntries.length === 0 && prevEntries.length > 0 && (
          <Card style={st.copyCard}>
            <Text style={{ fontSize: 26 }}>🗓️</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.copyTitle}>Nothing logged {date === today ? 'today' : 'on this day'} yet</Text>
              <Text style={T.small}>Ate the same as {['Today', 'Yesterday'].includes(relDay(prevDate)) ? relDay(prevDate).toLowerCase() : `on ${fmtDate(prevDate)}`}?</Text>
            </View>
            <Button title={`Copy ${prevEntries.length}`} icon="copy-outline" small variant="secondary" onPress={copyPrev} />
          </Card>
        )}

        {/* Meals */}
        {MEALS.map((m) => {
          const entries = dayEntries.filter((e) => e.meal === m.key);
          const t = byMeal[m.key];
          const kcal = t?.kcal ?? 0;
          const rec = Math.round((targets.budget * m.share) / 10) * 10;
          const isOpen = !collapsed[m.key];
          return (
            <Card key={m.key} style={st.meal}>
              <Pressable
                onPress={() => {
                  tap();
                  setCollapsed((c) => ({ ...c, [m.key]: isOpen }));
                }}
                style={st.mealHead}>
                <View style={[st.mealIcon, entries.length > 0 && { backgroundColor: C.primary }]}>
                  <Ionicons name={m.icon as IconName} size={20} color={entries.length > 0 ? C.white : C.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.mealTitle}>{m.label}</Text>
                  <Text style={st.mealSub}>
                    <Text style={{ color: kcal > rec * 1.15 ? C.danger : C.text, fontWeight: '700' }}>{fmtNum(kcal)}</Text> / {fmtNum(rec)} kcal
                    {entries.length > 0 ? ` · ${entries.length} item${entries.length > 1 ? 's' : ''}` : ''}
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    tap();
                    addTo(m.key);
                  }}
                  style={({ pressed }) => [st.addBtn, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="add" size={22} color={C.white} />
                </Pressable>
                <Ionicons name="chevron-down" size={18} color={C.muted} style={{ marginLeft: 8, transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
              </Pressable>

              {isOpen && (
                <View style={st.mealBody}>
                  <Divider />
                  {entries.length === 0 ? (
                    <View style={st.emptyMeal}>
                      <View style={{ flex: 1 }}>
                        <Text style={st.emptyTitle}>Nothing logged yet</Text>
                        <Text style={T.tiny}>Aim for about {fmtNum(rec)} kcal · usually {m.time}</Text>
                      </View>
                      <Button title="Add food" icon="add" small variant="secondary" onPress={() => addTo(m.key)} />
                    </View>
                  ) : (
                    <>
                      {entries.map((e) => {
                        const f = foodById(e.foodId);
                        if (!f) return null;
                        return (
                          <Pressable
                            key={e.id}
                            onPress={() => {
                              tap();
                              router.push({ pathname: '/food/[id]', params: { id: e.foodId, meal: e.meal, date, entryId: e.id } });
                            }}
                            style={({ pressed }) => [st.entry, pressed && { backgroundColor: C.bg }]}>
                            <EmojiTile food={f} size={40} />
                            <View style={{ flex: 1 }}>
                              <Text style={st.entryName} numberOfLines={1}>
                                {f.name}
                              </Text>
                              <Text style={T.tiny} numberOfLines={1}>
                                {fmtQty(e.qty)} × {f.unit}
                              </Text>
                            </View>
                            <Text style={st.entryKcal}>{fmtNum(f.kcal * e.qty)}</Text>
                            <Pressable
                              hitSlop={10}
                              onPress={() => {
                                tap();
                                remove(e);
                              }}
                              style={({ pressed }) => [st.trash, pressed && { backgroundColor: C.dangerSoft }]}>
                              <Ionicons name="trash-outline" size={17} color={C.muted} />
                            </Pressable>
                          </Pressable>
                        );
                      })}
                      {t && (
                        <View style={st.mealFoot}>
                          <MiniMacro label="Carbs" value={t.carbs} color={C.carbs} />
                          <MiniMacro label="Protein" value={t.protein} color={C.protein} />
                          <MiniMacro label="Fat" value={t.fat} color={C.fat} />
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </Card>
          );
        })}
        <Text style={st.footNote}>Tap an item to edit portion or meal · values are approximate</Text>
      </ScrollView>

      {undo && (
        <View style={st.undo}>
          <Ionicons name="trash" size={18} color={C.white} />
          <Text style={st.undoText} numberOfLines={1}>
            Removed {foodById(undo.foodId)?.name ?? 'item'} from {mealLabel(undo.meal)}
          </Text>
          <Pressable hitSlop={10} onPress={restore}>
            <Text style={st.undoBtn}>UNDO</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function Stat({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: number }) {
  return (
    <View style={st.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={st.statVal}>{fmtNum(value)}</Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, marginBottom: 14 },
  todayBtn: { paddingHorizontal: 12, height: 32, borderRadius: R.pill, backgroundColor: C.primarySoft, justifyContent: 'center' },
  todayBtnText: { color: C.primaryDark, fontWeight: '700', fontSize: 13 },
  weekCard: { padding: 12 },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  weekLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  weekRow: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R.md },
  daySel: { backgroundColor: C.primary },
  dayName: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase' },
  dayNum: { fontSize: 17, fontWeight: '800', color: C.text, marginTop: 4 },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4, backgroundColor: 'transparent' },
  summary: { marginTop: 14 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ringNum: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  ringLbl: { fontSize: 12, fontWeight: '600', color: C.muted },
  stat: { width: 72, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 18, fontWeight: '800', color: C.text },
  budgetLine: { textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 10 },
  overBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerSoft, borderRadius: R.sm, padding: 10, marginTop: 12 },
  overText: { flex: 1, fontSize: 12, color: C.danger, fontWeight: '600' },
  macros: { flexDirection: 'row', gap: 12 },
  snap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy, borderRadius: R.lg, padding: 14, marginTop: 14, ...shadow },
  snapIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  snapTitle: { color: C.white, fontSize: 16, fontWeight: '800' },
  snapSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  copyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  copyTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  meal: { marginTop: 12, padding: 0, overflow: 'hidden' },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  mealIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  mealTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  mealSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '500' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  mealBody: { paddingBottom: 4 },
  emptyMeal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.textSoft, marginBottom: 2 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  entryName: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  entryKcal: { fontSize: 14, fontWeight: '700', color: C.text },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mealFoot: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, borderTopWidth: 1, borderTopColor: C.borderSoft, marginTop: 4 },
  footNote: { textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 18 },
  undo: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.navy, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, ...shadow },
  undoText: { flex: 1, color: C.white, fontSize: 14, fontWeight: '600' },
  undoBtn: { color: C.gold, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});
