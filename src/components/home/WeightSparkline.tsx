import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { C } from '@/theme';

const H = 56;
const PAD_Y = 6;
const PAD_X = 5;

/** Small trend line of recent weigh-ins with an optional dashed goal reference. */
export function WeightSparkline({ values, goal }: { values: number[]; goal?: number }) {
  const [w, setW] = useState(0);
  const all = goal != null ? [...values, goal] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(0.5, max - min);
  const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);
  const x = (i: number) => PAD_X + (i / Math.max(1, values.length - 1)) * (w - PAD_X * 2);
  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z` : '';
  const last = pts[pts.length - 1];

  return (
    <View>
      <View style={st.legend}>
        <Text style={st.legendText}>Last {values.length} weigh-ins</Text>
        {goal != null && (
          <View style={st.goalKey}>
            <View style={st.dashRow}>
              <View style={st.dashSeg} />
              <View style={st.dashSeg} />
            </View>
            <Text style={st.legendText}>Goal</Text>
          </View>
        )}
      </View>
      <View style={{ height: H }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
        {w > 0 && last && (
          <Svg width={w} height={H} pointerEvents="none">
            <Defs>
              <LinearGradient id="wtArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.weight} stopOpacity={0.18} />
                <Stop offset="1" stopColor={C.weight} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {goal != null && <Line x1={0} x2={w} y1={y(goal)} y2={y(goal)} stroke={C.muted} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />}
            <Path d={area} fill="url(#wtArea)" />
            <Path d={line} stroke={C.weight} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={last[0]} cy={last[1]} r={4.5} fill={C.card} stroke={C.weight} strokeWidth={2} />
          </Svg>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  legendText: { fontSize: 11, fontWeight: '600', color: C.muted },
  goalKey: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dashRow: { flexDirection: 'row', gap: 2 },
  dashSeg: { width: 5, height: 1.5, borderRadius: 1, backgroundColor: C.muted },
});
