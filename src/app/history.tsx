import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { longestStreak, MonthCalendar, MONTH_NAMES } from '@/components/charts/Calendar';
import { fmtNum } from '@/components/charts/Charts';
import { Card, EmptyState, Header, IconButton, Screen, Segmented, T, tap } from '@/components/ui';
import { pad, parseKey, relDay, todayKey } from '@/lib/calc';
import { useStore, workoutDays, workoutStreak, type WorkoutLog } from '@/lib/store';
import { C, R } from '@/theme';

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

  return (
    <Screen>
      <Header title="History" />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.streaks}>
          <View style={st.streakBox}>
            <Text style={{ fontSize: 22 }}>🔥</Text>
            <View>
              <Text style={st.streakNum}>{streak} days</Text>
              <Text style={T.tiny}>Current streak</Text>
            </View>
          </View>
          <View style={st.streakBox}>
            <Text style={{ fontSize: 22 }}>🏅</Text>
            <View>
              <Text style={st.streakNum}>{best} days</Text>
              <Text style={T.tiny}>Personal best</Text>
            </View>
          </View>
        </View>

        <Card>
          <View style={st.monthHead}>
            <IconButton icon="chevron-back" size={20} bg={C.bg} onPress={() => shift(-1)} />
            <Text style={st.monthTitle}>
              {MONTH_NAMES[m]} {y}
            </Text>
            <IconButton icon="chevron-forward" size={20} bg={C.bg} color={atCurrent ? C.border : C.text} onPress={() => (atCurrent ? undefined : shift(1))} />
          </View>
          <MonthCalendar
            month={month}
            days={days}
            selected={mode === 'day' ? sel : undefined}
            onSelect={(k) => {
              setSel(k);
              setMode('day');
            }}
          />
          <View style={st.monthStats}>
            <MStat value={String(monthWs.length)} label="Workouts" />
            <MStat value={String(activeDays)} label="Active days" />
            <MStat value={fmtNum(monthSum.kcal)} label="kcal" />
            <MStat value={fmtNum(monthSum.min)} label="Minutes" />
          </View>
        </Card>

        <Segmented
          options={[
            { value: 'day', label: 'Selected day' },
            { value: 'month', label: `All of ${MONTH_NAMES[m].slice(0, 3)}` },
          ]}
          value={mode}
          onChange={setMode}
          style={{ marginTop: 16, marginBottom: 12 }}
        />

        {mode === 'day' ? (
          <>
            <View style={st.groupHead}>
              <Text style={st.groupTitle}>{relDay(sel)}</Text>
              {dayWs.length > 0 && (
                <Text style={T.tiny}>
                  {dayWs.length} workout{dayWs.length === 1 ? '' : 's'} · {fmtNum(daySum.kcal)} kcal · {daySum.min} min
                </Text>
              )}
            </View>
            <Card style={{ paddingVertical: dayWs.length ? 4 : 0 }}>
              {dayWs.length ? (
                dayWs.map((w, i) => <Row key={w.id} w={w} first={i === 0} />)
              ) : sel > today ? (
                <EmptyState emoji="📅" title="Nothing planned yet" text="This day is still ahead of you." />
              ) : sel === today ? (
                <EmptyState emoji="💪" title="No workouts yet today" text="Start your daily challenge to keep your streak alive." action="Go to Training" onAction={() => router.navigate('/fitness')} />
              ) : (
                <EmptyState emoji="😴" title="Rest day" text="No workouts were logged on this day." />
              )}
            </Card>
          </>
        ) : groups.length === 0 ? (
          <Card style={{ paddingVertical: 0 }}>
            <EmptyState emoji="🗓️" title={`No workouts in ${MONTH_NAMES[m]}`} text="Workouts you complete will show up here." action={atCurrent ? 'Go to Training' : undefined} onAction={() => router.navigate('/fitness')} />
          </Card>
        ) : (
          groups.map((g) => {
            const gs = sum(g.items);
            return (
              <View key={g.date} style={{ marginBottom: 14 }}>
                <View style={st.groupHead}>
                  <Text style={st.groupTitle}>{relDay(g.date)}</Text>
                  <Text style={T.tiny}>
                    {fmtNum(gs.kcal)} kcal · {gs.min} min
                  </Text>
                </View>
                <Card style={{ paddingVertical: 4 }}>
                  {g.items.map((w, i) => (
                    <Row key={w.id} w={w} first={i === 0} />
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ w, first }: { w: WorkoutLog; first: boolean }) {
  const linked = !!(w.sessionKey || w.workoutId);
  return (
    <Pressable
      onPress={() => {
        if (!linked) return;
        tap();
        if (w.sessionKey) router.push({ pathname: '/program-day', params: { key: w.sessionKey } });
        else router.push('/workout/' + w.workoutId);
      }}
      style={({ pressed }) => [st.row, !first && st.rowBorder, pressed && linked && { opacity: 0.7 }]}>
      <View style={st.emoji}>
        <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} numberOfLines={1}>
          {w.title}
        </Text>
        <Text style={T.small}>
          {w.minutes} min · <Text style={{ color: C.accent, fontWeight: '700' }}>{w.kcal} kcal</Text>
        </Text>
      </View>
      {linked && <Ionicons name="chevron-forward" size={18} color={C.muted} />}
    </Pressable>
  );
}

function MStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={st.mValue}>{value}</Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  streaks: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  streakBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  streakNum: { fontSize: 17, fontWeight: '900', color: C.text },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  monthStats: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  mValue: { fontSize: 17, fontWeight: '900', color: C.text },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  groupTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.borderSoft },
  emoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
});
