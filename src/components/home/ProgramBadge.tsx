import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

import { Ring } from '@/components/ui';
import { C } from '@/theme';

const SIZE = 84;
const GLOW = 112;
const ALine = Animated.createAnimatedComponent(Line);

// Figure geometry in a 48×48 box.
const CX = 24;
const SHOULDER = 17;
const HIP = 30;
const ARM = 11;
const LEG = 14;
const DEG = Math.PI / 180;
const LIMB = { stroke: C.white, strokeWidth: 3.4, strokeLinecap: 'round' as const };

/** Looping jumping-jack figure (vector, so it never depends on emoji fonts). Holds a still pose with Reduce Motion. */
function JumpingJack({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0.35);

  useEffect(() => {
    if (reduce) {
      t.set(0.35);
      return;
    }
    t.set(withRepeat(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(t);
  }, [reduce, t]);

  // Arms swing from ~20° (down) to ~160° (overhead); legs spread from 6° to 26°.
  const armL = useAnimatedProps(() => {
    const a = (20 + t.get() * 140) * DEG;
    return { x2: CX - Math.sin(a) * ARM, y2: SHOULDER + Math.cos(a) * ARM };
  });
  const armR = useAnimatedProps(() => {
    const a = (20 + t.get() * 140) * DEG;
    return { x2: CX + Math.sin(a) * ARM, y2: SHOULDER + Math.cos(a) * ARM };
  });
  const legL = useAnimatedProps(() => {
    const a = (6 + t.get() * 20) * DEG;
    return { x2: CX - Math.sin(a) * LEG, y2: HIP + Math.cos(a) * LEG };
  });
  const legR = useAnimatedProps(() => {
    const a = (6 + t.get() * 20) * DEG;
    return { x2: CX + Math.sin(a) * LEG, y2: HIP + Math.cos(a) * LEG };
  });
  const hop = useAnimatedStyle(() => ({ transform: [{ translateY: -t.get() * 2.5 }] }));

  return (
    <Animated.View style={hop}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx={CX} cy={9.5} r={4.6} fill={C.white} />
        <Line x1={CX} y1={15} x2={CX} y2={HIP} {...LIMB} />
        <ALine x1={CX} y1={SHOULDER} x2={CX - ARM} y2={SHOULDER} animatedProps={armL} {...LIMB} />
        <ALine x1={CX} y1={SHOULDER} x2={CX + ARM} y2={SHOULDER} animatedProps={armR} {...LIMB} />
        <ALine x1={CX} y1={HIP} x2={CX - 4} y2={HIP + LEG} animatedProps={legL} {...LIMB} />
        <ALine x1={CX} y1={HIP} x2={CX + 4} y2={HIP + LEG} animatedProps={legR} {...LIMB} />
      </Svg>
    </Animated.View>
  );
}

/** Animated workout figure in a glowing disc, wrapped by a white progress ring (for gradient heroes). */
export function ProgramBadge({ progress }: { emoji?: string; progress: number }) {
  return (
    <View style={st.wrap}>
      <Svg pointerEvents="none" width={GLOW} height={GLOW} style={st.glow}>
        <Defs>
          <RadialGradient id="programGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor={C.white} stopOpacity={0.32} />
            <Stop offset="1" stopColor={C.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#programGlow)" />
      </Svg>
      <Ring size={SIZE} stroke={5} value={progress} color={C.white} track="rgba(255,255,255,0.24)">
        <View style={st.disc}>
          <JumpingJack size={46} />
        </View>
      </Ring>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', left: (SIZE - GLOW) / 2, top: (SIZE - GLOW) / 2 },
  disc: { width: SIZE - 20, height: SIZE - 20, borderRadius: (SIZE - 20) / 2, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
