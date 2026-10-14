import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { tap } from '@/components/ui';
import { C } from '@/theme';

const TICK = 10; // px between ticks
const clear = 'rgba(245,245,244,0)';

/**
 * Horizontal ruler picker: ticks every `step`, a labelled long tick every `major` steps, and a fixed
 * brand-coloured needle in the centre. Only user scrolling emits `onChange`; outside changes re-align it.
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
  const ref = useRef<FlatList<number>>(null);
  const count = Math.round((max - min) / step);
  const idx = Math.max(0, Math.min(count, Math.round((value - min) / step)));
  const lastIdx = useRef(-1);
  const ignoreUntil = useRef(0); // programmatic scrolls also fire onScroll; skip those
  const groups = Array.from({ length: Math.floor(count / major) + 1 }, (_, i) => i);
  const itemW = major * TICK;
  const pad = w / 2;

  const jump = (i: number) => {
    ignoreUntil.current = Date.now() + 120;
    ref.current?.scrollToOffset({ offset: i * TICK, animated: false });
  };

  // Follow outside changes (unit switch, defaults). User scrolling already set lastIdx, so it never fights the finger.
  useEffect(() => {
    if (!w || lastIdx.current === idx) return;
    lastIdx.current = idx;
    jump(idx);
  }, [idx, w]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Date.now() < ignoreUntil.current) return;
    const i = Math.max(0, Math.min(count, Math.round(e.nativeEvent.contentOffset.x / TICK)));
    if (i !== lastIdx.current) {
      lastIdx.current = i;
      tap();
      onChange(Math.round((min + i * step) * 10) / 10);
    }
  };

  return (
    <View style={s.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <FlatList
          ref={ref}
          horizontal
          data={groups}
          keyExtractor={(g) => String(g)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          initialNumToRender={Math.ceil(w / itemW) + 4}
          windowSize={7}
          getItemLayout={(_, i) => ({ length: itemW, offset: pad + i * itemW, index: i })}
          contentOffset={{ x: idx * TICK, y: 0 }}
          ListHeaderComponent={<View style={{ width: pad }} />}
          ListFooterComponent={<View style={{ width: pad - TICK }} />}
          onLayout={() => jump(idx)}
          renderItem={({ item: g }) => (
            <View style={{ width: itemW, height: 74 }}>
              {Array.from({ length: major }, (_, j) => {
                const n = g * major + j;
                if (n > count) return null;
                const isMajor = j === 0;
                const half = major % 2 === 0 && j === major / 2;
                return <View key={j} style={[s.tick, { left: j * TICK }, isMajor ? s.tickMajor : half ? s.tickHalf : null]} />;
              })}
              <Text style={s.label} numberOfLines={1}>
                {label(min + g * major * step)}
              </Text>
            </View>
          )}
        />
      )}
      <LinearGradient pointerEvents="none" colors={[C.bg, clear]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fade, { left: 0 }]} />
      <LinearGradient pointerEvents="none" colors={[clear, C.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fade, { right: 0 }]} />
      <View pointerEvents="none" style={[s.needle, { left: w / 2 - 1.5 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { height: 74, justifyContent: 'center' },
  tick: { position: 'absolute', top: 0, width: 1.5, height: 16, borderRadius: 1, backgroundColor: '#C9C5C1', marginLeft: -0.75 },
  tickHalf: { height: 24 },
  tickMajor: { height: 34, width: 2, backgroundColor: '#8C8580', marginLeft: -1 },
  label: { position: 'absolute', top: 42, left: -24, width: 48, textAlign: 'center', fontSize: 12, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  needle: { position: 'absolute', top: -6, width: 3, height: 48, borderRadius: 2, backgroundColor: C.primary },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 56 },
});
