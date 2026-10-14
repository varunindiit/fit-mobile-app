import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { tap } from '@/components/ui';
import { C } from '@/theme';

const ITEM_H = 54;
const VISIBLE = 7;

/** Plain snapping wheel: the centred value is large and dark, neighbours shrink and fade with distance. */
export function YearWheel({ values, value, onChange }: { values: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, values.indexOf(value));
  const lastIdx = useRef(-1);
  const ignoreUntil = useRef(0);

  const jump = (i: number, animated = false) => {
    ignoreUntil.current = Date.now() + (animated ? 400 : 120);
    ref.current?.scrollTo({ y: i * ITEM_H, animated });
  };

  useEffect(() => {
    if (lastIdx.current === idx) return;
    lastIdx.current = idx;
    jump(idx);
  }, [idx]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < ignoreUntil.current) return;
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      tap();
      onChange(values[i]);
    }
  };

  return (
    <View style={s.wheel}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentOffset={{ x: 0, y: idx * ITEM_H }}
        onLayout={() => jump(idx)}
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}>
        {values.map((v, i) => {
          const d = Math.abs(i - idx);
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: d === 0 }}
              onPress={() => {
                tap();
                lastIdx.current = i;
                jump(i, true);
                onChange(v);
              }}
              style={s.item}>
              <Text style={[s.text, { fontSize: d === 0 ? 34 : d === 1 ? 24 : 21, color: d === 0 ? C.text : d === 1 ? '#A8A29E' : '#D6D3D1', fontWeight: d === 0 ? '800' : '600' }]}>{v}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" style={[s.line, { top: ITEM_H * 3 }]} />
      <View pointerEvents="none" style={[s.line, { top: ITEM_H * 4 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wheel: { height: ITEM_H * VISIBLE, width: 200, alignSelf: 'center' },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  line: { position: 'absolute', left: 40, right: 40, height: 1, backgroundColor: C.border },
});
