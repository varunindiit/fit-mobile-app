import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G as SvgG, Line, Path } from 'react-native-svg';

import { C } from '@/theme';

const W = 84;
const H = 76;
const CX = 42;
const CY = 38;
const FOOD_R = 17;

const ALine = Animated.createAnimatedComponent(Line);

/** Pie wedge from angle a0 to a1 (degrees, 0 = 12 o'clock). */
function wedge(a0: number, a1: number, r: number) {
  const rad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x0 = CX + r * Math.cos(rad(a0));
  const y0 = CY + r * Math.sin(rad(a0));
  const x1 = CX + r * Math.cos(rad(a1));
  const y1 = CY + r * Math.sin(rad(a1));
  return `M${CX} ${CY} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/** Four-point sparkle centred on (x, y). */
function sparkle(x: number, y: number, s: number) {
  const k = s * 0.28;
  return `M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z`;
}

const SEGMENTS = [
  { d: wedge(-90, 40, FOOD_R), fill: C.carbs },
  { d: wedge(40, 150, FOOD_R), fill: C.accent },
  { d: wedge(150, 270, FOOD_R), fill: C.primary },
];

// Scan-frame corner brackets.
const L = 11;
const X0 = 10;
const X1 = W - 10;
const Y0 = 6;
const Y1 = H - 6;
const CORNERS = [
  `M${X0} ${Y0 + L} V${Y0 + 4} Q${X0} ${Y0} ${X0 + 4} ${Y0} H${X0 + L}`,
  `M${X1 - L} ${Y0} H${X1 - 4} Q${X1} ${Y0} ${X1} ${Y0 + 4} V${Y0 + L}`,
  `M${X0} ${Y1 - L} V${Y1 - 4} Q${X0} ${Y1} ${X0 + 4} ${Y1} H${X0 + L}`,
  `M${X1 - L} ${Y1} H${X1 - 4} Q${X1} ${Y1} ${X1} ${Y1 - 4} V${Y1 - L}`,
];

/** Stylised plate with food segments inside an AI scan frame; a soft scan line sweeps over it. */
export function SnapPlateArt() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.inOut(Easing.quad);
    t.set(withRepeat(withSequence(withTiming(1, { duration: 1400, easing: ease }), withTiming(0, { duration: 1400, easing: ease })), -1, false));
  }, [reduce, t]);
  const scan = useAnimatedProps(() => {
    const y = 16 + t.get() * (H - 32);
    return { y1: y, y2: y };
  });

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
      {/* plate */}
      <Circle cx={CX} cy={CY + 1.5} r={25} fill={C.border} opacity={0.6} />
      <Circle cx={CX} cy={CY} r={25} fill={C.card} stroke={C.border} strokeWidth={1} />
      <Circle cx={CX} cy={CY} r={20} fill={C.surfaceAlt} />
      {/* food */}
      <SvgG>
        {SEGMENTS.map((s) => (
          <Path key={s.fill} d={s.d} fill={s.fill} stroke={C.card} strokeWidth={1.6} strokeLinejoin="round" />
        ))}
        <Circle cx={CX + 6} cy={CY - 8} r={1.6} fill={C.card} opacity={0.85} />
        <Circle cx={CX + 10} cy={CY - 3} r={1.3} fill={C.card} opacity={0.85} />
        <Circle cx={CX - 9} cy={CY + 3} r={1.6} fill={C.primaryTint} />
        <Circle cx={CX - 5} cy={CY - 6} r={1.3} fill={C.primaryTint} />
        <Circle cx={CX + 3} cy={CY + 10} r={1.5} fill={C.card} opacity={0.7} />
      </SvgG>
      {/* scan frame */}
      {CORNERS.map((d) => (
        <Path key={d} d={d} stroke={C.primary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      <ALine x1={X0 + 4} x2={X1 - 4} y1={CY} y2={CY} stroke={C.primary} strokeWidth={1.5} strokeLinecap="round" opacity={0.45} animatedProps={scan} />
      {/* AI sparkles */}
      <Path d={sparkle(X1 - 1, Y0 + 3, 6.5)} fill={C.ai} />
      <Path d={sparkle(X1 - 11, Y0 + 13, 3)} fill={C.primary} opacity={0.8} />
    </Svg>
  );
}
