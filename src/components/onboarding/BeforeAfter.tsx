import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { BodyShape, bodyFat } from '@/components/onboarding/BodyShape';
import { EASE_OUT, tap } from '@/components/ui';
import { C, R, shadow } from '@/theme';

const HANDLE = 40;
const EDGE = 0.06; // the divider never fully hides either side

/**
 * Before/after comparison: the goal photo fills the frame and the current one is revealed up to a
 * draggable divider. On arrival the divider sweeps once to show it can be moved, then rests in the middle.
 */
export function BeforeAfter({ before, after, gender, onDrag }: { before: number; after: number; gender: 'male' | 'female' | 'other'; /** Fires true on touch down and false on release, so a parent ScrollView can stop scrolling while the divider moves. */ onDrag?: (active: boolean) => void }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const ref = useRef<View>(null);
  const originX = useRef(0);
  const touched = useRef(false);
  const b = bodyFat(before, gender);
  const a = bodyFat(after, gender);

  useEffect(() => {
    if (!w || touched.current) return;
    const ease = { easing: Easing.inOut(Easing.cubic) };
    x.set(w * 0.84);
    x.set(withDelay(650, withSequence(withTiming(w * 0.2, { duration: 900, ...ease }), withTiming(w * 0.5, { duration: 700, easing: EASE_OUT }))));
  }, [w, x]);

  const move = (pageX: number) => x.set(Math.max(w * EDGE, Math.min(w * (1 - EDGE), pageX - originX.current)));

  const clip = useAnimatedStyle(() => ({ width: x.get() }));
  const divider = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // Each side's labels fade out as the divider sweeps over them.
  const leftText = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (x.get() - 70) / 70)) }));
  const rightText = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (w - x.get() - 70) / 70)) }));

  return (
    <View
      ref={ref}
      style={s.frame}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        const px = e.nativeEvent.pageX;
        touched.current = true;
        onDrag?.(true);
        tap();
        ref.current?.measureInWindow((ox) => {
          originX.current = ox;
          move(px);
        });
      }}
      onResponderMove={(e) => move(e.nativeEvent.pageX)}
      onResponderRelease={() => onDrag?.(false)}
      onResponderTerminate={() => onDrag?.(false)}
      accessibilityLabel={`Before: ${b.range} body fat. After: ${a.range} body fat.`}>
      {w > 0 && (
        <>
          <BodyShape level={after} gender={gender} style={StyleSheet.absoluteFill} />
          <Animated.View style={[s.clip, clip]}>
            <BodyShape level={before} gender={gender} style={{ width: w, height: '100%' }} />
          </Animated.View>

          <LinearGradient colors={['rgba(19,35,31,0)', 'rgba(19,35,31,0.82)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

          <Animated.View style={[s.chip, s.chipLeft, leftText]} pointerEvents="none">
            <Text style={s.chipText}>BEFORE</Text>
          </Animated.View>
          <Animated.View style={[s.chip, s.chipRight, { backgroundColor: C.primary }, rightText]} pointerEvents="none">
            <Ionicons name="sparkles" size={11} color={C.white} />
            <Text style={s.chipText}>AFTER</Text>
          </Animated.View>

          <Animated.View style={[s.foot, { left: 18 }, leftText]} pointerEvents="none">
            <Text style={s.footKey}>Today</Text>
            <Text style={s.footVal}>{b.verdict}</Text>
          </Animated.View>
          <Animated.View style={[s.foot, { right: 18, alignItems: 'flex-end' }, rightText]} pointerEvents="none">
            <Text style={s.footKey}>Your goal</Text>
            <Text style={[s.footVal, { color: C.primaryTint }]}>{a.verdict}</Text>
          </Animated.View>

          <Animated.View style={[s.divider, divider]} pointerEvents="none">
            <View style={s.line} />
            <View style={s.handle}>
              <Ionicons name="chevron-back" size={14} color={C.primaryDark} />
              <Ionicons name="chevron-forward" size={14} color={C.primaryDark} style={{ marginLeft: -4 }} />
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 0.95, borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.skeleton, ...shadow },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  chip: { position: 'absolute', top: 14, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill },
  chipLeft: { left: 14, backgroundColor: 'rgba(19,35,31,0.55)' },
  chipRight: { right: 14 },
  chipText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 1 },
  foot: { position: 'absolute', bottom: 16 },
  footKey: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  footVal: { fontSize: 17, fontWeight: '800', color: C.white, marginTop: 1, letterSpacing: -0.2 },
  divider: { position: 'absolute', top: 0, bottom: 0, left: -HANDLE / 2, width: HANDLE, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', top: 0, bottom: 0, width: 3, borderRadius: 2, backgroundColor: C.white },
  handle: { width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadow },
});
