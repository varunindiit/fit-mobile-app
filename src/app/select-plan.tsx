import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlanAccordion } from '@/components/program/PlanAccordion';
import { Card, Dialog, Enter, Header, IconTile, Pill, PressableScale, ProgressBar, Screen, T, tap, useToast } from '@/components/ui';
import { isRestDay, PROGRAM_DAYS, programById, type ProgramId } from '@/data/program';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

const WEEKS = Array.from({ length: Math.ceil(PROGRAM_DAYS / 7) }, (_, w) => Array.from({ length: 7 }, (_, d) => w * 7 + d + 1).filter((d) => d <= PROGRAM_DAYS));

export default function SelectPlanScreen() {
  const { state, setProgram, resetProgram } = useStore();
  const toast = useToast();
  const [selected, setSelected] = useState<ProgramId>(state.profile.program);
  const [askReset, setAskReset] = useState(false);

  const plan = programById(selected);
  const tint = plan.colors[1];
  const progress = state.programProgress[selected] ?? 0;
  const current = Math.min(PROGRAM_DAYS, progress + 1);
  const isActive = state.profile.program === selected;
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Enter index={0}>
          <PlanAccordion value={selected} onChange={setSelected} progress={state.programProgress} onStart={onStart} />
        </Enter>

        <Enter index={1}>
          <Card style={{ marginTop: 20 }}>
            <View style={s.head}>
              <IconTile icon="calendar" color={tint} bg={`${tint}1A`} size={40} />
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={T.h3}>30-day overview</Text>
                  {isActive && <Pill text="Active" icon="checkmark-circle" />}
                </View>
                <Text style={[T.small, { marginTop: 2, fontVariant: ['tabular-nums'] }]}>
                  {plan.title} · {progress}/{PROGRAM_DAYS} days
                </Text>
              </View>
              {progress > 0 && (
                <Pressable hitSlop={10} onPress={() => (tap(), setAskReset(true))} style={({ pressed }) => [s.resetBtn, pressed && { opacity: 0.6 }]}>
                  <Ionicons name="refresh" size={14} color={C.danger} />
                  <Text style={s.reset}>Reset</Text>
                </Pressable>
              )}
            </View>
            <ProgressBar value={progress / PROGRAM_DAYS} color={tint} height={8} style={{ marginTop: 14 }} />

            {WEEKS.map((week, w) => {
              const doneInWeek = week.filter((d) => d <= progress).length;
              return (
                <View key={w} style={{ marginTop: 18 }}>
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
                        <PressableScale
                          key={d}
                          scaleTo={0.88}
                          accessibilityRole="button"
                          accessibilityLabel={`Day ${d}${rest ? ', rest day' : ''}${done ? ', completed' : ''}`}
                          onPress={() => tapDay(d)}
                          style={[s.day, done && { backgroundColor: tint, borderColor: tint }, cur && { borderColor: tint, borderWidth: 2.5, backgroundColor: C.card }]}>
                          {done ? (
                            <Ionicons name="checkmark" size={18} color={C.white} />
                          ) : rest ? (
                            <Ionicons name={cur ? 'moon' : 'cafe-outline'} size={cur ? 15 : 16} color={cur ? tint : C.muted} />
                          ) : (
                            <Text style={[s.dayText, cur && { color: tint, fontWeight: '800' }]}>{d}</Text>
                          )}
                        </PressableScale>
                      );
                    })}
                    {week.length < 7 &&
                      Array.from({ length: 7 - week.length }, (_, i) =>
                        i === 6 - week.length ? (
                          <View key={`t${i}`} style={[s.day, s.trophy, progress >= PROGRAM_DAYS && s.trophyWon]}>
                            <Ionicons name="trophy" size={16} color={progress >= PROGRAM_DAYS ? C.white : C.warning} />
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
              <Legend color={tint} filled label="Done" />
              <Legend color={tint} label="Today" />
              <View style={s.legendItem}>
                <Ionicons name="cafe-outline" size={13} color={C.muted} />
                <Text style={s.legendText}>Rest day</Text>
              </View>
            </View>
          </Card>
        </Enter>
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
    <View style={s.legendItem}>
      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: color, backgroundColor: filled ? color : C.card }} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.dangerSoft },
  reset: { color: C.danger, fontWeight: '700', fontSize: 13 },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekTitle: { fontSize: 13, fontWeight: '700', color: C.text },
  weekCount: { fontSize: 12, fontWeight: '700', color: C.muted, fontVariant: ['tabular-nums'] },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontWeight: '700', color: C.textSoft, fontVariant: ['tabular-nums'] },
  trophy: { backgroundColor: C.warningSoft, borderColor: C.gold },
  trophyWon: { backgroundColor: C.gold, borderColor: C.gold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: C.textSoft, fontWeight: '600' },
});
