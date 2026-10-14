import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlanAccordion } from '@/components/program/PlanAccordion';
import { Card, Dialog, Header, ProgressBar, Screen, T, tap, useToast } from '@/components/ui';
import { isRestDay, PROGRAM_DAYS, programById, type ProgramId } from '@/data/program';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

const WEEKS = Array.from({ length: Math.ceil(PROGRAM_DAYS / 7) }, (_, w) => Array.from({ length: 7 }, (_, d) => w * 7 + d + 1).filter((d) => d <= PROGRAM_DAYS));

export default function SelectPlanScreen() {
  const { state, setProgram, resetProgram } = useStore();
  const toast = useToast();
  const [selected, setSelected] = useState<ProgramId>(state.profile.program);
  const [askReset, setAskReset] = useState(false);

  const plan = programById(selected);
  const progress = state.programProgress[selected] ?? 0;
  const current = Math.min(PROGRAM_DAYS, progress + 1);
  const openDay = (day: number) => router.push({ pathname: '/program-day', params: { key: `program:${selected}:${day}` } });

  const onStart = (id: ProgramId) => {
    const p = programById(id);
    setProgram(id);
    toast(`Plan set: ${p.title}`, 'checkmark-circle');
    const next = Math.min(PROGRAM_DAYS, (state.programProgress[id] ?? 0) + 1);
    router.replace({ pathname: '/program-day', params: { key: `program:${id}:${next}` } });
  };

  const tapDay = (day: number) => {
    tap();
    if (day <= current) openDay(day);
    else toast(`Complete Day ${current} first`, 'lock-closed');
  };

  return (
    <Screen>
      <Header title="Select Training Plan" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <PlanAccordion value={selected} onChange={setSelected} progress={state.programProgress} onStart={onStart} />

        <Card style={{ marginTop: 20 }}>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={T.h3}>30-day overview</Text>
              <Text style={[T.small, { marginTop: 2 }]}>
                {plan.title} · {progress}/{PROGRAM_DAYS} days
                {state.profile.program === selected ? '  ·  Active plan' : ''}
              </Text>
            </View>
            {progress > 0 && (
              <Pressable hitSlop={10} onPress={() => (tap(), setAskReset(true))}>
                <Text style={s.reset}>Reset</Text>
              </Pressable>
            )}
          </View>
          <ProgressBar value={progress / PROGRAM_DAYS} color={plan.colors[1]} height={8} style={{ marginTop: 12 }} />

          {WEEKS.map((week, w) => {
            const doneInWeek = week.filter((d) => d <= progress).length;
            return (
              <View key={w} style={{ marginTop: 16 }}>
                <View style={s.weekHead}>
                  <Text style={s.weekTitle}>Week {w + 1}</Text>
                  <Text style={s.weekCount}>
                    {doneInWeek}/{week.length}
                  </Text>
                </View>
                <View style={s.weekRow}>
                  {week.map((d) => {
                    const done = d <= progress;
                    const cur = d === current && !done;
                    const rest = isRestDay(d);
                    return (
                      <Pressable key={d} onPress={() => tapDay(d)} style={({ pressed }) => [s.day, done && { backgroundColor: plan.colors[1], borderColor: plan.colors[1] }, cur && { borderColor: plan.colors[1], borderWidth: 2.5, backgroundColor: C.card }, pressed && { opacity: 0.7 }]}>
                        {done ? (
                          <Ionicons name="checkmark" size={18} color={C.white} />
                        ) : rest ? (
                          <Text style={{ fontSize: 16 }}>{cur ? '😴' : '☕'}</Text>
                        ) : (
                          <Text style={[s.dayText, cur && { color: plan.colors[1], fontWeight: '900' }]}>{d}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                  {week.length < 7 &&
                    Array.from({ length: 7 - week.length }, (_, i) =>
                      i === 6 - week.length ? (
                        <View key={`t${i}`} style={[s.day, s.trophy, progress >= PROGRAM_DAYS && { backgroundColor: C.gold, borderColor: C.gold }]}>
                          <Text style={{ fontSize: 17 }}>🏆</Text>
                        </View>
                      ) : (
                        <View key={`t${i}`} style={[s.day, { borderWidth: 0, backgroundColor: 'transparent' }]} />
                      ),
                    )}
                </View>
              </View>
            );
          })}

          <View style={s.legend}>
            <Legend color={plan.colors[1]} filled label="Done" />
            <Legend color={plan.colors[1]} label="Today" />
            <Text style={s.legendText}>☕ Rest day</Text>
          </View>
        </Card>
      </ScrollView>

      <Dialog
        visible={askReset}
        icon="🔄"
        title={`Reset ${plan.title}?`}
        text="Your 30-day progress for this plan will start over from Day 1. Your workout history stays in your log."
        confirm="Reset"
        cancel="Cancel"
        danger
        onCancel={() => setAskReset(false)}
        onConfirm={() => {
          resetProgram(selected);
          setAskReset(false);
          toast(`${plan.title} reset to Day 1`, 'refresh');
        }}
      />
    </Screen>
  );
}

function Legend({ color, filled, label }: { color: string; filled?: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: color, backgroundColor: filled ? color : C.card }} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  reset: { color: C.danger, fontWeight: '800', fontSize: 14 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekTitle: { fontSize: 13, fontWeight: '800', color: C.text },
  weekCount: { fontSize: 12, fontWeight: '700', color: C.muted },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '700', color: C.textSoft },
  trophy: { backgroundColor: '#FFF7E0', borderColor: C.gold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderSoft },
  legendText: { fontSize: 12, color: C.textSoft, fontWeight: '600' },
});
