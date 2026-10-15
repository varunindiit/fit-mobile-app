import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { tap } from '@/components/ui';
import { C } from '@/theme';

const ITEM_H = 60;
const VISIBLE = 5;
const fadeLine = ['rgba(18,168,125,0)', C.primary, 'rgba(18,168,125,0)'] as const;

/**
 * Snapping year wheel. Size and colour of every row follow the scroll position on the UI thread, so the
 * wheel glides continuously instead of re-rendering the whole list on each year it passes.
 */
export function YearWheel({ values, value, onChange }: { values: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const idx = Math.max(0, values.indexOf(value));
  const [initial] = useState(() => ({ x: 0, y: idx * ITEM_H }));
  const y = useSharedValue(idx * ITEM_H);
  const uiIdx = useSharedValue(idx);
  const lastIdx = useRef(idx);
  const max = values.length - 1;

  const emit = (i: number) => {
    if (i === lastIdx.current) return;
    lastIdx.current = i;
    tap();
    onChange(values[i]);
  };

  const pick = useCallback((i: number) => ref.current?.scrollTo({ y: i * ITEM_H, animated: true }), [ref]);

  // Follow outside changes (defaults, resume) without fighting a scroll the user is driving.
  useEffect(() => {
    if (lastIdx.current === idx) return;
    lastIdx.current = idx;
    uiIdx.set(idx);
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
  }, [idx, ref, uiIdx]);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
    const i = Math.max(0, Math.min(max, Math.round(e.contentOffset.y / ITEM_H)));
    if (i !== uiIdx.get()) {
      uiIdx.set(i);
      scheduleOnRN(emit, i);
    }
  });

  return (
    <View style={s.wheel}>
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentOffset={initial}
        onLayout={() => ref.current?.scrollTo({ y: lastIdx.current * ITEM_H, animated: false })}
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}>
        {values.map((v, i) => (
          <Row key={v} v={v} i={i} y={y} onPick={pick} />
        ))}
      </Animated.ScrollView>
      <LinearGradient pointerEvents="none" colors={fadeLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.line, { top: ITEM_H * 2 }]} />
      <LinearGradient pointerEvents="none" colors={fadeLine} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.line, { top: ITEM_H * 3 }]} />
    </View>
  );
}

const Row = memo(function Row({ v, i, y, onPick }: { v: number; i: number; y: SharedValue<number>; onPick: (i: number) => void }) {
  const box = useAnimatedStyle(() => {
    const d = Math.abs(y.get() / ITEM_H - i);
    return {
      opacity: interpolate(d, [0, 1, 2, 3], [1, 1, 0.8, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [0, 1, 2], [1, 0.8, 0.72], Extrapolation.CLAMP) }],
    };
  });
  const text = useAnimatedStyle(() => {
    const d = Math.abs(y.get() / ITEM_H - i);
    return { color: interpolateColor(Math.min(d, 2), [0, 1, 2], [C.text, '#B5B0AC', '#DAD7D4']) };
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={String(v)} onPress={() => onPick(i)} style={s.item}>
      <Animated.View style={box}>
        <Animated.Text style={[s.text, text]}>{v}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  wheel: { height: ITEM_H * VISIBLE, width: 220, alignSelf: 'center' },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  line: { position: 'absolute', left: 6, right: 6, height: 1.5 },
});
