import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { EASE_OUT } from '@/components/ui';

/** Number of body-shape levels, from 0 (cut) to SHAPES - 1 (extra). */
export const SHAPES = 7;

const APath = Animated.createAnimatedComponent(Path);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const AG = Animated.createAnimatedComponent(G);

/** Half-widths (from the centre line) at the ribcage, waist, belly, hips and thighs for body-fat level f ∈ [0, 1]. */
function widths(f: number, male: boolean) {
  'worklet';
  return male
    ? [64 + 8 * f, 49 + 26 * f, 50 + 33 * f, 53 + 24 * f, 55 + 21 * f]
    : [52 + 12 * f, 37 + 30 * f, 41 + 37 * f, 55 + 24 * f, 54 + 22 * f];
}

const Y = [0, 58, 104, 146, 200];

function outline(f: number, male: boolean) {
  'worklet';
  const w = widths(f, male);
  const L = (i: number) => 100 - w[i];
  const Rr = (i: number) => 100 + w[i];
  return (
    `M ${L(0)} ${Y[0]} ` +
    `C ${L(0)} ${Y[0] + 26}, ${L(1)} ${Y[1] - 22}, ${L(1)} ${Y[1]} ` +
    `C ${L(1)} ${Y[1] + 20}, ${L(2)} ${Y[2] - 20}, ${L(2)} ${Y[2]} ` +
    `C ${L(2)} ${Y[2] + 18}, ${L(3)} ${Y[3] - 20}, ${L(3)} ${Y[3]} ` +
    `C ${L(3)} ${Y[3] + 26}, ${L(4)} ${Y[4] - 18}, ${L(4)} ${Y[4]} ` +
    `L ${Rr(4)} ${Y[4]} ` +
    `C ${Rr(4)} ${Y[4] - 18}, ${Rr(3)} ${Y[3] + 26}, ${Rr(3)} ${Y[3]} ` +
    `C ${Rr(3)} ${Y[3] - 20}, ${Rr(2)} ${Y[2] + 18}, ${Rr(2)} ${Y[2]} ` +
    `C ${Rr(2)} ${Y[2] - 20}, ${Rr(1)} ${Y[1] + 20}, ${Rr(1)} ${Y[1]} ` +
    `C ${Rr(1)} ${Y[1] - 22}, ${Rr(0)} ${Y[0] + 26}, ${Rr(0)} ${Y[0]} Z`
  );
}

/** Soft roll of belly fat sitting over the waistband; grows and deepens with body fat. */
function fold(f: number, male: boolean) {
  'worklet';
  const w = widths(f, male)[3] * 0.72;
  const y = (male ? 140 : 142) + 4 * f;
  return `M ${100 - w} ${y - 6} Q ${100} ${y + 22 * f} ${100 + w} ${y - 6}`;
}

/** Waistband line of the shorts/briefs, curving under a bigger belly. */
function band(f: number, male: boolean) {
  'worklet';
  const y = male ? 150 : 152;
  return `M 0 ${y} Q 100 ${y + 6 + 6 * f} 200 ${y} L 200 200 L 0 200 Z`;
}

/** Crop-top / sports-bra band at the top for women; a subtle pec line for men. */
function top(f: number, male: boolean) {
  'worklet';
  if (male) {
    const d = 4 * f;
    return `M 34 ${16 + d} Q 64 ${46 + d * 2} 97 ${30 + d} M 103 ${30 + d} Q 136 ${46 + d * 2} 166 ${16 + d}`;
  }
  return `M 0 0 L 200 0 L 200 ${24 + 2 * f} Q 100 ${34 + 2 * f} 0 ${24 + 2 * f} Z`;
}

/**
 * Front-view torso illustration whose silhouette morphs with body-fat `level` (0 … SHAPES-1).
 * Every shape is computed on the UI thread, so the slider drives a smooth morph.
 */
export function BodyFigure({ level, gender, size = 220, style }: { level: number; gender: 'male' | 'female' | 'other'; size?: number; style?: StyleProp<ViewStyle> }) {
  const male = gender === 'male';
  const target = Math.max(0, Math.min(1, level / (SHAPES - 1)));
  const f = useSharedValue(target);
  useEffect(() => {
    f.set(withTiming(target, { duration: 520, easing: EASE_OUT }));
  }, [target, f]);

  const body = useAnimatedProps(() => ({ d: outline(f.get(), male) }));
  const clip = useAnimatedProps(() => ({ d: outline(f.get(), male) }));
  const roll = useAnimatedProps(() => ({ d: fold(f.get(), male), strokeOpacity: Math.max(0, (f.get() - 0.3) / 0.7) * 0.55 }));
  const shorts = useAnimatedProps(() => ({ d: band(f.get(), male) }));
  const chest = useAnimatedProps(() => ({ d: top(f.get(), male) }));
  const navel = useAnimatedProps(() => ({ cy: 106 + 6 * f.get(), rx: 2.6 + 1.6 * f.get(), ry: 4.2 + 2.4 * f.get() }));
  const belly = useAnimatedProps(() => ({ rx: widths(f.get(), male)[2] * 0.9, ry: 34 + 16 * f.get(), opacity: 0.15 + 0.55 * f.get() }));
  const abs = useAnimatedProps(() => ({ opacity: Math.pow(1 - f.get(), 1.6) * (male ? 0.6 : 0.42) }));

  const skinDark = male ? '#B07650' : '#BC8461';
  const skinMid = male ? '#D39B74' : '#DDA884';
  const skinLight = male ? '#E8B893' : '#F0C6A5';
  const id = male ? 'm' : 'f';

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id={`skin${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={skinDark} />
            <Stop offset="0.2" stopColor={skinMid} />
            <Stop offset="0.5" stopColor={skinLight} />
            <Stop offset="0.8" stopColor={skinMid} />
            <Stop offset="1" stopColor={skinDark} />
          </LinearGradient>
          <RadialGradient id={`belly${id}`} cx="0.5" cy="0.35" r="0.6">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
            <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor={skinDark} stopOpacity={0.35} />
          </RadialGradient>
          <LinearGradient id={`cloth${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2A2624" />
            <Stop offset="1" stopColor="#141210" />
          </LinearGradient>
          <ClipPath id={`clip${id}`}>
            <APath animatedProps={clip} />
          </ClipPath>
        </Defs>

        <APath animatedProps={body} fill={`url(#skin${id})`} />
        <G clipPath={`url(#clip${id})`}>
          <AEllipse animatedProps={belly} cx={100} cy={112} fill={`url(#belly${id})`} />
          {/* Abdominal definition fades out as body fat rises */}
          <AG animatedProps={abs}>
            <Path d="M 100 34 L 100 134" stroke={skinDark} strokeWidth={2.2} strokeLinecap="round" />
            <Path d="M 80 62 Q 90 66 98 63 M 102 63 Q 110 66 120 62" stroke={skinDark} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d="M 81 86 Q 90 90 98 87 M 102 87 Q 110 90 119 86" stroke={skinDark} strokeWidth={2} fill="none" strokeLinecap="round" />
            {male && <Path d="M 83 110 Q 91 113 98 111 M 102 111 Q 109 113 117 110" stroke={skinDark} strokeWidth={1.8} fill="none" strokeLinecap="round" />}
            <Path d="M 62 92 Q 72 124 88 146 M 138 92 Q 128 124 112 146" stroke={skinDark} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </AG>
          <AEllipse animatedProps={navel} cx={100} fill="#7A4A30" opacity={0.75} />
          <APath animatedProps={roll} stroke={skinDark} strokeWidth={3} fill="none" strokeLinecap="round" />
          <APath animatedProps={shorts} fill={`url(#cloth${id})`} />
          {male ? (
            <APath animatedProps={chest} stroke={skinDark} strokeWidth={2.4} strokeOpacity={0.6} fill="none" strokeLinecap="round" />
          ) : (
            <APath animatedProps={chest} fill={`url(#cloth${id})`} />
          )}
        </G>
      </Svg>
    </View>
  );
}

/** Approximate body-fat range and verdict for a shape level. */
export function bodyFat(level: number, gender: 'male' | 'female' | 'other') {
  const male = gender === 'male';
  const ranges = male ? ['6%–9%', '10%–14%', '15%–19%', '20%–24%', '25%–29%', '30%–34%', '35%+'] : ['12%–15%', '16%–19%', '20%–25%', '26%–30%', '31%–35%', '36%–40%', '40%+'];
  const verdicts = ['Very lean', 'Athletic', 'Healthy', 'Average', 'A bit high', 'High', 'Very high'];
  const i = Math.max(0, Math.min(SHAPES - 1, Math.round(level)));
  return { range: ranges[i], verdict: verdicts[i], tone: i <= 2 ? ('good' as const) : i === 3 ? ('ok' as const) : ('high' as const) };
}
