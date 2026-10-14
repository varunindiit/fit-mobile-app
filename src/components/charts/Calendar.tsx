import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tap } from '@/components/ui';
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

/** Sun–Sat strip: today = filled dark circle, workout days = green check. */
export function WeekStrip({ week, days, onPress }: { week: string[]; days: Set<string>; onPress?: (k: string) => void }) {
  const today = todayKey();
  return (
    <View style={s.week}>
      {week.map((k, i) => {
        const isToday = k === today;
        const done = days.has(k);
        const future = k > today;
        return (
          <Pressable
            key={k}
            disabled={!onPress}
            onPress={() => {
              tap();
              onPress?.(k);
            }}
            style={s.weekCol}>
            <Text style={[s.letter, isToday && { color: C.text }]}>{LETTERS[i]}</Text>
            <View style={[s.dayCircle, done && { backgroundColor: C.primary }, isToday && !done && { backgroundColor: C.navy }, isToday && done && s.todayRing]}>
              {done ? <Ionicons name="checkmark" size={17} color={C.white} /> : <Text style={[s.dayNum, isToday && { color: C.white }, future && { color: C.muted }]}>{parseKey(k).getDate()}</Text>}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Month grid; workout days filled green, today outlined, selected ringed. */
export function MonthCalendar({ month, days, selected, onSelect }: { month: Date; days: Set<string>; selected?: string; onSelect?: (k: string) => void }) {
  const today = todayKey();
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => dateKey(new Date(y, m, i + 1)))];
  while (cells.length % 7) cells.push(null);
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
          return (
            <Pressable
              key={k}
              onPress={() => {
                tap();
                onSelect?.(k);
              }}
              style={s.cell}>
              <View style={[s.mCircle, isToday && s.mToday, done && { backgroundColor: C.primary, borderColor: C.primary }, isSel && !done && { backgroundColor: C.navy, borderColor: C.navy }, isSel && done && s.mSelDone]}>
                <Text style={[s.mNum, future && { color: C.muted }, (done || isSel) && { color: C.white, fontWeight: '800' }, isToday && !done && !isSel && { color: C.primaryDark, fontWeight: '800' }]}>{parseKey(k).getDate()}</Text>
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
  letter: { fontSize: 12, fontWeight: '700', color: C.muted },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  todayRing: { borderWidth: 2.5, borderColor: C.navy },
  dayNum: { fontSize: 14, fontWeight: '700', color: C.text },
  row: { flexDirection: 'row' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  head: { height: 28, fontSize: 12, fontWeight: '700', color: C.muted, lineHeight: 28 },
  mCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  mToday: { borderColor: C.primary },
  mSelDone: { borderColor: C.navy, borderWidth: 2.5 },
  mNum: { fontSize: 14, fontWeight: '600', color: C.text },
});
