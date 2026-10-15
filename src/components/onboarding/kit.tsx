import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInRight, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { EASE_OUT, nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { C, MOTION, R, shadowSm } from '@/theme';

export const GUTTER = 20;

/** Goal pace, kg per week, Easy → Master. Shared by onboarding and Edit goals. */
export const PACES: { v: number; icon: IconName; note: string }[] = [
  { v: 0.25, icon: 'walk-outline', note: 'Slow and steady. Very easy to stick with.' },
  { v: 0.4, icon: 'thumbs-up-outline', note: 'Good choice! This level is easy for most people. Friendly for beginners.' },
  { v: 0.5, icon: 'barbell-outline', note: 'Recommended. The best balance of speed and comfort.' },
  { v: 0.75, icon: 'flash-outline', note: 'Faster results. Needs consistent effort every week.' },
  { v: 1, icon: 'flame-outline', note: 'Aggressive pace. Best for experienced, disciplined people.' },
];

/** Step content entrance: a short slide in the direction of travel. Starts slightly visible so there is no blank frame. */
export const stepIn = (dir: number) =>
  nativeOnly(
    FadeInRight.duration(MOTION.base + 120)
      .easing(EASE_OUT)
      .withInitialValues({ opacity: 0, transform: [{ translateX: dir * 36 }] }),
  );

/** 0 → 1 tween that follows a boolean, for eased selected states. */
export function useOn(on: boolean) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [on, p]);
  return p;
}

/* ---------------- Header ---------------- */

/** Back chevron, centred section label and a short progress track beneath it. */
export function OnbHeader({ section, progress, onBack }: { section: string; progress: number; onBack?: () => void }) {
  const p = useSharedValue(progress);
  useEffect(() => {
    p.set(withTiming(progress, { duration: MOTION.progress, easing: EASE_OUT }));
  }, [progress, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0.04, p.get()) * 100}%` }));
  return (
    <View style={s.header}>
      <View style={s.headerSide}>
        {onBack && (
          <Pressable onPress={() => { tap(); onBack(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [s.back, pressed && { opacity: 0.5 }]}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
        )}
      </View>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={s.section}>{section}</Text>
        <View style={s.track}>
          <Animated.View style={[s.trackFill, fill]} />
        </View>
      </View>
      <View style={s.headerSide} />
    </View>
  );
}

/* ---------------- Titles ---------------- */

/** Centred question title; wrap a word in `*stars*` to tint it with the brand colour. */
export function QTitle({ text, sub, style }: { text: string; sub?: string; style?: StyleProp<ViewStyle> }) {
  const parts = text.split('*');
  return (
    <View style={[{ paddingHorizontal: GUTTER }, style]}>
      <Text style={s.title} accessibilityRole="header">
        {parts.map((t, i) => (
          <Text key={i} style={i % 2 ? { color: C.primary } : undefined}>
            {t}
          </Text>
        ))}
      </Text>
      {sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

/* ---------------- Choice row ---------------- */

/** Full-width selectable row. Filled brand colour when selected; leading radio, image or icon; trailing check. */
export function ChoiceRow({
  title,
  sub,
  image,
  icon,
  radio,
  selected,
  onPress,
  detail,
}: {
  title: string;
  sub?: string;
  /** Small round illustration (e.g. a food icon) shown before the title. */
  image?: number;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  radio?: boolean;
  selected: boolean;
  onPress: () => void;
  /** Extra line revealed under the row while it is selected. */
  detail?: string;
}) {
  const p = useOn(selected);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.card, C.primary]),
    borderColor: interpolateColor(p.get(), [0, 1], [C.border, C.primary]),
  }));
  const label = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [C.text, C.white]) }));
  const subStyle = useAnimatedStyle(() => ({ color: interpolateColor(p.get(), [0, 1], [C.muted, 'rgba(255,255,255,0.85)']) }));
  const check = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: 0.6 + p.get() * 0.4 }] }));
  return (
    <View>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole={radio ? 'radio' : 'button'}
        accessibilityState={{ selected }}
        onPress={() => {
          tap();
          onPress();
        }}>
        <Animated.View style={[s.row, box]}>
          {radio && (
            <View style={[s.radio, selected && s.radioOn]}>
              {selected && <View style={s.radioDot} />}
            </View>
          )}
          {image !== undefined && (
            <View style={[s.rowEmoji, selected && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Image source={image} style={s.rowImage} contentFit="contain" />
            </View>
          )}
          {icon && (
            <View style={[s.rowEmoji, selected && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Ionicons name={icon} size={18} color={selected ? C.white : C.primaryDark} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Animated.Text style={[s.rowTitle, label]}>{title}</Animated.Text>
            {sub && <Animated.Text style={[s.rowSub, subStyle]}>{sub}</Animated.Text>}
          </View>
          {!radio && (
            <Animated.View style={[s.rowCheck, check]}>
              <Ionicons name="checkmark" size={15} color={C.primary} />
            </Animated.View>
          )}
        </Animated.View>
      </PressableScale>
      {detail && selected && (
        <Animated.View entering={nativeOnly(FadeInRight.duration(MOTION.base).easing(EASE_OUT))} style={s.detail}>
          <Ionicons name="sparkles" size={15} color={C.primaryDark} />
          <Text style={s.detailText}>{detail}</Text>
        </Animated.View>
      )}
    </View>
  );
}

/* ---------------- Tip card ---------------- */

/** `art` (an illustration) replaces the round icon badge when given. */
export function TipCard({ icon, art, tone = 'neutral', children, style }: { icon?: React.ComponentProps<typeof Ionicons>['name']; art?: React.ReactNode; tone?: 'neutral' | 'warn' | 'good'; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'warn' ? C.warningSoft : tone === 'good' ? C.primarySoft : C.surfaceAlt;
  const fg = tone === 'warn' ? C.warning : C.primaryDark;
  return (
    <View style={[s.tip, { backgroundColor: bg }, style]}>
      {art ?? (
        <View style={[s.tipIcon, { backgroundColor: tone === 'neutral' ? C.primarySoft : C.white }]}>
          <Ionicons name={icon ?? 'bulb'} size={17} color={fg} />
        </View>
      )}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/* ---------------- Step slider ---------------- */

/** Half the pill track's height: how far the pill reaches past the first and last dot. */
const PILL = 15;

/**
 * Discrete slider: a track of `count` dots with a draggable thumb. Tap anywhere on the track or drag to choose.
 * `variant="pill"` draws a thick rounded track; `anchor` fills the range between that step and the thumb,
 * and `label` floats above the thumb as it moves.
 */
export function StepSlider({ count, value, onChange, left, right, variant = 'line', anchor, label }: { count: number; value: number; onChange: (i: number) => void; left: string; right: string; variant?: 'line' | 'pill'; anchor?: number; label?: string }) {
  const [w, setW] = useState(0);
  const gap = count > 1 ? w / (count - 1) : 0;
  const pill = variant === 'pill';
  const from = anchor ?? 0;
  const x = useSharedValue(0);
  const a = useSharedValue(0);
  const ready = useSharedValue(0);
  const trackRef = useRef<View>(null);
  const originX = useRef(0);
  const dragging = useRef(false);
  const last = useRef(value);
  useEffect(() => {
    if (!w) return;
    last.current = value;
    if (ready.get() === 0) {
      x.set(value * gap);
      ready.set(1);
    } else if (!dragging.current) x.set(withSpring(value * gap, MOTION.spring));
  }, [value, gap, w, x, ready]);
  useEffect(() => {
    a.set(from * gap);
  }, [from, gap, a]);

  // Plain responder handlers (no gesture-handler root needed): grant measures the track, moves follow the finger.
  const move = (pageX: number) => {
    const nx = Math.max(0, Math.min(w, pageX - originX.current));
    x.set(nx);
    const i = Math.round(nx / Math.max(gap, 1));
    if (i !== last.current) {
      last.current = i;
      tap();
      onChange(i);
    }
  };
  const release = () => {
    dragging.current = false;
    x.set(withSpring(last.current * gap, MOTION.spring));
  };

  const half = pill ? 16 : 13;
  const thumb = useAnimatedStyle(() => ({ opacity: ready.get(), transform: [{ translateX: x.get() - half }] }));
  const tag = useAnimatedStyle(() => ({ opacity: ready.get(), transform: [{ translateX: x.get() - 60 }] }));
  const fill = useAnimatedStyle(() => {
    const lo = Math.min(x.get(), a.get());
    const hi = Math.max(x.get(), a.get());
    return pill ? { left: lo - PILL, width: hi - lo + PILL * 2 } : { left: lo, width: hi - lo };
  });
  const lo = Math.min(value, from);
  const hi = Math.max(value, from);

  return (
    <View style={{ paddingHorizontal: GUTTER + (pill ? PILL + 2 : 8) }}>
      {label ? (
        <View style={s.sliderTagRow}>
          <Animated.View pointerEvents="none" style={[s.sliderTag, tag]}>
            <Text style={s.sliderTagText}>{label}</Text>
          </Animated.View>
        </View>
      ) : null}
      <View
        ref={trackRef}
        style={s.sliderHit}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: count - 1, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(count - 1, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          dragging.current = true;
          const pageX = e.nativeEvent.pageX;
          trackRef.current?.measureInWindow((left) => {
            originX.current = left;
            move(pageX);
          });
        }}
        onResponderMove={(e) => move(e.nativeEvent.pageX)}
        onResponderRelease={release}
        onResponderTerminate={release}>
        <View style={pill ? s.pillTrack : s.sliderTrack} />
        <Animated.View style={[pill ? s.pillFill : s.sliderFill, fill]} />
        {Array.from({ length: count }, (_, i) => {
          const on = i >= lo && i <= hi;
          return pill ? (
            <View key={i} style={[s.pillDot, { left: i * gap - 3.5 }, on && s.pillDotOn]} />
          ) : (
            <View key={i} style={[s.sliderDot, { left: i * gap - 4 }, on && { backgroundColor: C.primary }]} />
          );
        })}
        <Animated.View pointerEvents="none" style={[s.sliderThumb, pill && s.pillThumb, thumb]}>
          <View style={[s.sliderThumbCore, pill && s.pillThumbCore]} />
        </Animated.View>
      </View>
      <View style={[s.sliderLabels, pill && { marginHorizontal: -PILL, marginTop: 10 }]}>
        <Text style={s.sliderLabel}>{left}</Text>
        <Text style={s.sliderLabel}>{right}</Text>
      </View>
    </View>
  );
}

/* ---------------- Unit toggle ---------------- */

/** Small two-option pill toggle (kg / lb, cm / ft). */
export function UnitToggle<T extends string>({ options, value, onChange }: { options: [T, T]; value: T; onChange: (v: T) => void }) {
  const p = useOn(value === options[1]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 58 }] }));
  return (
    <View style={s.unit}>
      <Animated.View style={[s.unitThumb, thumb]} />
      {options.map((o) => (
        <Pressable key={o} accessibilityRole="tab" accessibilityState={{ selected: value === o }} onPress={() => { tap(); onChange(o); }} style={s.unitItem}>
          <Text style={[s.unitText, value === o && { color: C.white }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- Photo tile ---------------- */

/** Rounded photo with a soft placeholder tint while loading. */
export function Photo({ source, style, position = 'center' }: { source: ImageSource | number; style?: StyleProp<ViewStyle>; position?: 'center' | 'top' | 'bottom' }) {
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: C.skeleton }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={position} transition={250} />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10 },
  headerSide: { width: 40 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.text, textTransform: 'uppercase' },
  track: { width: 120, height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 8, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2, backgroundColor: C.primary },

  title: { fontSize: 25, fontWeight: '800', color: C.text, letterSpacing: -0.5, lineHeight: 32, textAlign: 'center' },
  sub: { fontSize: 14, color: C.textSoft, lineHeight: 20, textAlign: 'center', marginTop: 8 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12, borderRadius: R.md, borderWidth: 1.5, ...shadowSm },
  rowEmoji: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowImage: { width: 30, height: 30 },
  rowTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  rowSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  rowCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.white, backgroundColor: 'rgba(255,255,255,0.2)' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.white },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 14, borderRadius: R.md, backgroundColor: C.primarySoft },
  detailText: { flex: 1, fontSize: 13, color: C.primaryDark, lineHeight: 18, fontWeight: '600' },

  tip: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.md, alignItems: 'center' },
  tipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  sliderHit: { height: 40, justifyContent: 'center' },
  sliderTrack: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: C.border },
  sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: C.primary },
  sliderDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6D3D1' },
  sliderThumb: { position: 'absolute', left: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.primary, ...shadowSm },
  sliderThumbCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginHorizontal: -8 },
  sliderLabel: { fontSize: 12, fontWeight: '600', color: C.textSoft },
  sliderTagRow: { height: 22, marginBottom: 2 },
  sliderTag: { position: 'absolute', left: 0, width: 120, alignItems: 'center' },
  sliderTagText: { fontSize: 13, fontWeight: '700', color: C.text },
  pillTrack: { position: 'absolute', left: -PILL, right: -PILL, height: PILL * 2, borderRadius: PILL, backgroundColor: C.primarySoft },
  pillFill: { position: 'absolute', height: PILL * 2, borderRadius: PILL, backgroundColor: C.primary },
  pillDot: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.primary, opacity: 0.35 },
  pillDotOn: { backgroundColor: C.white, opacity: 0.7 },
  pillThumb: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  pillThumbCore: { width: 0, height: 0 },

  unit: { flexDirection: 'row', width: 124, height: 34, borderRadius: 17, backgroundColor: C.border, padding: 3, alignSelf: 'center' },
  unitThumb: { position: 'absolute', top: 3, left: 3, width: 60, height: 28, borderRadius: 14, backgroundColor: C.primary },
  unitItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontSize: 14, fontWeight: '700', color: C.textSoft },
});

/* ---------------- Units ---------------- */

export type WeightUnit = 'kg' | 'lb';
const LB_PER_KG = 2.20462;
const r1 = (n: number) => Math.round(n * 10) / 10;
export const toUnit = (kg: number, u: WeightUnit) => r1(u === 'lb' ? kg * LB_PER_KG : kg);
/** Full precision so kg → lb → kg round-trips don't drift; round only for display. */
export const fromUnit = (v: number, u: WeightUnit) => (u === 'lb' ? v / LB_PER_KG : v);
export const fmtWeight = (kg: number, u: WeightUnit, digits = 1) => `${toUnit(kg, u).toFixed(digits)} ${u}`;
