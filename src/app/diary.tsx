import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EmojiTile, fmtNum, fmtQty, isDateKey, MiniMacro, notFuture } from '@/components/food/shared';
import { Button, Card, CountUp, Divider, EASE_OUT, enter, IconButton, IconTile, layoutTransition, MacroBar, nativeOnly, PressableScale, ProgressBar, Ring, Screen, T, tap, useToast, type IconName } from '@/components/ui';
import { foodById, MEALS, mealLabel, type MealKey } from '@/data/foods';
import { addDays, currentMeal, dayShort, fmtDate, parseKey, relDay } from '@/lib/calc';
import { burnedOn, dayTotals, useStore, type FoodEntry } from '@/lib/store';
import { useToday } from '@/lib/useToday';
import { C, G, MOTION, R, shadow, shadowLg, shadowSm } from '@/theme';

const dayTitle = (k: string) => {
  const r = relDay(k);
  return r === 'Today' || r === 'Yesterday' || r === 'Tomorrow' ? `${r}, ${fmtDate(k)}` : r;
};
const LIST = layoutTransition;

export default function DiaryScreen() {
  const { state, targets, removeFood, restoreFood, copyDay } = useStore();
  const toast = useToast();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = useToday();
  const [date, setDate] = useState(isDateKey(params.date) ? notFuture(params.date, today) : today);
  const [collapsed, setCollapsed] = useState<Partial<Record<MealKey, boolean>>>({});
  const [undo, setUndo] = useState<{ entry: FoodEntry; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedAt = useRef(0);

  // Follow a new `date` param (derived during render instead of a setState-in-effect).
  const [seenParam, setSeenParam] = useState(params.date);
  if (params.date !== seenParam) {
    setSeenParam(params.date);
    if (isDateKey(params.date)) setDate(notFuture(params.date, today));
  }
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const { total, byMeal } = useMemo(() => dayTotals(state.entries, date), [state.entries, date]);
  const dayEntries = useMemo(() => state.entries.filter((e) => e.date === date), [state.entries, date]);
  const prevDate = addDays(date, -1);
  const prevEntries = useMemo(() => state.entries.filter((e) => e.date === prevDate && foodById(e.foodId)), [state.entries, prevDate]);
  const burned = burnedOn(state, date).total;
  const goal = targets.budget + burned;
  const remaining = Math.round(goal - total.kcal);
  const over = remaining < 0;

  const weekStart = addDays(date, -((parseKey(date).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const loggedDays = useMemo(() => new Set(state.entries.map((e) => e.date)), [state.entries]);

  // Compact summary bar that slides in once the big summary card scrolls away.
  const scrollY = useSharedValue(0);
  const summaryEnd = useSharedValue(100000);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const compact = useAnimatedStyle(() => {
    const t = interpolate(scrollY.get(), [summaryEnd.get() - 48, summaryEnd.get()], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: (1 - t) * -10 }] };
  });

  const remove = (e: FoodEntry) => {
    const index = state.entries.findIndex((x) => x.id === e.id);
    if (index < 0) return;
    removeFood(e.id);
    setUndo({ entry: e, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
  };
  const restore = () => {
    if (!undo) return;
    tap();
    restoreFood(undo.entry, undo.index);
    toast(`Restored ${foodById(undo.entry.foodId)?.name ?? 'item'}`, 'arrow-undo');
    setUndo(null);
  };
  const copyPrev = () => {
    // copyDay is a no-op once the day has food; the short window also swallows a double tap's second toast.
    if (dayEntries.length > 0 || Date.now() - copiedAt.current < 1500) return;
    copiedAt.current = Date.now();
    copyDay(prevDate, date);
    const kcal = prevEntries.reduce((a, e) => a + (foodById(e.foodId)?.kcal ?? 0) * e.qty, 0);
    toast(`Copied ${prevEntries.length} items · ${fmtNum(kcal)} kcal`, 'copy');
  };
  const pickDay = useCallback((d: string) => {
    tap();
    setDate(d);
  }, []);
  const addTo = (meal: MealKey) => router.push({ pathname: '/food-search', params: { meal, date } });

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Title */}
      <View style={st.top}>
        <IconButton icon="arrow-back" bordered onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Food Diary</Text>
          <Text style={[T.small, { marginTop: 1 }]}>{dayTitle(date)}</Text>
        </View>
        {date !== today && (
          <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))}>
            <PressableScale
              scaleTo={0.94}
              onPress={() => {
                tap();
                setDate(today);
              }}
              style={st.todayBtn}>
              <Text style={st.todayBtnText}>Today</Text>
            </PressableScale>
          </Animated.View>
        )}
        <IconButton icon="calendar-outline" bordered onPress={() => setDate(today)} />
      </View>

      <View style={{ flex: 1 }}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          {/* Week strip */}
          <Animated.View entering={enter(0)}>
            <Card style={st.weekCard}>
              <View style={st.weekHead}>
                <IconButton icon="chevron-back" size={18} bg={C.surfaceAlt} style={st.weekNav} onPress={() => setDate(addDays(date, -7))} />
                <Text style={st.weekLabel}>
                  {fmtDate(week[0])} – {fmtDate(week[6])}
                </Text>
                <IconButton icon="chevron-forward" size={18} bg={C.surfaceAlt} style={st.weekNav} onPress={() => setDate(notFuture(addDays(date, 7), today))} />
              </View>
              <WeekPager
                week={week}
                date={date}
                today={today}
                logged={loggedDays}
                onPick={pickDay}
              />
            </Card>
          </Animated.View>

          {/* Summary */}
          <Animated.View entering={enter(1)} onLayout={(e) => summaryEnd.set(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
            <Card style={st.summary}>
              <View style={st.ringRow}>
                <Stat icon="restaurant" color={C.primaryDark} bg={C.primarySoft} label="Eaten" value={total.kcal} />
                <Ring
                  size={148}
                  stroke={13}
                  value={over ? 1 : total.kcal / goal}
                  color={over ? C.danger : C.primary}
                  track={over ? C.dangerSoft : C.borderSoft}
                  gradient={over ? undefined : G.brand}>
                  <CountUp value={Math.abs(remaining)} format={fmtNum} style={[st.ringNum, over && { color: C.danger }]} />
                  <Text style={[st.ringLbl, over && { color: C.danger }]}>{over ? 'kcal over' : 'kcal left'}</Text>
                </Ring>
                <Stat icon="flame" color={C.accent} bg={C.accentSoft} label="Burned" value={burned} />
              </View>
              {over ? (
                <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} style={st.overBox}>
                  <Ionicons name="alert-circle" size={16} color={C.danger} />
                  <Text style={st.overText}>{fmtNum(-remaining)} kcal over budget. A 30 min brisk walk burns ~140 kcal.</Text>
                </Animated.View>
              ) : (
                <Text style={st.budgetLine}>
                  Budget {fmtNum(targets.budget)} kcal{burned ? ` + ${fmtNum(burned)} burned` : ''}
                </Text>
              )}
              <Divider style={{ marginVertical: 16 }} />
              <View style={st.macros}>
                <MacroBar label="Carbs" value={total.carbs} target={targets.carbs} color={C.carbs} />
                <MacroBar label="Protein" value={total.protein} target={targets.protein} color={C.protein} />
                <MacroBar label="Fat" value={total.fat} target={targets.fat} color={C.fat} />
                <MacroBar label="Fibre" value={total.fiber} target={targets.fiber} color={C.fiber} />
              </View>
            </Card>
          </Animated.View>

          {/* Snap promo */}
          <Animated.View entering={enter(2)}>
            <PressableScale
              scaleTo={0.98}
              onPress={() => {
                tap();
                router.push({ pathname: '/snap', params: date === today ? { meal: currentMeal(), date } : { date } });
              }}
              style={st.snap}
              accessibilityRole="button">
              <View style={st.snapIcon}>
                <Ionicons name="camera" size={22} color={C.white} />
                <View style={st.snapSpark}>
                  <Ionicons name="sparkles" size={9} color={C.ai} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={st.snapTitle}>Snap your meal</Text>
                  <View style={st.aiTag}>
                    <Text style={st.aiTagText}>AI</Text>
                  </View>
                </View>
                <Text style={st.snapSub}>Click a photo, we&apos;ll log the calories for you</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </PressableScale>
          </Animated.View>

          {/* Copy previous day */}
          {dayEntries.length === 0 && prevEntries.length > 0 && (
            <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} layout={LIST}>
              <Card style={st.copyCard}>
                <IconTile icon="calendar-outline" color={C.primaryDark} bg={C.primarySoft} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={st.copyTitle}>Nothing logged {date === today ? 'today' : 'on this day'} yet</Text>
                  <Text style={T.small}>Ate the same as {['Today', 'Yesterday'].includes(relDay(prevDate)) ? relDay(prevDate).toLowerCase() : `on ${fmtDate(prevDate)}`}?</Text>
                </View>
                <Button title={`Copy ${prevEntries.length}`} icon="copy-outline" small variant="secondary" onPress={copyPrev} />
              </Card>
            </Animated.View>
          )}

          {/* Meals */}
          {MEALS.map((m, mi) => {
            const entries = dayEntries.filter((e) => e.meal === m.key && foodById(e.foodId));
            const t = byMeal[m.key];
            const kcal = t?.kcal ?? 0;
            const rec = Math.round((targets.budget * m.share) / 10) * 10;
            const isOpen = !collapsed[m.key];
            const has = entries.length > 0;
            return (
              <Animated.View key={m.key} entering={enter(3 + mi)} layout={LIST} style={st.meal}>
                <Pressable
                  onPress={() => {
                    tap();
                    setCollapsed((c) => ({ ...c, [m.key]: isOpen }));
                  }}
                  style={st.mealHead}
                  accessibilityState={{ expanded: isOpen }}>
                  <IconTile icon={m.icon as IconName} size={42} color={has ? C.white : C.primaryDark} bg={has ? C.primaryDark : C.primarySoft} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.mealTitle}>{m.label}</Text>
                    <Text style={st.mealSub}>
                      <Text style={{ color: kcal > rec * 1.15 ? C.danger : C.text, fontWeight: '700' }}>{fmtNum(kcal)}</Text> / {fmtNum(rec)} kcal
                      {has ? ` · ${entries.length} item${entries.length > 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                  <PressableScale
                    scaleTo={0.88}
                    hitSlop={8}
                    onPress={() => {
                      tap();
                      addTo(m.key);
                    }}
                    style={st.addBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${m.label}`}>
                    <Ionicons name="add" size={22} color={C.white} />
                  </PressableScale>
                  <Chevron open={isOpen} />
                </Pressable>
                <ProgressBar value={kcal / Math.max(1, rec)} color={kcal > rec * 1.15 ? C.danger : C.primary} height={3} track={C.borderSoft} style={st.mealBar} />

                {isOpen && (
                  <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.base).withInitialValues({ transform: [{ translateY: -6 }] }))} exiting={nativeOnly(FadeOutUp.duration(MOTION.fast))} layout={LIST} style={st.mealBody}>
                    {!has ? (
                      <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} style={st.emptyMeal}>
                        <View style={st.emptyIcon}>
                          <Ionicons name="add-circle-outline" size={20} color={C.muted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={st.emptyTitle}>Nothing logged yet</Text>
                          <Text style={T.tiny}>
                            Aim for about {fmtNum(rec)} kcal · usually {m.time}
                          </Text>
                        </View>
                        <Button title="Add food" icon="add" small variant="secondary" onPress={() => addTo(m.key)} />
                      </Animated.View>
                    ) : (
                      <>
                        {entries.map((e, i) => {
                          const f = foodById(e.foodId);
                          if (!f) return null;
                          return (
                            <Animated.View key={e.id} entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} layout={LIST}>
                              {i > 0 && <View style={st.entrySep} />}
                              <Pressable
                                onPress={() => {
                                  tap();
                                  router.push({ pathname: '/food/[id]', params: { id: e.foodId, meal: e.meal, date, entryId: e.id } });
                                }}
                                style={({ pressed }) => [st.entry, pressed && { backgroundColor: C.surfaceAlt }]}>
                                <EmojiTile food={f} size={42} />
                                <View style={{ flex: 1 }}>
                                  <Text style={st.entryName} numberOfLines={1}>
                                    {f.name}
                                  </Text>
                                  <Text style={T.tiny} numberOfLines={1}>
                                    {fmtQty(e.qty)} × {f.unit}
                                  </Text>
                                </View>
                                <Text style={st.entryKcal}>
                                  {fmtNum(f.kcal * e.qty)}
                                  <Text style={st.entryUnit}> kcal</Text>
                                </Text>
                                <Pressable
                                  hitSlop={10}
                                  onPress={() => {
                                    tap();
                                    remove(e);
                                  }}
                                  style={({ pressed }) => [st.trash, pressed && { backgroundColor: C.dangerSoft }]}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Remove ${f.name}`}>
                                  <Ionicons name="trash-outline" size={17} color={C.muted} />
                                </Pressable>
                              </Pressable>
                            </Animated.View>
                          );
                        })}
                        {t && (
                          <Animated.View layout={LIST} style={st.mealFoot}>
                            <MiniMacro label="Carbs" value={t.carbs} color={C.carbs} />
                            <MiniMacro label="Protein" value={t.protein} color={C.protein} />
                            <MiniMacro label="Fat" value={t.fat} color={C.fat} />
                          </Animated.View>
                        )}
                      </>
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}
          <Text style={st.footNote}>Tap an item to edit portion or meal · values are approximate</Text>
        </Animated.ScrollView>

        {/* Compact summary (appears when the summary card scrolls out of view) */}
        <Animated.View pointerEvents="none" style={[st.compact, compact]}>
          <View style={[st.compactDot, { backgroundColor: over ? C.danger : C.primary }]} />
          <Text style={[st.compactNum, over && { color: C.danger }]}>
            {fmtNum(Math.abs(remaining))} <Text style={st.compactUnit}>{over ? 'kcal over' : 'kcal left'}</Text>
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={st.compactMeta}>
            {fmtNum(total.kcal)} eaten · {fmtNum(burned)} burned
          </Text>
        </Animated.View>
      </View>

      {undo && (
        <Animated.View entering={nativeOnly(FadeInDown.duration(MOTION.base).easing(EASE_OUT))} exiting={nativeOnly(FadeOutDown.duration(MOTION.base))} style={st.undo}>
          <View style={st.undoIcon}>
            <Ionicons name="trash" size={15} color={C.white} />
          </View>
          <Text style={st.undoText} numberOfLines={1}>
            Removed {foodById(undo.entry.foodId)?.name ?? 'item'} from {mealLabel(undo.entry.meal)}
          </Text>
          <PressableScale hitSlop={10} scaleTo={0.92} onPress={restore} style={st.undoBtn} accessibilityRole="button">
            <Ionicons name="arrow-undo" size={14} color={C.gold} />
            <Text style={st.undoBtnText}>UNDO</Text>
          </PressableScale>
        </Animated.View>
      )}
    </Screen>
  );
}

/** Week strip that follows a horizontal swipe: left → next week, right → previous week (never into the future). */
function WeekPager({ week, date, today, logged, onPick }: { week: string[]; date: string; today: string; logged: Set<string>; onPick: (d: string) => void }) {
  const w = useSharedValue(0);
  const x = useSharedValue(0);
  const canNext = week[6] < today;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        // Rubber-band when there's no next week to go to.
        onPanResponderMove: (_, g) => x.set(g.dx < 0 && !canNext ? g.dx * 0.25 : g.dx),
        onPanResponderRelease: (_, g) => {
          const width = w.get();
          const dir = g.dx < -width / 4 || g.vx < -0.4 ? 1 : g.dx > width / 4 || g.vx > 0.4 ? -1 : 0;
          if (dir === 0 || (dir === 1 && !canNext)) {
            x.set(withSpring(0, MOTION.spring));
            return;
          }
          // Slide the old week out, swap the date, then slide the new week in from the other side.
          const next = notFuture(addDays(date, dir * 7), today);
          x.set(
            withTiming(-dir * width, { duration: MOTION.fast, easing: EASE_OUT }, (done) => {
              if (!done) return;
              scheduleOnRN(onPick, next);
              x.set(dir * width);
              x.set(withTiming(0, { duration: MOTION.base, easing: EASE_OUT }));
            }),
          );
        },
        onPanResponderTerminate: () => x.set(withSpring(0, MOTION.spring)),
      }),
    [x, w, canNext, date, today, onPick],
  );

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={{ overflow: 'hidden' }} onLayout={(e) => w.set(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Animated.View style={slide}>
        <WeekStrip week={week} date={date} today={today} logged={logged} onPick={onPick} />
      </Animated.View>
    </View>
  );
}

/** Seven-day selector with a sliding highlight. */
function WeekStrip({ week, date, today, logged, onPick }: { week: string[]; date: string; today: string; logged: Set<string>; onPick: (d: string) => void }) {
  const [w, setW] = useState(0);
  const GAP = 4;
  const cell = w > 0 ? (w - GAP * 6) / 7 : 0;
  const idx = week.indexOf(date);
  const x = useSharedValue(0);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (!cell || idx < 0) return;
    if (shown.get() === 0) {
      x.set(idx * (cell + GAP));
      shown.set(withTiming(1, { duration: MOTION.base }));
    } else x.set(withSpring(idx * (cell + GAP), MOTION.spring));
  }, [idx, cell, x, shown]);
  const thumb = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateX: x.get() }] }));

  return (
    <View style={st.weekRow} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {cell > 0 && idx >= 0 && <Animated.View pointerEvents="none" style={[st.dayThumb, { width: cell }, thumb]} />}
      {week.map((d) => {
        const sel = d === date;
        const isToday = d === today;
        return (
          <Pressable key={d} onPress={() => onPick(d)} disabled={d > today} style={st.day} accessibilityRole="button" accessibilityState={{ selected: sel, disabled: d > today }}>
            <Text style={[st.dayName, sel && { color: 'rgba(255,255,255,0.8)' }]}>{dayShort(d)}</Text>
            <Text style={[st.dayNum, sel && { color: C.white }, d > today && !sel && { color: C.muted }]}>{parseKey(d).getDate()}</Text>
            <View
              style={[
                st.dayDot,
                isToday ? { backgroundColor: sel ? C.white : C.accent } : logged.has(d) ? { backgroundColor: sel ? 'rgba(255,255,255,0.6)' : C.primary + '66' } : null,
              ]}
            />
          </Pressable>
        );
      })}
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
    <Animated.View style={[{ marginLeft: 4 }, spin]}>
      <Ionicons name="chevron-down" size={18} color={C.muted} />
    </Animated.View>
  );
}

function Stat({ icon, color, bg, label, value }: { icon: IconName; color: string; bg: string; label: string; value: number }) {
  return (
    <View style={st.stat}>
      <IconTile icon={icon} color={color} bg={bg} size={34} />
      <CountUp value={value} format={fmtNum} style={st.statVal} />
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
  todayBtn: { paddingHorizontal: 12, height: 32, borderRadius: R.pill, backgroundColor: C.primarySoft, justifyContent: 'center' },
  todayBtnText: { color: C.primaryDark, fontWeight: '700', fontSize: 13 },
  content: { paddingHorizontal: 16, paddingBottom: 110 },
  weekCard: { padding: 12 },
  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  weekNav: { width: 34, height: 34 },
  weekLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  weekRow: { flexDirection: 'row', gap: 4 },
  dayThumb: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: R.md, backgroundColor: C.primaryDark },
  day: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: R.md },
  dayName: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  dayNum: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 4, fontVariant: ['tabular-nums'] },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5, backgroundColor: 'transparent' },
  summary: { marginTop: 12, paddingVertical: 18 },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ringNum: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ringLbl: { fontSize: 12, fontWeight: '600', color: C.muted },
  stat: { width: 76, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 4, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  budgetLine: { textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 12 },
  overBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerSoft, borderRadius: R.sm, padding: 10, marginTop: 14 },
  overText: { flex: 1, fontSize: 12, color: C.danger, fontWeight: '600', lineHeight: 17 },
  macros: { flexDirection: 'row', gap: 12 },
  snap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  snapIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  snapSpark: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: C.aiSoft, borderWidth: 2, borderColor: C.card, alignItems: 'center', justifyContent: 'center' },
  snapTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  snapSub: { color: C.textSoft, fontSize: 13, marginTop: 2 },
  aiTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  aiTagText: { fontSize: 10, fontWeight: '800', color: C.ai, letterSpacing: 0.4 },
  copyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  copyTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
  meal: { marginTop: 12, backgroundColor: C.card, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  mealTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  mealSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '500', fontVariant: ['tabular-nums'] },
  mealBar: { marginHorizontal: 14, marginBottom: 2 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  mealBody: { paddingTop: 6, paddingBottom: 4 },
  emptyMeal: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, marginTop: 6, marginBottom: 10, padding: 12, borderRadius: R.md, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, backgroundColor: C.surfaceAlt },
  emptyIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.textSoft, marginBottom: 2 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  entrySep: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft, marginLeft: 68 },
  entryName: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  entryKcal: { fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  entryUnit: { fontSize: 11, fontWeight: '500', color: C.muted },
  trash: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mealFoot: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft, marginTop: 4 },
  footNote: { textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 18 },
  compact: { position: 'absolute', top: 0, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, height: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, ...shadowLg },
  compactDot: { width: 8, height: 8, borderRadius: 4 },
  compactNum: { fontSize: 15, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  compactUnit: { fontSize: 12, fontWeight: '600', color: C.muted },
  compactMeta: { fontSize: 12, color: C.textSoft, fontWeight: '600', fontVariant: ['tabular-nums'] },
  undo: { position: 'absolute', left: 16, right: 16, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy, borderRadius: 18, paddingLeft: 12, paddingRight: 8, paddingVertical: 10, ...shadowLg },
  undoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  undoText: { flex: 1, color: C.white, fontSize: 14, fontWeight: '600' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 34, borderRadius: R.sm, backgroundColor: 'rgba(245,196,81,0.14)' },
  undoBtnText: { color: C.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
});
