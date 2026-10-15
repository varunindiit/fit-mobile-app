import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { tap } from '@/components/ui';
import { C } from '@/theme';

const TICK = 10; // px between ticks
const clear = 'rgba(245,245,244,0)';

/**
 * Horizontal ruler picker: ticks every `step`, a labelled long tick every `major` steps, and a fixed
 * brand-coloured needle in the centre. Only user scrolling emits `onChange`; outside changes re-align it.
 * Renders only the groups around the current position (long weight ranges have thousands of ticks) —
 * windowed by hand because FlatList's virtual window went stale after programmatic scrolls and left it blank.
 */
export function RulerPicker({
  min,
  max,
  step,
  major = 10,
  value,
  onChange,
  label = (v) => String(Math.round(v)),
}: {
  min: number;
  max: number;
  step: number;
  major?: number;
  value: number;
  onChange: (v: number) => void;
  label?: (v: number) => string;
}) {
  const [w, setW] = useState(0);
  const ref = useRef<ScrollView>(null);
  const count = Math.round((max - min) / step);
  const idx = Math.max(0, Math.min(count, Math.round((value - min) / step)));
  const idxRef = useRef(idx);
  const [at, setAt] = useState(idx); // tick the render window is centred on
  const [initial] = useState(() => ({ x: idx * TICK, y: 0 }));
  const lastIdx = useRef(-1);
  const dragging = useRef(false);
  const ignoreUntil = useRef(0); // programmatic scrolls also fire onScroll; skip those
  const itemW = major * TICK;
  const pad = w / 2;

  const jump = (i: number) => {
    ignoreUntil.current = Date.now() + 120;
    lastIdx.current = i;
    setAt(i);
    ref.current?.scrollTo({ x: i * TICK, animated: false });
  };

  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  // Follow outside changes (unit switch, defaults). Never while the finger/momentum is driving it —
  // kg↔lb rounding can echo back a neighbouring tick; that is re-aligned once the scroll settles.
  useEffect(() => {
    if (!w || dragging.current || lastIdx.current === idx) return;
    jump(idx);
  }, [idx, w]);

  const settle = () => {
    dragging.current = false;
    if (lastIdx.current !== idxRef.current) jump(idxRef.current);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < ignoreUntil.current) return;
    const i = Math.max(0, Math.min(count, Math.round(e.nativeEvent.contentOffset.x / TICK)));
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      setAt(i);
      tap();
      onChange(Math.round((min + i * step) * 10) / 10);
    }
  };

  const span = Math.ceil(w / itemW / 2) + 3;
  const centre = Math.floor(at / major);
  const from = Math.max(0, centre - span);
  const to = Math.min(Math.floor(count / major), centre + span);
  const groups: number[] = [];
  for (let g = from; g <= to; g++) groups.push(g);

  return (
    <View style={s.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK}
          decelerationRate="fast"
          scrollEventThrottle={16}
          contentOffset={initial}
          onLayout={() => jump(idxRef.current)}
          onScroll={onScroll}
          onScrollBeginDrag={() => (dragging.current = true)}
          onScrollEndDrag={(e) => {
            if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.x) < 0.01) settle();
          }}
          onMomentumScrollEnd={settle}
        >
          <View style={{ width: pad * 2 + count * TICK, height: 74 }}>
            {groups.map((g) => (
              <Group key={g} left={pad + g * itemW} g={g} major={major} count={count} text={label(min + g * major * step)} />
            ))}
          </View>
        </ScrollView>
      )}
      <LinearGradient pointerEvents="none" colors={[C.bg, clear]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fade, { left: 0 }]} />
      <LinearGradient pointerEvents="none" colors={[clear, C.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fade, { right: 0 }]} />
      <View pointerEvents="none" style={[s.needle, { left: w / 2 - 1.5 }]} />
    </View>
  );
}

const Group = memo(function Group({ left, g, major, count, text }: { left: number; g: number; major: number; count: number; text: string }) {
  return (
    <View style={[s.group, { left, width: major * TICK }]}>
      {Array.from({ length: major }, (_, j) => {
        const n = g * major + j;
        if (n > count) return null;
        const isMajor = j === 0;
        const half = major % 2 === 0 && j === major / 2;
        return <View key={j} style={[s.tick, { left: j * TICK }, isMajor ? s.tickMajor : half ? s.tickHalf : null]} />;
      })}
      <Text style={s.label} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { height: 74, justifyContent: 'center' },
  group: { position: 'absolute', top: 0, height: 74 },
  tick: { position: 'absolute', top: 0, width: 1.5, height: 16, borderRadius: 1, backgroundColor: '#C9C5C1', marginLeft: -0.75 },
  tickHalf: { height: 24 },
  tickMajor: { height: 34, width: 2, backgroundColor: '#8C8580', marginLeft: -1 },
  label: { position: 'absolute', top: 42, left: -24, width: 48, textAlign: 'center', fontSize: 12, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  needle: { position: 'absolute', top: -6, width: 3, height: 48, borderRadius: 2, backgroundColor: C.primary },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 56 },
});
