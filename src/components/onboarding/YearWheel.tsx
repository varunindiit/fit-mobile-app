import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
const FADE_TOP = [C.card, 'rgba(255,255,255,0)'] as const;
const FADE_BOTTOM = ['rgba(255,255,255,0)', C.card] as const;

/**
 * Snapping year wheel. Size and colour of every row follow the scroll position on the UI thread, so the
 * wheel glides continuously instead of re-rendering the whole list on each year it passes.
 * The centre row sits on a mint band; `left` / `right` render inside that band (e.g. a caption and a live age).
 * Meant to sit on a white card: the top and bottom fade into `C.card`.
 */
export function YearWheel({ values, value, onChange, left, right }: { values: number[]; value: number; onChange: (v: number) => void; left?: ReactNode; right?: ReactNode }) {
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
      <View pointerEvents="none" style={s.band} />
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
      <LinearGradient pointerEvents="none" colors={FADE_TOP} style={[s.fade, { top: 0 }]} />
      <LinearGradient pointerEvents="none" colors={FADE_BOTTOM} style={[s.fade, { bottom: 0 }]} />
      {left ? <View pointerEvents="none" style={[s.slot, { left: 22 }]}>{left}</View> : null}
      {right ? <View pointerEvents="none" style={[s.slot, { right: 18 }]}>{right}</View> : null}
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
    return { color: interpolateColor(Math.min(d, 2), [0, 1, 2], [C.primaryDark, '#B5B0AC', '#DAD7D4']) };
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
  wheel: { height: ITEM_H * VISIBLE, alignSelf: 'stretch' },
  band: { position: 'absolute', top: ITEM_H * 2 + 2, height: ITEM_H - 4, left: 10, right: 10, borderRadius: 18, backgroundColor: C.primarySoft },
  fade: { position: 'absolute', left: 0, right: 0, height: ITEM_H * 1.6 },
  slot: { position: 'absolute', top: ITEM_H * 2, height: ITEM_H, justifyContent: 'center' },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 42, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
});
