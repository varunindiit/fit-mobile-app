import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { longestStreak, MonthCalendar, MONTH_NAMES } from '@/components/charts/Calendar';
import { fmtNum } from '@/components/charts/Charts';
import { Card, CountUp, EmptyState, enter, fadeEnter, Header, IconButton, IconTile, PressableScale, Screen, Segmented, T, tap, type IconName } from '@/components/ui';
import { pad, parseKey, relDay, todayKey } from '@/lib/calc';
import { useStore, workoutDays, workoutStreak, type WorkoutLog } from '@/lib/store';
import { C, R, shadow, shadowSm } from '@/theme';

const firstOfMonth = (k: string) => {
  const d = parseKey(k);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const sum = (ws: WorkoutLog[]) => ws.reduce((a, w) => ({ kcal: a.kcal + w.kcal, min: a.min + w.minutes }), { kcal: 0, min: 0 });

export default function HistoryScreen() {
  const { state } = useStore();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const today = todayKey();
  const initial = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const [sel, setSel] = useState(initial);
  const [month, setMonth] = useState(() => firstOfMonth(initial));
  const [mode, setMode] = useState<'day' | 'month'>('day');

  const days = workoutDays(state);
  const streak = workoutStreak(state);
  const best = Math.max(streak, longestStreak(days));
  const y = month.getFullYear();
  const m = month.getMonth();
  const prefix = `${y}-${pad(m + 1)}`;
  const monthWs = state.workouts.filter((w) => w.date.startsWith(prefix));
  const monthSum = sum(monthWs);
  const activeDays = new Set(monthWs.map((w) => w.date)).size;
  const now = new Date();
  const atCurrent = y === now.getFullYear() && m === now.getMonth();

  const dayWs = state.workouts.filter((w) => w.date === sel);
  const daySum = sum(dayWs);
  const groups = [...new Set(monthWs.map((w) => w.date))].sort().reverse().map((d) => ({ date: d, items: monthWs.filter((w) => w.date === d) }));

  const shift = (n: number) => {
    setMonth(new Date(y, m + n, 1));
    setMode('month');
  };

  // Index of each group's first row, so rows across groups stagger in visual order.
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((a, g) => a + g.items.length, 0));

  return (
    <Screen>
      <Header title="History" />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)} style={st.streaks}>
          <StreakBox icon="flame" color={C.accent} bg={C.accentSoft} value={streak} label="Current streak" />
          <StreakBox icon="ribbon" color={C.warning} bg={C.warningSoft} value={best} label="Personal best" />
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <Card>
            <View style={st.monthHead}>
              <IconButton icon="chevron-back" size={20} bg={C.surfaceAlt} onPress={() => shift(-1)} />
              <Text style={st.monthTitle}>
                {MONTH_NAMES[m]} {y}
              </Text>
              <IconButton icon="chevron-forward" size={20} bg={C.surfaceAlt} color={atCurrent ? C.border : C.text} onPress={() => (atCurrent ? undefined : shift(1))} />
            </View>
            <Animated.View key={prefix} entering={fadeEnter()}>
              <MonthCalendar
                month={month}
                days={days}
                selected={mode === 'day' ? sel : undefined}
                onSelect={(k) => {
                  setSel(k);
                  setMode('day');
                }}
              />
            </Animated.View>
            <View style={st.monthStats}>
              <MStat value={monthWs.length} label="Workouts" />
              <MStat value={activeDays} label="Active days" />
              <MStat value={monthSum.kcal} label="kcal" />
              <MStat value={monthSum.min} label="Minutes" />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Segmented
            options={[
              { value: 'day', label: 'Selected day' },
              { value: 'month', label: `All of ${MONTH_NAMES[m].slice(0, 3)}` },
            ]}
            value={mode}
            onChange={setMode}
            style={{ marginTop: 16, marginBottom: 4 }}
          />
        </Animated.View>

        {mode === 'day' ? (
          <View>
            <View style={st.groupHead}>
              <Text style={st.groupTitle}>{relDay(sel)}</Text>
              {dayWs.length > 0 && (
                <Text style={st.groupMeta}>
                  {dayWs.length} workout{dayWs.length === 1 ? '' : 's'} · {fmtNum(daySum.kcal)} kcal · {daySum.min} min
                </Text>
              )}
            </View>
            {dayWs.length ? (
              <View style={st.rows}>
                {dayWs.map((w, i) => (
                  <Row key={w.id} w={w} index={i} />
                ))}
              </View>
            ) : (
              <Animated.View key={`empty:${sel}`} entering={fadeEnter()}>
                <Card style={{ paddingVertical: 0 }}>
                  {sel > today ? (
                    <EmptyState icon="calendar-outline" title="Nothing planned yet" text="This day is still ahead of you." />
                  ) : sel === today ? (
                    <EmptyState icon="barbell-outline" title="No workouts yet today" text="Start your daily challenge to keep your streak alive." action="Go to Training" onAction={() => router.navigate('/fitness')} />
                  ) : (
                    <EmptyState icon="moon-outline" title="Rest day" text="No workouts were logged on this day." />
                  )}
                </Card>
              </Animated.View>
            )}
          </View>
        ) : groups.length === 0 ? (
          <Animated.View key={`empty:${prefix}`} entering={fadeEnter()} style={{ marginTop: 12 }}>
            <Card style={{ paddingVertical: 0 }}>
              <EmptyState icon="calendar-clear-outline" title={`No workouts in ${MONTH_NAMES[m]}`} text="Workouts you complete will show up here." action={atCurrent ? 'Go to Training' : undefined} onAction={() => router.navigate('/fitness')} />
            </Card>
          </Animated.View>
        ) : (
          groups.map((g, gi) => {
            const gs = sum(g.items);
            return (
              <View key={g.date}>
                <View style={st.groupHead}>
                  <Text style={st.groupTitle}>{relDay(g.date)}</Text>
                  <Text style={st.groupMeta}>
                    {fmtNum(gs.kcal)} kcal · {gs.min} min
                  </Text>
                </View>
                <View style={st.rows}>
                  {g.items.map((w, i) => (
                    <Row key={w.id} w={w} index={starts[gi] + i} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ w, index }: { w: WorkoutLog; index: number }) {
  const linked = !!(w.sessionKey || w.workoutId);
  const body = (
    <>
      <View style={st.emoji}>
        <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} numberOfLines={1}>
          {w.title}
        </Text>
        <View style={st.rowMeta}>
          <Ionicons name="time-outline" size={13} color={C.muted} />
          <Text style={st.rowMetaText}>{w.minutes} min</Text>
          <View style={st.metaDot} />
          <Ionicons name="flame" size={13} color={C.accent} />
          <Text style={[st.rowMetaText, { color: C.accent, fontWeight: '700' }]}>{w.kcal} kcal</Text>
        </View>
      </View>
      {linked && <Ionicons name="chevron-forward" size={18} color={C.muted} />}
    </>
  );
  return (
    <Animated.View entering={enter(index + 2)}>
      {linked ? (
        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          onPress={() => {
            tap();
            if (w.sessionKey) router.push({ pathname: '/program-day', params: { key: w.sessionKey } });
            else router.push('/workout/' + w.workoutId);
          }}
          style={st.row}>
          {body}
        </PressableScale>
      ) : (
        <View style={st.row}>{body}</View>
      )}
    </Animated.View>
  );
}

function StreakBox({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: number; label: string }) {
  return (
    <View style={st.streakBox}>
      <IconTile icon={icon} color={color} bg={bg} size={40} />
      <View>
        <CountUp value={value} format={fmtNum} fromZero style={st.streakNum}>
          <Text style={st.streakUnit}> days</Text>
        </CountUp>
        <Text style={T.tiny}>{label}</Text>
      </View>
    </View>
  );
}

function MStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <CountUp value={value} format={fmtNum} style={st.mValue} />
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  streaks: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  streakBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.lg, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  streakNum: { ...T.num, fontSize: 18 },
  streakUnit: { fontSize: 13, fontWeight: '600', color: C.textSoft, letterSpacing: 0 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  monthStats: { flexDirection: 'row', marginTop: 12, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  mValue: { ...T.num, fontSize: 18 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 18, marginBottom: 10, paddingHorizontal: 2 },
  groupTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  groupMeta: { ...T.tiny, fontVariant: ['tabular-nums'] },
  rows: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadowSm },
  emoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3, letterSpacing: -0.1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { fontSize: 13, color: C.textSoft, fontVariant: ['tabular-nums'] },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.border, marginHorizontal: 4 },
});
