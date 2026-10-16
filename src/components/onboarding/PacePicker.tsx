import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { PACES, toUnit, useOn, type WeightUnit } from '@/components/onboarding/kit';
import { PressableScale, tap } from '@/components/ui';
import { C, R, glow, shadowSm } from '@/theme';

const NAMES = ['Easy', 'Steady', 'Balanced', 'Fast', 'Master'];
const BEST = 2; // the pace PACES marks as recommended

/** Row of pace tiles, Easy → Master. The chosen tile fills with the brand colour and lifts. */
export function PacePicker({ value, onChange, units }: { value: number; onChange: (i: number) => void; units: WeightUnit }) {
  return (
    <View style={s.row} accessibilityRole="radiogroup">
      {PACES.map((pc, i) => (
        <Tile key={pc.v} i={i} on={i === value} icon={pc.icon} kg={pc.v} units={units} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}

function Tile({ i, on, icon, kg, units, onPress }: { i: number; on: boolean; icon: (typeof PACES)[number]['icon']; kg: number; units: WeightUnit; onPress: () => void }) {
  const p = useOn(on);
  const tile = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primaryDark]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primaryDark]),
    transform: [{ translateY: -6 * p.get() }],
  }));
  const fg = on ? C.onPrimary : C.text;
  // kg paces are quarter steps; show them exactly rather than rounded to one decimal.
  const amount = units === 'kg' ? String(kg) : String(toUnit(kg, units));
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${NAMES[i]}, ${amount} ${units} per week`}
      onPress={() => {
        if (on) return;
        tap();
        onPress();
      }}
      style={{ flex: 1 }}>
      <Animated.View style={[s.tile, on ? glow(C.primaryDark) : shadowSm, tile]}>
        {i === BEST && (
          <View style={[s.best, on && { backgroundColor: C.gold }]}>
            <Text style={[s.bestText, on && { color: C.navy }]}>BEST</Text>
          </View>
        )}
        <View style={[s.icon, { backgroundColor: on ? 'rgba(255,255,255,0.16)' : C.primarySoft }]}>
          <Ionicons name={icon} size={17} color={on ? C.onPrimary : C.primaryDark} />
        </View>
        <Text style={[s.value, { color: fg }]}>{amount}</Text>
        <Text style={[s.unit, { color: on ? 'rgba(255,255,255,0.7)' : C.muted }]}>{units}/wk</Text>
        <Text style={[s.name, { color: on ? C.primaryTint : C.textSoft }]} numberOfLines={1} adjustsFontSizeToFit>
          {NAMES[i]}
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  tile: { alignItems: 'center', paddingTop: 14, paddingBottom: 12, paddingHorizontal: 4, borderRadius: R.lg, borderWidth: 1 },
  best: { position: 'absolute', top: -9, alignSelf: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.pill, backgroundColor: C.primary },
  bestText: { fontSize: 9, fontWeight: '900', color: C.white, letterSpacing: 0.8 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '800', marginTop: 8, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  unit: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 11, fontWeight: '800', marginTop: 6 },
});
