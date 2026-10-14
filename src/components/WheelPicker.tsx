import { useEffect, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { C } from '@/theme';
import { IconButton, tap } from './ui';

const ITEM_H = 52;
const VISIBLE = 5;

/** Snap-scrolling vertical wheel with +/- buttons. Works on iOS, Android and web. */
export function WheelPicker({ values, value, onChange, format, unit }: { values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string; unit?: string }) {
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
      <IconButton icon="remove" bg={C.primarySoft} color={C.primaryDark} onPress={() => step(-1)} />
      <View style={s.wheel}>
        <View pointerEvents="none" style={s.highlight} />
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
          contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}>
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
      </View>
      <IconButton icon="add" bg={C.primary} color={C.white} onPress={() => step(1)} />
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
  wheel: { height: ITEM_H * VISIBLE, width: 190, overflow: 'hidden' },
  highlight: { position: 'absolute', left: 0, right: 0, top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H, borderRadius: 14, backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.primary },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontWeight: '700' },
  itemOn: { fontSize: 30, color: C.text, fontWeight: '800' },
  itemNear: { fontSize: 22, color: C.muted },
  itemFar: { fontSize: 18, color: C.border },
  unit: { fontSize: 16, color: C.textSoft, fontWeight: '700' },
});
