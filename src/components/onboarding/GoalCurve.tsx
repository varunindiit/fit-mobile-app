import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { EASE_OUT } from '@/components/ui';
import { C } from '@/theme';

const APath = Animated.createAnimatedComponent(Path);

/**
 * Smooth progress curve from today's value to the goal. The line draws itself in, the area fades in,
 * then the goal marker and its badge pop in. Re-draws when `from` / `to` change.
 */
export function GoalCurve({
  from,
  to,
  fromText,
  toText,
  startTag = 'Today',
  badge,
  height = 150,
}: {
  from: number;
  to: number;
  fromText: string;
  toText: string;
  startTag?: string;
  badge?: string;
  height?: number;
}) {
  const [w, setW] = useState(0);
  const pad = 14;
  const top = 34;
  const bottom = height - 18;
  const hi = Math.max(from, to);
  const lo = Math.min(from, to);
  const y = (v: number) => (hi - lo < 0.05 ? (top + bottom) / 2 : top + ((hi - v) / (hi - lo)) * (bottom - top));
  const x0 = pad;
  const x1 = Math.max(pad + 1, w - pad);
  const y0 = y(from);
  const y1 = y(to);
  const path = `M ${x0} ${y0} C ${x0 + (x1 - x0) * 0.45} ${y0}, ${x0 + (x1 - x0) * 0.5} ${y1}, ${x1} ${y1}`;
  const area = `${path} L ${x1} ${height} L ${x0} ${height} Z`;
  const len = Math.hypot(x1 - x0, y1 - y0) * 1.3 + 30;

  const prog = useSharedValue(0);
  useEffect(() => {
    if (!w) return;
    prog.set(0);
    prog.set(withDelay(180, withTiming(1, { duration: 1100, easing: EASE_OUT })));
  }, [prog, w, from, to]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - prog.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: prog.get() }));
  const end = useAnimatedStyle(() => ({ opacity: interpolate(prog.get(), [0.7, 1], [0, 1], 'clamp'), transform: [{ scale: interpolate(prog.get(), [0.7, 1], [0.4, 1], 'clamp') }] }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="gcLine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={C.accent} />
                <Stop offset="0.45" stopColor={C.carbs} />
                <Stop offset="1" stopColor={C.primary} />
              </LinearGradient>
              <LinearGradient id="gcFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.primary} stopOpacity={0.22} />
                <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={C.borderSoft} strokeWidth={1} />
            ))}
            <APath d={area} fill="url(#gcFill)" animatedProps={areaProps} />
            <APath d={path} stroke="url(#gcLine)" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} animatedProps={lineProps} />
            <Circle cx={x0} cy={y0} r={6} fill={C.white} stroke={C.accent} strokeWidth={3.5} />
          </Svg>
        )}
        {w > 0 && (
          <>
            <View style={[s.tag, { left: x0 - 4, top: y0 - 30 }]}>
              <Text style={s.tagText}>{startTag}</Text>
            </View>
            <Animated.View style={[s.endDot, { left: x1 - 9, top: y1 - 9 }, end]} />
            {badge && (
              <Animated.View style={[s.badge, { right: pad - 4, top: Math.max(0, y1 - 34) }, end]}>
                <Text style={s.badgeText}>{badge}</Text>
              </Animated.View>
            )}
          </>
        )}
      </View>
      <View style={s.foot}>
        <Text style={s.footText}>{fromText}</Text>
        <Text style={[s.footText, { color: C.primaryDark }]}>{toText}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tag: { position: 'absolute', backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: C.white, fontSize: 11, fontWeight: '800' },
  endDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: C.white, borderWidth: 4, borderColor: C.primary },
  badge: { position: 'absolute', backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  footText: { fontSize: 12, fontWeight: '700', color: C.textSoft, fontVariant: ['tabular-nums'] },
});
