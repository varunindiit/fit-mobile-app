import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { useOn } from '@/components/onboarding/kit';
import { nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { C, MOTION, R, shadowSm } from '@/theme';

export const MAX_REST = 2;

/** One-tap rest-day patterns; days are the stored full names. */
const PRESETS: { label: string; days: string[] }[] = [
  { label: 'Sunday', days: ['Sunday'] },
  { label: 'Weekend', days: ['Saturday', 'Sunday'] },
  { label: 'Wed + Sun', days: ['Wednesday', 'Sunday'] },
];

const tip = (rest: number): { icon: IconName; text: string } =>
  rest === 0
    ? { icon: 'moon-outline', text: `Pick up to ${MAX_REST} days to recover.` }
    : rest < MAX_REST
      ? { icon: 'flash-outline', text: `Great for momentum. You can add ${MAX_REST - rest} more rest day.` }
      : { icon: 'leaf-outline', text: `A balanced week. ${MAX_REST} rest days is the max you can pick.` };

/**
 * Week planner for rest days: a strip of day capsules (dumbbell = workout, moon = rest), quick presets,
 * and a balance summary. Rest days are capped at MAX_REST; `onToggle` should apply that cap against the
 * latest state so rapid taps never drop a change.
 */
export function RestPlanner({ days, value, onToggle, onChange }: { days: string[]; value: string[]; onToggle: (day: string) => void; onChange: (next: string[]) => void }) {
  const rest = value.length;
  const t = tip(rest);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

  return (
    <View>
      <View style={s.presets}>
        {PRESETS.map((p) => {
          const on = same(p.days, value);
          return (
            <PressableScale
              key={p.label}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Rest on ${p.label}`}
              onPress={() => {
                tap();
                onChange(p.days);
              }}
              style={[s.preset, on && s.presetOn]}>
              <Text style={[s.presetText, on && { color: C.white }]}>{p.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={s.week}>
        {days.map((d) => (
          <DayCapsule key={d} day={d} on={value.includes(d)} locked={!value.includes(d) && rest >= MAX_REST} onPress={() => onToggle(d)} />
        ))}
      </View>

      <View style={s.summary}>
        <View style={s.counts}>
          <Count n={7 - rest} label={7 - rest === 1 ? 'workout day' : 'workout days'} color={C.primaryDark} />
          <View style={s.divider} />
          <Count n={rest} label={rest === 1 ? 'rest day' : 'rest days'} color={C.steps} />
        </View>
        <View style={s.bar}>
          {days.map((d) => (
            <View key={d} style={[s.seg, { backgroundColor: value.includes(d) ? C.steps : C.primary }]} />
          ))}
        </View>
        <Animated.View key={t.text} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={s.tip}>
          <Ionicons name={t.icon} size={15} color={C.textSoft} />
          <Text style={s.tipText}>{t.text}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={s.count}>
      <Animated.Text key={n} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[s.countNum, { color }]}>
        {n}
      </Animated.Text>
      <Text style={s.countLabel}>{label}</Text>
    </View>
  );
}

function DayCapsule({ day, on, locked, onPress }: { day: string; on: boolean; locked: boolean; onPress: () => void }) {
  const p = useOn(on);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.steps]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.steps]),
    transform: [{ translateY: -4 * p.get() }],
  }));
  return (
    <PressableScale
      scaleTo={0.92}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: locked }}
      accessibilityLabel={`${day}: ${on ? 'rest day' : 'workout day'}`}
      onPress={() => {
        if (locked) return;
        tap();
        onPress();
      }}
      style={{ flex: 1, opacity: locked ? 0.45 : 1 }}>
      <Animated.View style={[s.day, box, shadowSm]}>
        <Text style={[s.dayShort, on && { color: C.white }]}>{day.slice(0, 3)}</Text>
        <Animated.View key={on ? 'rest' : 'train'} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[s.dayIcon, { backgroundColor: on ? 'rgba(255,255,255,0.18)' : C.primarySoft }]}>
          <Ionicons name={on ? 'moon' : 'barbell'} size={14} color={on ? C.white : C.primaryDark} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  presets: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  preset: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  presetOn: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  presetText: { fontSize: 13, fontWeight: '700', color: C.textSoft },

  week: { flexDirection: 'row', gap: 6, marginTop: 22 },
  day: { height: 96, borderRadius: R.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 10 },
  dayShort: { fontSize: 12.5, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  dayIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  summary: { marginTop: 22, padding: 16, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, ...shadowSm },
  counts: { flexDirection: 'row', alignItems: 'center' },
  count: { flex: 1, alignItems: 'center' },
  countNum: { fontSize: 30, fontWeight: '900', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  countLabel: { fontSize: 12, fontWeight: '700', color: C.muted, marginTop: -2 },
  divider: { width: 1, height: 34, backgroundColor: C.border },
  bar: { flexDirection: 'row', gap: 4, marginTop: 14 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  tipText: { flex: 1, fontSize: 13, color: C.textSoft, lineHeight: 18 },
});
