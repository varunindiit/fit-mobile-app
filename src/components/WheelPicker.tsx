import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C, R, shadowSm } from '@/theme';
import { IconButton, tap } from './ui';

const ITEM_H = 52;
const VISIBLE = 5;
const BAND_TOP = ITEM_H * Math.floor(VISIBLE / 2);

/** `#RRGGBB` → the same colour fully transparent, so edge fades blend into the backdrop. */
const clear = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
};

/** Snap-scrolling vertical wheel with +/- buttons. Works on iOS, Android and web. */
export function WheelPicker({
  values,
  value,
  onChange,
  format,
  unit,
  bg = C.bg,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  unit?: string;
  /** Colour behind the wheel (`#RRGGBB`); the top/bottom fades blend into it. */
  bg?: string;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = useMemo(() => {
    let best = 0;
    values.forEach((v, i) => {
      if (Math.abs(v - value) < Math.abs(values[best] - value)) best = i;
    });
    return best;
  }, [values, value]);
  const lastIdx = useRef(idx);
  const pending = useRef(idx); // latest requested index, so rapid +/- taps accumulate
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  const scrollToIdx = (i: number, animated = true) => ref.current?.scrollTo({ y: i * ITEM_H, animated });

  // Keep the wheel aligned when the value changes from outside (e.g. +/- buttons).
  useEffect(() => {
    pending.current = idx;
    if (lastIdx.current !== idx) {
      lastIdx.current = idx;
      if (!dragging.current) scrollToIdx(idx);
    }
  }, [idx]);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM_H)));
    // Only user-driven scrolling changes the value; programmatic scrolls just follow it.
    if (!dragging.current) return;
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      pending.current = i;
      onChange(values[i]);
    }
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      dragging.current = false;
      if (Math.abs(y - i * ITEM_H) > 1) scrollToIdx(i);
    }, 140);
  };

  const step = (d: number) => {
    const i = Math.max(0, Math.min(values.length - 1, pending.current + d));
    pending.current = i;
    onChange(values[i]);
  };

  return (
    <View style={s.wrap}>
      <IconButton icon="remove" bordered color={C.primaryDark} onPress={() => step(-1)} />
      <View style={s.wheel}>
        {/* Selection band sits under the list so the chosen value reads as "on" it. */}
        <View style={s.band} />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onScrollBeginDrag={() => (dragging.current = true)}
          onMomentumScrollBegin={() => (dragging.current = true)}
          onLayout={() => scrollToIdx(idx, false)}
          contentContainerStyle={{ paddingVertical: BAND_TOP }}>
          {values.map((v, i) => {
            const d = Math.abs(i - idx);
            return (
              <Pressable
                key={v}
                onPress={() => {
                  tap();
                  onChange(v);
                }}
                style={s.item}>
                <Text style={[s.itemText, d === 0 ? s.itemOn : d === 1 ? s.itemNear : s.itemFar]}>
                  {format ? format(v) : v}
                  {d === 0 && unit ? <Text style={s.unit}> {unit}</Text> : null}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <LinearGradient colors={[bg, clear(bg)]} style={[s.fade, s.fadeTop]} />
        <LinearGradient colors={[clear(bg), bg]} style={[s.fade, s.fadeBottom]} />
      </View>
      <IconButton icon="add" bg={C.primaryDark} color={C.onPrimary} onPress={() => step(1)} />
    </View>
  );
}

export const range = (from: number, to: number, stepBy = 1) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += stepBy) out.push(Math.round(v * 10) / 10);
  return out;
};

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  wheel: { height: ITEM_H * VISIBLE, width: 196, overflow: 'hidden' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: BAND_TOP,
    height: ITEM_H,
    borderRadius: R.md,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.border,
    ...shadowSm,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  itemOn: { fontSize: 30, color: C.text, fontWeight: '800', letterSpacing: -0.6 },
  itemNear: { fontSize: 21, color: C.muted },
  itemFar: { fontSize: 18, color: C.muted },
  unit: { fontSize: 15, color: C.muted, fontWeight: '700', letterSpacing: 0 },
  fade: { position: 'absolute', left: 0, right: 0, height: ITEM_H * 1.7, pointerEvents: 'none' },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
});
