import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Defs, G as Group, Path, Rect, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { IMG } from '@/components/onboarding/assets';
import { PressableScale, tap } from '@/components/ui';
import { cmToFtIn } from '@/lib/calc';
import type { Profile } from '@/lib/store';
import { C, G, ink, R, shadowSm } from '@/theme';

const STAGE_H = 250;
const STAGE_W = 128;
const BASE = 14; // floor line, from the stage bottom
const SCALE_MAX = 220; // cm at the very top of the stage
const PX = (STAGE_H - BASE - 10) / SCALE_MAX; // px per cm, so the scale and figure share one true proportion
const FIG_W = 64;
const FIG_H = 171;
/** Full-body cut-outs, cropped head-to-sole so the image height is exactly the person's height. */
const PHOTOS = {
  male: { src: IMG.heightMale, ratio: 330 / 900 },
  female: { src: IMG.heightFemale, ratio: 280 / 900 },
};
const FIG_X = 77; // figure centre within the stage
type Gender = Profile['gender'];
const MARK_H = 14; // label row height; centred on its value so text never depends on overflow
const SPRING = { damping: 20, stiffness: 170, mass: 0.9 };

const CM_MARKS = [50, 100, 150, 200].map((v) => ({ cm: v, text: String(v) }));
const FT_MARKS = [2, 4, 6].map((f) => ({ cm: f * 30.48, text: `${f}′` }));

/**
 * Height readout card: the value with its conversion and ± fine-tune on the left; on the right a figure
 * drawn to a true scale that springs to the chosen height, with a head-line marking it on the side scale.
 */
export function HeightStage({ cm, unit, gender, onStep, canDown, canUp }: { cm: number; unit: 'cm' | 'ft'; gender: Gender; onStep: (d: 1 | -1) => void; canDown: boolean; canUp: boolean }) {
  // Starts a little short so the figure grows into place on arrival.
  const h = useSharedValue(cm * 0.8);
  useEffect(() => {
    h.set(withSpring(cm, SPRING));
  }, [cm, h]);

  const photo = gender === 'other' ? null : PHOTOS[gender];
  const ratio = photo ? photo.ratio : FIG_W / FIG_H;
  const figure = useAnimatedStyle(() => {
    const height = h.get() * PX;
    const width = height * ratio;
    return { height, width, left: FIG_X - width / 2 };
  });
  const marker = useAnimatedStyle(() => ({ bottom: BASE + h.get() * PX - 1 }));
  const marks = unit === 'cm' ? CM_MARKS : FT_MARKS;

  return (
    <View style={s.card}>
      <LinearGradient colors={['rgba(228,245,238,0)', C.primarySoft]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={s.readout}>
        <Text style={s.eyebrow}>YOUR HEIGHT</Text>
        <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite">
          {unit === 'cm' ? cm : cmToFtIn(cm)}
          {unit === 'cm' && <Text style={s.unit}> cm</Text>}
        </Text>
        <View style={s.convert}>
          <Ionicons name="swap-horizontal" size={12} color={C.primaryDark} />
          <Text style={s.convertText}>{unit === 'cm' ? cmToFtIn(cm) : `${cm} cm`}</Text>
        </View>
        <View style={s.steppers}>
          <StepButton icon="remove" label="Decrease height" disabled={!canDown} onPress={() => onStep(-1)} />
          <StepButton icon="add" label="Increase height" disabled={!canUp} onPress={() => onStep(1)} />
        </View>
      </View>

      <View style={s.stage} pointerEvents="none">
        {marks.map((m) => (
          <View key={m.text} style={[s.mark, { bottom: BASE + m.cm * PX - MARK_H / 2 }]}>
            <Text style={s.markText}>{m.text}</Text>
            <View style={s.markTick} />
          </View>
        ))}
        <View style={s.floor} />
        <View style={s.shadow} />
        <Animated.View style={[s.figure, figure]}>
          {photo ? <Image source={photo.src} style={StyleSheet.absoluteFill} contentFit="contain" contentPosition="bottom" transition={200} /> : <Figure />}
        </Animated.View>
        <Animated.View style={[s.marker, marker]}>
          <View style={s.markerDot} />
          <View style={s.markerLine} />
        </Animated.View>
      </View>
    </View>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.step, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={20} color={C.primaryDark} />
    </PressableScale>
  );
}

/** Neutral brand-gradient pictogram for when no gender photo applies; scales from its feet. */
function Figure() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${FIG_W} ${FIG_H}`}>
      <Defs>
        <SvgGradient id="fig" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={G.brand[0]} />
          <Stop offset="1" stopColor={G.brand[1]} />
        </SvgGradient>
      </Defs>
      <Group fill="url(#fig)">
        <Circle cx={32} cy={13} r={12} />
        <Path d="M14 35 Q14 28 21 28 H43 Q50 28 50 35 V87 Q50 92 45 92 H19 Q14 92 14 87 Z" />
        <Rect x={3} y={30} width={8.5} height={56} rx={4.25} />
        <Rect x={52.5} y={30} width={8.5} height={56} rx={4.25} />
        <Rect x={17} y={89} width={13.5} height={82} rx={6.75} />
        <Rect x={33.5} y={89} width={13.5} height={82} rx={6.75} />
      </Group>
    </Svg>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12, paddingVertical: 14, borderRadius: R.xl, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft, overflow: 'hidden', ...shadowSm },
  readout: { flex: 1, paddingRight: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 1.4 },
  value: { fontSize: 50, fontWeight: '800', color: C.text, letterSpacing: -1.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 17, fontWeight: '700', color: C.textSoft, letterSpacing: 0 },
  convert: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, backgroundColor: C.primarySoft },
  convertText: { fontSize: 12.5, fontWeight: '700', color: C.primaryDark, fontVariant: ['tabular-nums'] },
  steppers: { flexDirection: 'row', gap: 10, marginTop: 20 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, ...shadowSm },

  stage: { width: STAGE_W, height: STAGE_H },
  mark: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4, height: MARK_H },
  markText: { width: 22, fontSize: 10, lineHeight: MARK_H, fontWeight: '700', color: C.muted, textAlign: 'right', fontVariant: ['tabular-nums'] },
  markTick: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  floor: { position: 'absolute', left: 26, right: 0, bottom: BASE - 1, height: 2, borderRadius: 1, backgroundColor: C.primaryTint },
  shadow: { position: 'absolute', left: 52, right: 26, bottom: BASE - 5, height: 9, borderRadius: R.pill, backgroundColor: ink(0.12) },
  figure: { position: 'absolute', bottom: BASE },
  marker: { position: 'absolute', left: 22, right: 0, flexDirection: 'row', alignItems: 'center', height: 2 },
  markerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, borderWidth: 2, borderColor: C.card, marginRight: -2 },
  markerLine: { flex: 1, height: 1.5, borderRadius: 1, backgroundColor: C.primary, opacity: 0.55 },
});
