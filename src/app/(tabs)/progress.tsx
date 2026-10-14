import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { longestStreak, WeekStrip } from '@/components/charts/Calendar';
import { BarChart, fmtNum, GoalLegend, LineChart } from '@/components/charts/Charts';
import { Button, Card, Chip, CountUp, Dialog, EmptyState, enter, fadeEnter, IconButton, IconTile, layoutTransition, nativeOnly, Pill, PressableScale, ProgressBar, Screen, ScreenTitle, SectionTitle, Segmented, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { addDays, bmi, bmiLabel, dayShort, fmtDate, kmFromSteps, parseKey, relDay, round1, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore, weekProgress, workoutDays, workoutStreak, type WeightEntry } from '@/lib/store';
import { C, glow, MOTION, R, shadow, shadowSm } from '@/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtFull = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const last7 = () => Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i - 6));
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}`;
const fmt1 = (n: number) => n.toFixed(1);
const openHistory = (date?: string) => router.push(date ? { pathname: '/history', params: { date } } : '/history');

export default function ReportsScreen() {
  const { state, addWeight } = useStore();
  const toast = useToast();
  const { log } = useLocalSearchParams<{ log?: string }>();
  const [tab, setTab] = useState<'steps' | 'calories'>('steps');

  // Totals + history
  const totals = state.workouts.reduce((a, w) => ({ n: a.n + 1, kcal: a.kcal + w.kcal, min: a.min + w.minutes }), { n: 0, kcal: 0, min: 0 });
  const wp = weekProgress(state);
  const streak = workoutStreak(state);
  const best = Math.max(streak, longestStreak(workoutDays(state)));
  const weekKcal = wp.week.map((k) => burnedOn(state, k).workoutKcal);
  const weekTotal = weekKcal.reduce((a, v) => a + v, 0);
  const today = todayKey();

  // Log weight sheet
  const latest = state.weights[state.weights.length - 1];
  const [sheet, setSheet] = useState(false);
  const [kg, setKg] = useState(68);
  const [date, setDate] = useState(today);
  const openLog = () => {
    setKg(latest?.kg ?? state.profile.weightKg);
    setDate(todayKey());
    setSheet(true);
  };
  useEffect(() => {
    if (!log) return;
    const t = setTimeout(openLog, 350); // let the quick-log sheet finish closing first
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);
  const adj = (d: number) => setKg((v) => Math.round(Math.max(30, Math.min(250, v + d)) * 10) / 10);
  const save = () => {
    addWeight(kg, date);
    setSheet(false);
    toast(`Weight logged: ${kg.toFixed(1)} kg`, 'scale');
  };
  const dateOpts = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const existing = state.weights.find((w) => w.date === date);
  const delta = latest ? round1(kg - latest.kg) : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)}>
          <ScreenTitle title="Reports" subtitle="Your training, weight & activity" style={{ marginBottom: 12 }} />
        </Animated.View>

        {/* Totals */}
        <Animated.View entering={enter(1)} style={st.kpis}>
          <Kpi icon="trophy" color={C.primaryDark} bg={C.primarySoft} value={totals.n} label="Workout" />
          <Kpi icon="flame" color={C.accent} bg={C.accentSoft} value={totals.kcal} label="Kcal" />
          <Kpi icon="time" color={C.water} bg={C.waterSoft} value={totals.min} label="Time (min)" />
        </Animated.View>

        {/* History */}
        <Animated.View entering={enter(2)}>
          <SectionTitle title="History" action="All Records" onAction={() => openHistory()} />
          <Card>
            <WeekStrip week={wp.week} days={wp.days} onPress={openHistory} />
            <View style={st.streakRow}>
              <View style={st.streakItem}>
                <IconTile icon="flame" color={C.accent} bg={C.accentSoft} size={36} />
                <View>
                  <CountUp value={streak} format={fmtNum} fromZero style={st.streakNum}>
                    <Text style={st.streakUnit}> Day streak</Text>
                  </CountUp>
                  <Text style={T.tiny}>Current</Text>
                </View>
              </View>
              <View style={st.streakDivider} />
              <View style={st.streakItem}>
                <IconTile icon="ribbon" color={C.warning} bg={C.warningSoft} size={36} />
                <View>
                  <CountUp value={best} format={fmtNum} fromZero style={st.streakNum}>
                    <Text style={st.streakUnit}> Day{best === 1 ? '' : 's'}</Text>
                  </CountUp>
                  <Text style={T.tiny}>Personal best</Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Weight */}
        <Animated.View entering={enter(3)}>
          <SectionHead title="Weight">
            <PressableScale
              hitSlop={8}
              scaleTo={0.94}
              accessibilityRole="button"
              onPress={() => {
                tap();
                openLog();
              }}
              style={st.logPill}>
              <Ionicons name="add" size={16} color={C.white} />
              <Text style={st.logPillText}>Log</Text>
            </PressableScale>
          </SectionHead>
          <WeightSection onLog={openLog} />
        </Animated.View>

        {/* Weekly calories */}
        <Animated.View entering={enter(4)}>
          <SectionHead title="Weekly Calories">
            <Text style={st.sectionMeta}>from workouts</Text>
          </SectionHead>
          <Card>
            <View style={st.cardHead}>
              <View style={{ flex: 1 }}>
                <CountUp value={weekTotal} format={fmtNum} fromZero style={st.bigNum}>
                  <Text style={st.bigUnit}> kcal</Text>
                </CountUp>
                <Text style={T.tiny}>This week · avg {fmtNum(Math.round(weekTotal / (new Date().getDay() + 1)))} kcal/day</Text>
              </View>
              <Pill text={`${wp.done} active day${wp.done === 1 ? '' : 's'}`} icon="flame" color={C.accent} bg={C.accentSoft} />
            </View>
            <BarChart data={wp.week.map((k, i) => ({ key: k, label: dayShort(k), value: weekKcal[i], highlight: k === today }))} color={C.accent} height={170} />
          </Card>
        </Animated.View>

        {/* Steps / intake */}
        <Animated.View entering={enter(5)}>
          <SectionHead title="Activity & Nutrition" />
          <Segmented
            options={[
              { value: 'steps', label: 'Steps' },
              { value: 'calories', label: 'Calories eaten' },
            ]}
            value={tab}
            onChange={setTab}
            style={{ marginBottom: 12 }}
          />
          <Animated.View key={tab} entering={fadeEnter()}>
            {tab === 'steps' ? <StepsView /> : <CaloriesView />}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Log weight" scroll>
        <View style={st.kgPanel}>
          <View style={st.kgRow}>
            <IconButton icon="remove" size={26} bg={C.card} color={C.primaryDark} onPress={() => adj(-0.1)} style={st.kgBtnSoft} />
            <View style={st.kgValueWrap}>
              <Text style={st.kgValue}>{kg.toFixed(1)}</Text>
              <Text style={st.kgUnit}>kg</Text>
            </View>
            <IconButton icon="add" size={26} bg={C.primaryDark} color={C.white} onPress={() => adj(0.1)} style={st.kgBtnSolid} />
          </View>
          <View style={st.deltaRow}>
            <Ionicons name={!latest ? 'flag' : delta === 0 ? 'remove' : delta > 0 ? 'caret-up' : 'caret-down'} size={14} color={!latest ? C.primary : C.textSoft} />
            <Text style={T.small}>
              {!latest ? 'Your first weigh-in' : delta === 0 ? 'Same as your last weigh-in' : `${Math.abs(delta).toFixed(1)} kg vs last weigh-in (${latest.kg.toFixed(1)} kg)`}
            </Text>
          </View>
          <View style={st.quickAdj}>
            {[-1, -0.5, 0.5, 1].map((d) => (
              <Chip key={d} label={`${d > 0 ? '+' : '−'}${Math.abs(d)} kg`} onPress={() => adj(d)} style={{ height: 34, backgroundColor: C.card }} />
            ))}
          </View>
        </View>
        <Text style={[T.label, { marginTop: 22, marginBottom: 10 }]}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {dateOpts.map((k, i) => (
            <Chip key={k} label={i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${dayShort(k)} ${parseKey(k).getDate()}`} selected={date === k} onPress={() => setDate(k)} />
          ))}
        </ScrollView>
        {existing && (
          <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} style={st.replaceNote}>
            <Ionicons name="information-circle" size={16} color={C.warning} />
            <Text style={[T.small, { flex: 1 }]}>
              Replaces your {existing.kg.toFixed(1)} kg entry for {relDay(date)}.
            </Text>
          </Animated.View>
        )}
        <Button title="Save weight" icon="checkmark" onPress={save} style={{ marginTop: 20, marginBottom: 4 }} />
      </Sheet>
    </Screen>
  );
}

/** Section header matching the kit's SectionTitle, with an arbitrary right slot. */
function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={st.sectionRow}>
      <Text style={st.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Kpi({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: number; label: string }) {
  return (
    <View style={st.kpi}>
      <IconTile icon={icon} color={color} bg={bg} size={34} />
      <CountUp value={value} format={fmtNum} fromZero style={st.kpiValue} />
      <Text style={st.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------- Weight ---------------- */

function WeightSection({ onLog }: { onLog: () => void }) {
  const { state, targets, removeWeight } = useStore();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const [del, setDel] = useState<WeightEntry | null>(null);
  const p = state.profile;
  const ws = state.weights;
  const current = ws.length ? ws[ws.length - 1].kg : p.weightKg;
  const start = ws.length ? ws[0].kg : p.startWeightKg;
  const heaviest = ws.length ? Math.max(...ws.map((w) => w.kg)) : current;
  const lightest = ws.length ? Math.min(...ws.map((w) => w.kg)) : current;
  const target = p.targetKg;
  const maintain = p.goal === 'maintain' || p.goal === 'healthy' || Math.abs(target - start) < 0.1;
  const dir = target < start ? -1 : 1; // -1 = losing towards goal
  const moved = round1((current - start) * dir);
  const remaining = round1((target - current) * dir);
  const progress = maintain ? 0 : moved / Math.abs(target - start);
  const offBy = round1(current - target);
  const onTrack = Math.abs(offBy) <= 1;

  let headline: string;
  if (maintain) headline = onTrack ? `On track · within ${Math.abs(offBy).toFixed(1)} kg of your ${target} kg target` : `${Math.abs(offBy).toFixed(1)} kg ${offBy > 0 ? 'above' : 'below'} your ${target} kg target`;
  else {
    const movedTxt = moved >= 0 ? `${moved.toFixed(1)} kg ${dir < 0 ? 'lost' : 'gained'}` : `${Math.abs(moved).toFixed(1)} kg ${dir < 0 ? 'gained' : 'lost'}`;
    headline = `${movedTxt} · ${remaining > 0 ? `${remaining.toFixed(1)} kg to go` : 'Goal reached'}`;
  }

  const b = bmi(current, p.heightCm);
  const bl = bmiLabel(b);
  const h2 = Math.pow(p.heightCm / 100, 2);
  const pos = Math.max(0, Math.min(1, (b - 15) / 20));
  const list = [...ws].reverse();
  const shown = showAll ? list : list.slice(0, 4);

  return (
    <>
      <Card>
        <View style={st.wStats}>
          <WStat label="Current" value={current} strong />
          <WStat label="Heaviest" value={heaviest} />
          <WStat label="Lightest" value={lightest} />
        </View>
        {ws.length === 0 ? (
          <EmptyState icon="scale-outline" title="No weigh-ins yet" text="Log your weight once or twice a week to see your trend line here." action="Log your first weight" onAction={onLog} />
        ) : (
          <>
            <View style={[st.cardHead, { marginTop: 16 }]}>
              <Text style={[T.tiny, { flex: 1 }]} numberOfLines={2}>
                {ws.length} weigh-in{ws.length === 1 ? '' : 's'} since {fmtDate(ws[0].date)} · tap a point
              </Text>
              <GoalLegend text={`Target ${target} kg`} color={C.primary} />
            </View>
            <LineChart data={ws.map((w) => ({ key: w.id, label: fmtDate(w.date), value: w.kg }))} target={target} color={C.weight} tooltip={(pt) => `${pt.value.toFixed(1)} kg · ${pt.label}`} />
            {ws.length === 1 && <Text style={[T.small, { textAlign: 'center', marginTop: 6 }]}>Log one more weigh-in to start your trend line.</Text>}
          </>
        )}
        <View style={st.goalBox}>
          <View style={st.cardHead}>
            <Text style={st.headline}>{headline}</Text>
            {maintain ? (
              <Pill text={onTrack ? 'On track' : 'Off target'} color={onTrack ? C.primaryDark : C.warning} bg={onTrack ? C.primarySoft : C.warningSoft} />
            ) : (
              <Pill text={`${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`} icon="trending-up" />
            )}
          </View>
          {!maintain && <ProgressBar value={progress} color={C.weight} track={C.border} height={8} style={{ marginTop: 4 }} />}
          <View style={st.endsRow}>
            <Text style={st.endText}>Start {start.toFixed(1)} kg</Text>
            <Text style={[st.endText, { color: C.primaryDark }]}>Target {target.toFixed(1)} kg</Text>
          </View>
          {!maintain && remaining > 0 && targets.weeks > 0 && (
            <View style={st.eta}>
              <Ionicons name="flag" size={14} color={C.primaryDark} />
              <Text style={st.etaText}>
                Expected by {fmtFull(targets.goalDate)} at {p.pace} kg/week
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* BMI */}
      <Card style={{ marginTop: 12 }}>
        <View style={st.cardHead}>
          <View style={st.titleWithIcon}>
            <IconTile icon="body" color={C.weight} bg={C.weightSoft} size={32} />
            <Text style={T.h3}>BMI</Text>
          </View>
          <Pill text={bl.label} color={bl.color} bg={bl.color + '1F'} />
        </View>
        <CountUp value={b} format={fmt1} fromZero style={st.bigNum}>
          <Text style={st.bigUnit}> kg/m²</Text>
        </CountUp>
        <View style={{ marginTop: 14 }}>
          <View style={st.scale}>
            <View style={{ flex: 3.5, backgroundColor: C.water }} />
            <View style={{ flex: 4.5, backgroundColor: C.primary }} />
            <View style={{ flex: 4.5, backgroundColor: C.carbs }} />
            <View style={{ flex: 7.5, backgroundColor: C.danger }} />
          </View>
          <View style={[st.marker, { left: `${pos * 100}%`, borderColor: bl.color }]} />
          <View style={{ height: 16, marginTop: 6 }}>
            {[18.5, 23, 27.5].map((v) => (
              <Text key={v} style={[st.scaleLabel, { left: `${((v - 15) / 20) * 100}%` }]}>
                {v}
              </Text>
            ))}
          </View>
        </View>
        <Text style={[T.small, { marginTop: 10, lineHeight: 19 }]}>
          Healthy range for your height ({p.heightCm} cm):{' '}
          <Text style={{ fontWeight: '700', color: C.text }}>
            {(18.5 * h2).toFixed(1)}–{(22.9 * h2).toFixed(1)} kg
          </Text>
          . Uses Asian BMI cut-offs recommended for Indians.
        </Text>
      </Card>

      {/* Weigh-in history */}
      {ws.length > 0 && (
        <Animated.View layout={layoutTransition} style={[st.cardLike, { marginTop: 12, paddingVertical: 10 }]}>
          <View style={[st.cardHead, { marginBottom: 2 }]}>
            <Text style={T.h3}>Weigh-ins</Text>
            {list.length > 4 && (
              <Pressable hitSlop={8} onPress={() => setShowAll((v) => !v)} style={({ pressed }) => [st.linkRow, pressed && { opacity: 0.6 }]}>
                <Text style={st.link}>{showAll ? 'Show less' : `Show all (${list.length})`}</Text>
                <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />
              </Pressable>
            )}
          </View>
          {shown.map((w, i) => {
            const prev = list[i + 1];
            const ch = prev ? round1(w.kg - prev.kg) : null;
            const good = ch == null || ch === 0 || maintain ? null : ch * dir > 0;
            const color = good == null ? C.muted : good ? C.primaryDark : C.danger;
            return (
              <Animated.View
                key={w.id}
                entering={nativeOnly(FadeIn.duration(MOTION.base))}
                exiting={nativeOnly(FadeOut.duration(MOTION.fast))}
                layout={layoutTransition}
                style={[st.hRow, i > 0 && st.hRowBorder]}>
                <IconTile icon="scale-outline" color={C.weight} bg={C.weightSoft} size={38} iconSize={18} />
                <View style={{ flex: 1 }}>
                  <Text style={st.hDate}>{relDay(w.date)}</Text>
                  <Text style={T.tiny}>{ch == null ? 'Starting weight' : `${signed(ch)} kg vs previous`}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
                  <Text style={st.hKg}>{w.kg.toFixed(1)} kg</Text>
                  {ch != null && ch !== 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={ch < 0 ? 'arrow-down' : 'arrow-up'} size={11} color={color} />
                      <Text style={[st.hCh, { color }]}>{Math.abs(ch).toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <IconButton icon="trash-outline" size={17} color={C.danger} bg={C.dangerSoft} onPress={() => setDel(w)} style={{ width: 34, height: 34 }} />
              </Animated.View>
            );
          })}
        </Animated.View>
      )}

      <Dialog
        visible={!!del}
        icon="🗑️"
        title="Delete this weigh-in?"
        text={del ? `${del.kg.toFixed(1)} kg on ${relDay(del.date)} will be removed from your history.` : undefined}
        confirm="Delete"
        cancel="Cancel"
        danger
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) {
            removeWeight(del.id);
            toast('Weigh-in deleted', 'trash');
          }
          setDel(null);
        }}
      />
    </>
  );
}

function WStat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.wStatLabel}>{label}</Text>
      {strong ? (
        <CountUp value={value} format={fmt1} style={[st.wStatValue, { color: C.weight, fontSize: 26, letterSpacing: -0.6 }]}>
          <Text style={st.wStatUnit}> kg</Text>
        </CountUp>
      ) : (
        <Text style={st.wStatValue}>
          {value.toFixed(1)}
          <Text style={st.wStatUnit}> kg</Text>
        </Text>
      )}
    </View>
  );
}

/* ---------------- Steps ---------------- */

function StepsView() {
  const { state, targets } = useStore();
  const today = todayKey();
  const goal = targets.stepGoal;
  const days = last7();
  const vals = days.map((k) => state.steps[k] ?? 0);
  const total = vals.reduce((a, v) => a + v, 0);
  const avg = Math.round(total / 7);
  const bestI = vals.indexOf(Math.max(...vals));
  const hits = vals.filter((v) => v >= goal).length;
  let streak = 0;
  let k = (state.steps[today] ?? 0) >= goal ? today : addDays(today, -1);
  while ((state.steps[k] ?? 0) >= goal) {
    streak++;
    k = addDays(k, -1);
  }
  const todaySteps = state.steps[today] ?? 0;

  return (
    <>
      <Card>
        <View style={st.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>Last 7 days</Text>
            <Text style={T.tiny}>{fmtNum(total)} steps in total</Text>
          </View>
          <GoalLegend text={`Goal ${fmtNum(goal)}`} />
        </View>
        <BarChart data={days.map((d, i) => ({ key: d, label: d === today ? 'Today' : dayShort(d), value: vals[i], highlight: d === today }))} color={C.steps} goal={goal} height={180} />
      </Card>
      <View style={st.grid}>
        <StatTile icon="analytics" color={C.steps} bg={C.stepsSoft} value={avg} label="Daily average" />
        <StatTile icon="trophy" color={C.warning} bg={C.warningSoft} value={vals[bestI]} label={`Best day · ${days[bestI] === today ? 'Today' : dayShort(days[bestI])}`} />
        <StatTile icon="navigate" color={C.water} bg={C.waterSoft} value={`${kmFromSteps(total)} km`} label="Total distance" />
        <StatTile icon="checkmark-done" color={C.primaryDark} bg={C.primarySoft} value={`${hits}/7`} label="Days goal hit" />
      </View>
      <Card style={{ marginTop: 12 }}>
        <View style={st.insight}>
          <IconTile icon={streak > 0 ? 'flame' : 'footsteps'} color={streak > 0 ? C.accent : C.steps} bg={streak > 0 ? C.accentSoft : C.stepsSoft} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>{streak > 0 ? `${streak}-day step streak` : 'No active step streak'}</Text>
            <Text style={[T.small, { marginTop: 3, lineHeight: 18 }]}>
              {streak > 0
                ? `You've hit ${fmtNum(goal)} steps ${streak === 1 ? 'once in a row' : `${streak} days in a row`}. Keep it going!`
                : `Reach ${fmtNum(goal)} steps today to start one — ${fmtNum(Math.max(0, goal - todaySteps))} to go.`}
            </Text>
          </View>
        </View>
        <Button title="Sync & track steps" icon="footsteps-outline" variant="secondary" small onPress={() => router.navigate('/fitness')} style={{ marginTop: 14 }} />
      </Card>
    </>
  );
}

/* ---------------- Calories eaten ---------------- */

function CaloriesView() {
  const { state, targets } = useStore();
  const today = todayKey();
  const budget = targets.budget;
  const days = last7();
  const vals = days.map((k) => Math.round(dayTotals(state.entries, k).total.kcal));
  const logged = vals.filter((v) => v > 0);
  const within = logged.filter((v) => v <= budget).length;
  const avg = logged.length ? Math.round(logged.reduce((a, v) => a + v, 0) / logged.length) : 0;
  const avgBurn = Math.round(days.reduce((a, k) => a + burnedOn(state, k).total, 0) / 7);
  const diff = avg - budget;
  const tone: { icon: IconName; color: string; bg: string } = !logged.length
    ? { icon: 'restaurant', color: C.accent, bg: C.accentSoft }
    : diff <= 0
      ? { icon: 'heart', color: C.primaryDark, bg: C.primarySoft }
      : { icon: 'bulb', color: C.warning, bg: C.warningSoft };

  return (
    <>
      <Card>
        <View style={st.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>Calories eaten</Text>
            <Text style={T.tiny}>Last 7 days · coral = over budget</Text>
          </View>
          <GoalLegend text={`Budget ${fmtNum(budget)}`} />
        </View>
        <BarChart
          data={days.map((d, i) => ({ key: d, label: d === today ? 'Today' : dayShort(d), value: vals[i], highlight: d === today, color: vals[i] > budget ? C.accent : C.primary }))}
          goal={budget}
          height={180}
        />
      </Card>
      <View style={st.grid}>
        <StatTile icon="restaurant" color={C.primaryDark} bg={C.primarySoft} value={avg ? avg : '—'} label="Avg intake (logged days)" />
        <StatTile icon="checkmark-circle" color={C.primaryDark} bg={C.primarySoft} value={`${within}/${logged.length}`} label="Days within budget" />
        <StatTile icon="flame" color={C.accent} bg={C.accentSoft} value={avgBurn} label="Avg burned / day" />
        <StatTile icon="today" color={C.water} bg={C.waterSoft} value={vals[6]} label={`Today of ${fmtNum(budget)}`} />
      </View>
      <Card style={{ marginTop: 12 }}>
        <View style={st.insight}>
          <IconTile icon={tone.icon} color={tone.color} bg={tone.bg} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={T.h3}>{!logged.length ? 'Start logging meals' : diff <= 0 ? 'Nicely within budget' : 'A little over budget'}</Text>
            <Text style={[T.small, { marginTop: 3, lineHeight: 18 }]}>
              {!logged.length
                ? 'Log what you eat to see how your intake compares to your daily budget.'
                : diff <= 0
                  ? `You averaged ${fmtNum(Math.abs(diff))} kcal under your budget on ${logged.length} logged day${logged.length === 1 ? '' : 's'}. Great consistency!`
                  : `You averaged ${fmtNum(diff)} kcal over budget. Try swapping one fried snack for roasted makhana or fruit.`}
            </Text>
          </View>
        </View>
        <Button title="Open food diary" icon="book-outline" variant="secondary" small onPress={() => router.navigate('/diary')} style={{ marginTop: 14 }} />
      </Card>
    </>
  );
}

/** KPI tile: numbers count up, strings render as-is. */
function StatTile({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: number | string; label: string }) {
  return (
    <View style={st.tile}>
      <IconTile icon={icon} color={color} bg={bg} size={34} iconSize={17} />
      {typeof value === 'number' ? (
        <CountUp value={value} format={fmtNum} fromZero style={st.tileValue} />
      ) : (
        <Text style={st.tileValue}>{value}</Text>
      )}
      <Text style={T.tiny} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const cardBase: ViewStyle = { backgroundColor: C.card, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow };

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  kpis: { flexDirection: 'row', gap: 10 },
  kpi: { ...cardBase, flex: 1, padding: 14, gap: 2 },
  kpiValue: { ...T.num, fontSize: 22, marginTop: 10 },
  kpiLabel: { ...T.tiny, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: C.muted },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontSize: 14, fontWeight: '600', color: C.primary },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  streakItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakDivider: { width: StyleSheet.hairlineWidth * 2, height: 32, backgroundColor: C.borderSoft, marginHorizontal: 12 },
  streakNum: { ...T.num, fontSize: 17 },
  streakUnit: { fontSize: 13, fontWeight: '600', color: C.textSoft, letterSpacing: 0 },
  logPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.primaryDark, borderRadius: R.pill, paddingLeft: 10, paddingRight: 14, height: 32, ...glow(C.primaryDark) },
  logPillText: { color: C.white, fontSize: 14, fontWeight: '700' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  titleWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wStats: { flexDirection: 'row', alignItems: 'flex-end' },
  wStatLabel: { ...T.tiny, marginBottom: 3 },
  wStatValue: { ...T.num, fontSize: 18 },
  wStatUnit: { fontSize: 12, fontWeight: '600', color: C.muted, letterSpacing: 0 },
  goalBox: { backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14, marginTop: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft },
  headline: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 },
  endsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  endText: { ...T.tiny, fontVariant: ['tabular-nums'] },
  eta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  etaText: { fontSize: 12, fontWeight: '600', color: C.primaryDark, flex: 1 },
  bigNum: { ...T.num, fontSize: 28, letterSpacing: -0.7 },
  bigUnit: { fontSize: 14, fontWeight: '600', color: C.muted, letterSpacing: 0 },
  scale: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  marker: { position: 'absolute', top: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, borderWidth: 4, marginLeft: -10, ...shadowSm },
  scaleLabel: { position: 'absolute', width: 40, marginLeft: -20, textAlign: 'center', fontSize: 10, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  cardLike: { ...cardBase, paddingHorizontal: 16 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  hRowBorder: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  hDate: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  hKg: { ...T.num, fontSize: 15, fontWeight: '700' },
  hCh: { fontSize: 11, fontWeight: '700', marginLeft: 1, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 12 },
  tile: { ...cardBase, width: '48.5%', padding: 14, gap: 3 },
  tileValue: { ...T.num, fontSize: 20, marginTop: 8 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kgPanel: { alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: R.lg, paddingVertical: 18, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft },
  kgRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kgBtnSoft: { width: 54, height: 54, borderRadius: 27, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, ...shadowSm },
  kgBtnSolid: { width: 54, height: 54, borderRadius: 27, ...glow(C.primaryDark) },
  kgValueWrap: { flexDirection: 'row', alignItems: 'baseline', minWidth: 150, justifyContent: 'center' },
  kgValue: { fontSize: 52, fontWeight: '800', color: C.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  kgUnit: { fontSize: 18, fontWeight: '600', color: C.muted, marginLeft: 4 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  quickAdj: { flexDirection: 'row', gap: 8, marginTop: 14 },
  replaceNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.warningSoft, borderRadius: R.sm, padding: 12, marginTop: 12 },
});
