import React, { useEffect, useId, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { EASE_OUT } from '@/components/motion';
import { C, MOTION } from '@/theme';

/** 6840 → "6.8k", 10450 → "10.4k", 820 → "820" */
export const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(n)}`);
/** 10450 → "10,450" */
export const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** SVG text defaults to a serif face on web; native already uses the system font. */
const SVG_FONT = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' : undefined;

const APath = Animated.createAnimatedComponent(Path);
const AG = Animated.createAnimatedComponent(G);

function useWidth() {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.floor(e.nativeEvent.layout.width);
    setW((old) => (old === nw ? old : nw));
  };
  return [w, onLayout] as const;
}

/** Small "- - - Goal 10,000" legend shown next to chart titles. */
export function GoalLegend({ text, color = C.textSoft }: { text: string; color?: string }) {
  return (
    <View style={s.legend}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 4, height: 2, borderRadius: 1, backgroundColor: color }} />
        ))}
      </View>
      <Text style={[s.legendText, { color }]}>{text}</Text>
    </View>
  );
}

export type BarDatum = { key: string; label: string; value: number; highlight?: boolean; color?: string };

/** One bar: grows from the baseline on mount (staggered), then eases to new values. */
function Bar({ x, width, height, bottom, fill, faded, index, label, strong }: { x: number; width: number; height: number; bottom: number; fill: string; faded: boolean; index: number; label?: string; strong: boolean }) {
  const h = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    const to = withTiming(height, { duration: MOTION.progress, easing: EASE_OUT });
    h.set(first.current ? withDelay(index * 45, to) : to);
    first.current = false;
  }, [height, index, h]);
  const grow = useAnimatedStyle(() => ({ height: h.get() }));
  const r = Math.min(8, width / 2);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, width, bottom }, grow]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, opacity: faded ? 0.32 : 1, borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }]} />
      {!!label && (
        <View style={[s.barValueWrap, { left: width / 2 - 30 }]}>
          <Text numberOfLines={1} ellipsizeMode="clip" style={[s.barValue, strong && { color: C.text, fontWeight: '800' }]}>
            {label}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/** Responsive bar chart with optional dashed goal line. Highlighted bars are solid, others tinted. Bars grow in on mount. */
export function BarChart({ data, height = 170, color = C.primary, goal, format = fmtK }: { data: BarDatum[]; height?: number; color?: string; goal?: number; format?: (v: number) => string }) {
  const [w, onLayout] = useWidth();
  const top = 22;
  const bottom = 26;
  const plotH = height - top - bottom;
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value)) * 1.08;
  const slot = w / Math.max(1, data.length);
  const barW = Math.min(28, slot * 0.54);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const grid = [1 / 3, 2 / 3, 1].map((f) => top + plotH * (1 - f));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <>
          <Svg width={w} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {grid.map((gy) => (
              <Line key={gy} x1={0} x2={w} y1={gy} y2={gy} stroke={C.borderSoft} strokeWidth={StyleSheet.hairlineWidth * 2} />
            ))}
            <Line x1={0} x2={w} y1={top + plotH} y2={top + plotH} stroke={C.border} strokeWidth={1} />
          </Svg>
          {/* Goal line sits behind bars and value labels */}
          {!!goal && (
            <Svg width={w} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke={C.textSoft} strokeOpacity={0.5} strokeWidth={1.3} strokeDasharray="5 5" />
            </Svg>
          )}
          {data.map((d, i) => {
            const bh = d.value > 0 ? Math.max(6, (d.value / max) * plotH) : 4;
            return (
              <Bar
                key={d.key}
                x={i * slot + (slot - barW) / 2}
                width={barW}
                height={bh}
                bottom={bottom}
                fill={d.value > 0 ? (d.color ?? color) : C.border}
                faded={!d.highlight && d.value > 0}
                index={i}
                label={d.value > 0 ? format(d.value) : undefined}
                strong={!!d.highlight}
              />
            );
          })}
          {data.map((d, i) => (
            <Text key={`l${d.key}`} numberOfLines={1} style={[s.xLabel, { left: i * slot, width: slot }, d.highlight && s.xLabelOn]}>
              {d.label}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}

export type LinePoint = { key: string; label: string; value: number };

type LineProps = {
  data: LinePoint[];
  height?: number;
  color?: string;
  target?: number;
  targetColor?: string;
  format?: (v: number) => string;
  tooltip?: (p: LinePoint) => string;
};

/** Responsive smoothed line chart with dots, min/max labels, tap-to-inspect and a dashed target line. Draws itself in on mount. */
export function LineChart({ data, height = 210, color = C.weight, target, targetColor = C.primary, format = (v: number) => v.toFixed(1), tooltip }: LineProps) {
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  if (!data.length) return null;
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && <LinePlot w={w} sel={sel} onSelect={setSel} data={data} height={height} color={color} target={target} targetColor={targetColor} format={format} tooltip={tooltip} />}
    </View>
  );
}

/** Approximate length of a cubic bezier by sampling (used for the draw-in dash). */
function cubicLen(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  let len = 0;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

function LinePlot({
  w,
  sel,
  onSelect,
  data,
  height,
  color,
  target,
  targetColor,
  format,
  tooltip,
}: Required<Pick<LineProps, 'height' | 'color' | 'targetColor' | 'format'>> & Pick<LineProps, 'data' | 'target' | 'tooltip'> & { w: number; sel: number | null; onSelect: (i: number) => void }) {
  const gid = `lineFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 900, easing: EASE_OUT }));
  }, [p]);

  const n = data.length;
  const idx = sel != null && sel < n ? sel : n - 1;

  const padL = 40;
  const padR = 16;
  const top = 38;
  const bottom = 26;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = height - top - bottom;

  const vals = data.map((d) => d.value);
  const dMin = Math.min(...vals);
  const dMax = Math.max(...vals);
  let lo = dMin;
  let hi = dMax;
  const span = Math.max(hi - lo, 1);
  const targetInside = target != null && target >= lo - span * 1.5 && target <= hi + span * 1.5;
  if (targetInside) {
    lo = Math.min(lo, target!);
    hi = Math.max(hi, target!);
  }
  const pad = Math.max((hi - lo) * 0.14, 0.4);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const X = (i: number) => padL + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const Y = (v: number) => top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  let line = `M ${X(0)} ${Y(vals[0])}`;
  let len = 0;
  for (let i = 1; i < n; i++) {
    const mx = (X(i - 1) + X(i)) / 2;
    line += ` C ${mx} ${Y(vals[i - 1])} ${mx} ${Y(vals[i])} ${X(i)} ${Y(vals[i])}`;
    len += cubicLen(X(i - 1), Y(vals[i - 1]), mx, Y(vals[i - 1]), mx, Y(vals[i]), X(i), Y(vals[i]));
  }
  // Slight over-estimate so the sampled length never clips the end of the line.
  const dash = len * 1.04 + 4;
  const area = `${line} L ${X(n - 1)} ${top + plotH} L ${X(0)} ${top + plotH} Z`;

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: dash * (1 - p.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: interpolate(p.get(), [0.25, 1], [0, 1], Extrapolation.CLAMP) }));
  const dotsProps = useAnimatedProps(() => ({ opacity: interpolate(p.get(), [0.55, 1], [0, 1], Extrapolation.CLAMP) }));

  const tY = target == null ? 0 : targetInside ? Y(target) : target < yMin ? top + plotH : top;
  const sp = data[idx];
  const tipText = tooltip ? tooltip(sp) : `${format(sp.value)} · ${sp.label}`;
  const tipW = Math.max(72, tipText.length * 6.4 + 20);
  const tipX = Math.max(2, Math.min(w - tipW - 2, X(idx) - tipW / 2));
  const tipYRaw = Y(sp.value) - 38;
  const tipY = tipYRaw < 2 ? Y(sp.value) + 14 : tipYRaw;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const xLabels = n > 4 ? [0, Math.floor((n - 1) / 2), n - 1] : data.map((_, i) => i);
  const yLabels = [dMax, dMin].filter((v, i, a) => a.indexOf(v) === i && (target == null || Math.abs(Y(v) - tY) > 12));

  return (
    <>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={padL} x2={w - padR} y1={top + plotH} y2={top + plotH} stroke={C.borderSoft} strokeWidth={1} />
        {yLabels.map((v) => (
          <G key={`y${v}`}>
            <Line x1={padL} x2={w - padR} y1={Y(v)} y2={Y(v)} stroke={C.borderSoft} strokeWidth={1} />
            <SvgText fontFamily={SVG_FONT} x={padL - 8} y={Y(v) + 4} fontSize={10} fontWeight="600" fill={C.muted} textAnchor="end">
              {format(v)}
            </SvgText>
          </G>
        ))}
        {target != null && (
          <G>
            <Line x1={padL} x2={w - padR} y1={tY} y2={tY} stroke={targetColor} strokeOpacity={0.85} strokeWidth={1.4} strokeDasharray="6 5" />
            <SvgText fontFamily={SVG_FONT} x={padL - 8} y={tY + 4} fontSize={10} fontWeight="700" fill={targetColor} textAnchor="end">
              {targetInside ? format(target) : `${target < yMin ? '↓' : '↑'}${format(target)}`}
            </SvgText>
          </G>
        )}
        {n > 1 && <APath d={area} fill={`url(#${gid})`} animatedProps={areaProps} />}
        {n > 1 && <APath d={line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${dash} ${dash}`} animatedProps={lineProps} />}
        <AG animatedProps={dotsProps}>
          <Line x1={X(idx)} x2={X(idx)} y1={Y(sp.value)} y2={top + plotH} stroke={color} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
          {data.map((d, i) =>
            i === idx ? null : <Circle key={d.key} cx={X(i)} cy={Y(d.value)} r={3.5} fill={C.white} stroke={color} strokeWidth={2} />,
          )}
          <Circle cx={X(idx)} cy={Y(sp.value)} r={12} fill={color} fillOpacity={0.14} />
          <Circle cx={X(idx)} cy={Y(sp.value)} r={6.5} fill={color} stroke={C.white} strokeWidth={3} />
          <Rect x={tipX} y={tipY} width={tipW} height={26} rx={10} fill={C.navy} />
          <SvgText fontFamily={SVG_FONT} x={tipX + tipW / 2} y={tipY + 17} fontSize={11} fontWeight="700" fill={C.white} textAnchor="middle">
            {tipText}
          </SvgText>
        </AG>
        {xLabels.map((i) => (
          <SvgText fontFamily={SVG_FONT} key={`x${i}`} x={X(i)} y={height - 6} fontSize={10} fontWeight="600" fill={C.muted} textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {data[i].label}
          </SvgText>
        ))}
      </Svg>
      {data.map((d, i) => (
        <Pressable key={d.key} onPress={() => onSelect(i)} style={[s.hit, { left: X(i) - step / 2, width: step, height }]} />
      ))}
    </>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hit: { position: 'absolute', top: 0 },
  barValueWrap: { position: 'absolute', top: -18, width: 60, alignItems: 'center' },
  barValue: { fontSize: 10, fontWeight: '700', color: C.muted, fontVariant: ['tabular-nums'], backgroundColor: C.card, paddingHorizontal: 3, borderRadius: 4, overflow: 'hidden' },
  xLabel: { position: 'absolute', bottom: 4, textAlign: 'center', fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 0.2 },
  xLabelOn: { color: C.text, fontWeight: '800' },
});
