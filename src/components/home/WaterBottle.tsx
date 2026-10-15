import { useEffect, useId } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';

import { EASE_OUT } from '@/components/ui';
import { C, MOTION } from '@/theme';

const W = 48;
const H = 68;
const TOP = 19; // inner top of the bottle body (fill at 100%)
const BOTTOM = 66; // inner bottom
const BODY = `M18 11 H30 V15 C30 19 44 20 44 28 V58 Q44 66 36 66 H12 Q4 66 4 58 V28 C4 20 18 19 18 15 Z`;

const ARect = Animated.createAnimatedComponent(Rect);

/** Water bottle whose fill level eases to `value` (0..1). */
export function WaterBottle({ value }: { value: number }) {
  const level = useSharedValue(0);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  useEffect(() => {
    level.set(withTiming(Math.max(0, Math.min(1, value)), { duration: MOTION.progress, easing: EASE_OUT }));
  }, [value, level]);
  const fill = useAnimatedProps(() => {
    const h = Math.max(0, (BOTTOM - TOP) * level.get());
    return { y: BOTTOM - h, height: h };
  });

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} pointerEvents="none">
      <Defs>
        <ClipPath id={`clip${id}`}>
          <Path d={BODY} />
        </ClipPath>
        <LinearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6CC3F0" />
          <Stop offset="1" stopColor={C.water} />
        </LinearGradient>
      </Defs>
      <Path d={BODY} fill={C.waterSoft} />
      <ARect x={0} width={W} fill={`url(#fill${id})`} clipPath={`url(#clip${id})`} animatedProps={fill} />
      {/* level ticks + glass highlight */}
      {[0.25, 0.5, 0.75].map((f) => {
        const y = BOTTOM - (BOTTOM - TOP) * f;
        return <Line key={f} x1={34} x2={40} y1={y} y2={y} stroke={C.card} strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />;
      })}
      <Rect x={9} y={30} width={4} height={24} rx={2} fill={C.card} opacity={0.55} />
      <Path d={BODY} fill="none" stroke={C.water} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={16} y={3} width={16} height={9} rx={3} fill={C.water} />
    </Svg>
  );
}
