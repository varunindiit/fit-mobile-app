import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { IMG } from '@/components/onboarding/assets';
import { useOn } from '@/components/onboarding/kit';
import { EASE_OUT, layoutTransition, nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { C, MOTION, R, glow, shadowSm } from '@/theme';

/* ---------------- Weight-loss story (experience step) ---------------- */

export type StoryOption = { v: string; t: string; s: string; icon: IconName; reply: string };

/** Two-column story tiles (the last one spans the row), with a coach reply that answers the pick. */
export function StoryGrid({ options, value, onChange }: { options: StoryOption[]; value: string; onChange: (v: string) => void }) {
  const picked = options.find((o) => o.v === value);
  return (
    <View>
      <View style={s.grid} accessibilityRole="radiogroup">
        {options.map((o, i) => (
          <StoryTile key={o.v} o={o} wide={i === options.length - 1 && options.length % 2 === 1} on={o.v === value} onPress={() => onChange(o.v)} />
        ))}
      </View>
      {picked && (
        <Animated.View key={picked.v} entering={nativeOnly(FadeInDown.duration(MOTION.enter).easing(EASE_OUT))} style={s.reply}>
          <Image source={IMG.coach} style={s.coach} contentFit="cover" contentPosition="top" />
          <View style={s.bubble}>
            <Text style={s.bubbleName}>Coach</Text>
            <Text style={s.bubbleText}>{picked.reply}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function StoryTile({ o, wide, on, onPress }: { o: StoryOption; wide: boolean; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const tile = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primarySoft]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primary]),
  }));
  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${o.t}. ${o.s}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={wide ? s.cellWide : s.cell}>
      <Animated.View style={[s.tile, wide && s.tileWide, tile]}>
        <View style={[s.tileIcon, wide && { marginBottom: 0 }, { backgroundColor: on ? C.primary : C.surfaceAlt }]}>
          <Ionicons name={o.icon} size={20} color={on ? C.white : C.primaryDark} />
        </View>
        <View style={wide ? { flex: 1 } : undefined}>
          <Text style={s.tileTitle}>{o.t}</Text>
          <Text style={s.tileSub}>{o.s}</Text>
        </View>
        {on && (
          <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={[s.tick, wide && s.tickWide]}>
            <Ionicons name="checkmark" size={13} color={C.white} />
          </Animated.View>
        )}
      </Animated.View>
    </PressableScale>
  );
}

/* ---------------- Workout intensity (level step) ---------------- */

export type IntensityOption = { v: string; t: string; tag: string; detail: string; bars: number };

/** Stacked intensity cards: a 3-bar meter shows how hard each is; the chosen card opens to explain it. */
export function IntensityList({ options, value, onChange }: { options: IntensityOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 12 }} accessibilityRole="radiogroup">
      {options.map((o) => (
        <IntensityCard key={o.v} o={o} on={o.v === value} onPress={() => onChange(o.v)} />
      ))}
    </View>
  );
}

function IntensityCard({ o, on, onPress }: { o: IntensityOption; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const card = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primaryDark]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.borderSoft, C.primaryDark]),
  }));
  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${o.t}, ${o.tag}. ${o.detail}`}
      onPress={() => {
        tap();
        onPress();
      }}>
      <Animated.View layout={layoutTransition} style={[s.card, on ? glow(C.primaryDark) : shadowSm, card]}>
        <View style={s.cardRow}>
          <View style={[s.meter, { backgroundColor: on ? 'rgba(255,255,255,0.12)' : C.surfaceAlt }]}>
            {[1, 2, 3].map((b) => (
              <View
                key={b}
                style={[s.bar, { height: 8 + b * 6 }, { backgroundColor: b <= o.bars ? (on ? C.gold : C.primary) : on ? 'rgba(255,255,255,0.22)' : C.border }]}
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, on && { color: C.white }]}>{o.t}</Text>
            <Text style={[s.cardTag, { color: on ? C.primaryTint : C.muted }]}>{o.tag}</Text>
          </View>
          <View style={[s.radio, on && s.radioOn]}>{on && <Ionicons name="checkmark" size={14} color={C.primaryDark} />}</View>
        </View>
        {on && (
          <Animated.Text entering={nativeOnly(FadeIn.duration(MOTION.base).delay(80))} style={s.cardDetail}>
            {o.detail}
          </Animated.Text>
        )}
      </Animated.View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47.9%', flexGrow: 1 },
  cellWide: { width: '100%' },
  tile: { minHeight: 132, padding: 14, borderRadius: R.lg, borderWidth: 1.5, ...shadowSm },
  tileWide: { minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileTitle: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  tileSub: { fontSize: 12.5, color: C.textSoft, marginTop: 3, lineHeight: 17 },
  // In the wide row the tick sits inline, centred with the icon and text.
  tickWide: { position: 'relative', top: 0, right: 0 },
  tick: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  reply: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 18 },
  coach: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.skeleton, borderWidth: 2, borderColor: C.card },
  bubble: { flex: 1, paddingHorizontal: 14, paddingVertical: 11, borderRadius: R.lg, borderBottomLeftRadius: 6, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder },
  bubbleName: { fontSize: 11, fontWeight: '800', color: C.ai, letterSpacing: 0.6, textTransform: 'uppercase' },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 2 },

  card: { padding: 16, borderRadius: R.lg, borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meter: { width: 50, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingBottom: 12 },
  bar: { width: 6, borderRadius: 3 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  cardTag: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: C.white, borderColor: C.white },
  cardDetail: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginTop: 12, paddingLeft: 64 },
});
