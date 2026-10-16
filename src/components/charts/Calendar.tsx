import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PressableScale, tap } from '@/components/ui';
import { dateKey, parseKey, todayKey } from '@/lib/calc';
import { C } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Longest run of consecutive dates in a set of date keys. */
export function longestStreak(days: Set<string>) {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = parseKey(k);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Sun–Sat strip: workout days = brand-filled check, today = brand ring, future days = hairline outline. */
export function WeekStrip({ week, days, onPress }: { week: string[]; days: Set<string>; onPress?: (k: string) => void }) {
  const today = todayKey();
  return (
    <View style={s.week}>
      {week.map((k, i) => {
        const isToday = k === today;
        const done = days.has(k);
        const future = k > today;
        return (
          <PressableScale
            key={k}
            scaleTo={0.9}
            disabled={!onPress}
            accessibilityRole="button"
            onPress={() => {
              tap();
              onPress?.(k);
            }}
            style={s.weekCol}>
            <Text style={[s.letter, isToday && { color: C.primaryDark }]}>{LETTERS[i]}</Text>
            <View style={[s.dayCircle, future && s.dayFuture, done && s.dayDone, isToday && !done && s.dayToday, isToday && done && s.dayTodayDone]}>
              {done ? (
                <Ionicons name="checkmark" size={17} color={C.onPrimary} />
              ) : (
                <Text style={[s.dayNum, isToday && { color: C.primaryDark, fontWeight: '800' }, future && { color: C.muted }]}>{parseKey(k).getDate()}</Text>
              )}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Month grid; workout days brand-filled (consecutive days joined by a mint band), today ringed, selected deep-filled. */
export function MonthCalendar({ month, days, selected, onSelect }: { month: Date; days: Set<string>; selected?: string; onSelect?: (k: string) => void }) {
  const today = todayKey();
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => dateKey(new Date(y, m, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const isDone = (i: number) => {
    const c = cells[i];
    return !!c && days.has(c);
  };
  return (
    <View>
      <View style={s.row}>
        {LETTERS.map((l, i) => (
          <Text key={i} style={[s.cell, s.head]}>
            {l}
          </Text>
        ))}
      </View>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {cells.map((k, i) => {
          if (!k) return <View key={`b${i}`} style={s.cell} />;
          const done = days.has(k);
          const isToday = k === today;
          const isSel = k === selected;
          const future = k > today;
          const col = i % 7;
          const joinL = done && col > 0 && isDone(i - 1);
          const joinR = done && col < 6 && isDone(i + 1);
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              onPress={() => {
                tap();
                onSelect?.(k);
              }}
              style={({ pressed }) => [s.cell, pressed && { opacity: 0.7 }]}>
              {joinL && <View style={[s.band, { left: 0, right: '50%' }]} />}
              {joinR && <View style={[s.band, { left: '50%', right: 0 }]} />}
              <View style={[s.mCircle, isToday && s.mToday, done && s.mDone, isToday && done && !isSel && s.mTodayDone, isSel && !done && s.mSel, isSel && done && s.mSelDone]}>
                <Text style={[s.mNum, future && { color: C.muted }, (done || isSel) && { color: done ? C.onPrimary : C.white, fontWeight: '700' }, isToday && !done && !isSel && { color: C.primaryDark, fontWeight: '800' }]}>{parseKey(k).getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', gap: 8, flex: 1 },
  letter: { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  dayFuture: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
  dayDone: { backgroundColor: C.primary, borderWidth: 0 },
  dayToday: { backgroundColor: C.primarySoft, borderWidth: 2, borderColor: C.primary },
  dayTodayDone: { borderWidth: 2.5, borderColor: C.primaryDark },
  dayNum: { fontSize: 14, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  head: { height: 28, fontSize: 11, fontWeight: '700', color: C.muted, lineHeight: 28, letterSpacing: 0.4 },
  band: { position: 'absolute', top: 6, height: 32, backgroundColor: C.primarySoft },
  mCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  mToday: { borderColor: C.primary, backgroundColor: C.card },
  mDone: { backgroundColor: C.primary, borderColor: C.primary },
  mTodayDone: { borderColor: C.primaryDark },
  mSel: { backgroundColor: C.navy, borderColor: C.navy },
  mSelDone: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  mNum: { fontSize: 14, fontWeight: '600', color: C.text, fontVariant: ['tabular-nums'] },
});
