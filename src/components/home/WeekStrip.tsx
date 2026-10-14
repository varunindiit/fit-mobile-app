import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { C } from '@/theme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Sun..Sat strip: filled dot = workout logged, ring = today, faint = other days. */
export const WeekStrip = memo(function WeekStrip({ week, done, today, color = C.workout, soft = C.workoutSoft }: { week: string[]; done: Set<string>; today: string; color?: string; soft?: string }) {
  return (
    <View style={st.row}>
      {week.map((d, i) => {
        const hit = done.has(d);
        const isToday = d === today;
        const future = d > today;
        return (
          <View key={d} style={st.col}>
            <View style={[st.dot, { backgroundColor: hit ? color : future ? C.surfaceAlt : soft }, isToday && !hit && { borderWidth: 1.5, borderColor: color, backgroundColor: C.card }]}>
              {hit && <Ionicons name="checkmark" size={10} color={C.white} />}
            </View>
            <Text style={[st.letter, isToday && { color, fontWeight: '800' }]}>{LETTERS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
});

const st = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 4 },
  dot: { width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 10, fontWeight: '600', color: C.muted },
});
