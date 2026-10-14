import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C } from '@/theme';

/** 6840 → "6.8k", 10450 → "10.4k", 820 → "820" */
export const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(n)}`);
/** 10450 → "10,450" */
export const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

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

/** Responsive SVG bar chart with optional dashed goal line. Highlighted bars are solid, others tinted. */
export function BarChart({ data, height = 170, color = C.primary, goal, format = fmtK }: { data: BarDatum[]; height?: number; color?: string; goal?: number; format?: (v: number) => string }) {
  const [w, onLayout] = useWidth();
  const top = 20;
  const bottom = 26;
  const plotH = height - top - bottom;
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value)) * 1.08;
  const slot = w / Math.max(1, data.length);
  const barW = Math.min(30, slot * 0.56);
  const y = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={top + plotH} y2={top + plotH} stroke={C.borderSoft} strokeWidth={1} />
          {data.map((d, i) => {
            const x = i * slot + (slot - barW) / 2;
            const bh = d.value > 0 ? Math.max(6, (d.value / max) * plotH) : 4;
            const fill = d.value > 0 ? (d.color ?? color) : C.border;
            return (
              <G key={d.key}>
                <Rect x={x} y={top + plotH - bh} width={barW} height={bh} rx={Math.min(7, barW / 2)} fill={fill} fillOpacity={d.highlight || d.value === 0 ? 1 : 0.4} />
                {d.value > 0 && (
                  <SvgText x={x + barW / 2} y={top + plotH - bh - 6} fontSize={10} fontWeight="700" fill={d.highlight ? C.text : C.muted} textAnchor="middle">
                    {format(d.value)}
                  </SvgText>
                )}
                <SvgText x={x + barW / 2} y={height - 7} fontSize={11} fontWeight={d.highlight ? '800' : '600'} fill={d.highlight ? C.text : C.muted} textAnchor="middle">
                  {d.label}
                </SvgText>
              </G>
            );
          })}
          {!!goal && <Line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke={C.textSoft} strokeOpacity={0.55} strokeWidth={1.3} strokeDasharray="5 5" />}
        </Svg>
      )}
    </View>
  );
}

export type LinePoint = { key: string; label: string; value: number };

/** Responsive smoothed line chart with dots, min/max labels, tap-to-inspect and a dashed target line. */
export function LineChart({
  data,
  height = 210,
  color = C.weight,
  target,
  targetColor = C.primary,
  format = (v: number) => v.toFixed(1),
  tooltip,
}: {
  data: LinePoint[];
  height?: number;
  color?: string;
  target?: number;
  targetColor?: string;
  format?: (v: number) => string;
  tooltip?: (p: LinePoint) => string;
}) {
  const [w, onLayout] = useWidth();
  const [sel, setSel] = useState<number | null>(null);
  const n = data.length;
  if (!n) return null;
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
  for (let i = 1; i < n; i++) {
    const mx = (X(i - 1) + X(i)) / 2;
    line += ` C ${mx} ${Y(vals[i - 1])} ${mx} ${Y(vals[i])} ${X(i)} ${Y(vals[i])}`;
  }
  const area = `${line} L ${X(n - 1)} ${top + plotH} L ${X(0)} ${top + plotH} Z`;

  const tY = target == null ? 0 : targetInside ? Y(target) : target < yMin ? top + plotH : top;
  const sp = data[idx];
  const tipText = tooltip ? tooltip(sp) : `${format(sp.value)} · ${sp.label}`;
  const tipW = Math.max(72, tipText.length * 6.4 + 18);
  const tipX = Math.max(2, Math.min(w - tipW - 2, X(idx) - tipW / 2));
  const tipYRaw = Y(sp.value) - 36;
  const tipY = tipYRaw < 2 ? Y(sp.value) + 12 : tipYRaw;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const xLabels = n > 4 ? [0, Math.floor((n - 1) / 2), n - 1] : data.map((_, i) => i);
  const yLabels = [dMax, dMin].filter((v, i, a) => a.indexOf(v) === i && (target == null || Math.abs(Y(v) - tY) > 12));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {yLabels.map((v) => (
              <G key={`y${v}`}>
                <Line x1={padL} x2={w - padR} y1={Y(v)} y2={Y(v)} stroke={C.borderSoft} strokeWidth={1} />
                <SvgText x={padL - 8} y={Y(v) + 4} fontSize={10} fontWeight="700" fill={C.muted} textAnchor="end">
                  {format(v)}
                </SvgText>
              </G>
            ))}
            {target != null && (
              <G>
                <Line x1={padL} x2={w - padR} y1={tY} y2={tY} stroke={targetColor} strokeWidth={1.4} strokeDasharray="6 5" />
                <SvgText x={padL - 8} y={tY + 4} fontSize={10} fontWeight="800" fill={targetColor} textAnchor="end">
                  {targetInside ? format(target) : `${target < yMin ? '↓' : '↑'}${format(target)}`}
                </SvgText>
              </G>
            )}
            {n > 1 && <Path d={area} fill="url(#lineFill)" />}
            {n > 1 && <Path d={line} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            <Line x1={X(idx)} x2={X(idx)} y1={Y(sp.value)} y2={top + plotH} stroke={color} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
            {data.map((d, i) =>
              i === idx ? (
                <Circle key={d.key} cx={X(i)} cy={Y(d.value)} r={7} fill={color} stroke={C.white} strokeWidth={3} />
              ) : (
                <Circle key={d.key} cx={X(i)} cy={Y(d.value)} r={4} fill={C.white} stroke={color} strokeWidth={2.5} />
              ),
            )}
            <Rect x={tipX} y={tipY} width={tipW} height={24} rx={8} fill={C.navy} />
            <SvgText x={tipX + tipW / 2} y={tipY + 16} fontSize={11} fontWeight="700" fill={C.white} textAnchor="middle">
              {tipText}
            </SvgText>
            {xLabels.map((i) => (
              <SvgText key={`x${i}`} x={X(i)} y={height - 6} fontSize={10} fontWeight="600" fill={C.muted} textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                {data[i].label}
              </SvgText>
            ))}
          </Svg>
          {data.map((d, i) => (
            <Pressable key={d.key} onPress={() => setSel(i)} style={[s.hit, { left: X(i) - step / 2, width: step, height }]} />
          ))}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, fontWeight: '700' },
  hit: { position: 'absolute', top: 0 },
});
