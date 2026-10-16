import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { useOn } from '@/components/onboarding/kit';
import { nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { C, ink, MOTION, R, shadowSm } from '@/theme';

export type RewardOption = { t: string; label: string; icon: IconName; img: number };

const TALL = 214;
const SHORT = 164;

/**
 * Staggered two-column reward wall (tall/short, then short/tall). Photos carry their label on a soft
 * gradient; picked cards get a brand ring and tick. A strip underneath counts what's been chosen.
 */
export function RewardWall({ options, value, onToggle }: { options: RewardOption[]; value: string[]; onToggle: (t: string) => void }) {
  const cols = [options.filter((_, i) => i % 2 === 0), options.filter((_, i) => i % 2 === 1)];
  const n = value.length;
  return (
    <View>
      <View style={s.wall}>
        {cols.map((col, c) => (
          <View key={c} style={s.col}>
            {col.map((o, r) => (
              <RewardTile key={o.t} o={o} height={(r + c) % 2 === 0 ? TALL : SHORT} on={value.includes(o.t)} onPress={() => onToggle(o.t)} />
            ))}
          </View>
        ))}
      </View>
      <Animated.View key={n === 0 ? 'none' : 'some'} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={[s.strip, n > 0 && s.stripOn]}>
        <View style={[s.stripIcon, { backgroundColor: n > 0 ? C.gold : C.skeleton }]}>
          <Ionicons name="trophy" size={16} color={n > 0 ? C.navy : C.muted} />
        </View>
        <Text style={[s.stripText, n > 0 && { color: C.onPrimary }]}>
          {n === 0 ? 'Pick at least one reward to keep in mind.' : `${n} reward${n === 1 ? '' : 's'} waiting at the finish line`}
        </Text>
      </Animated.View>
    </View>
  );
}

function RewardTile({ o, height, on, onPress }: { o: RewardOption; height: number; on: boolean; onPress: () => void }) {
  const p = useOn(on);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.03 * p.get() }] }));
  const ring = useAnimatedStyle(() => ({ borderColor: interpolateColor(p.get(), [0, 1], ['rgba(255,255,255,0)', C.primary]) }));
  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={o.label}
      onPress={() => {
        tap();
        onPress();
      }}>
      {/* Shadow lives on the outer view; clipping on the inner one (iOS drops rounded clipping when both share a view). */}
      <Animated.View style={[s.tile, { height }, press]}>
        <View style={s.clip}>
          <Image source={o.img} style={[StyleSheet.absoluteFill, { borderRadius: R.xl }]} contentFit="cover" transition={200} />
          <LinearGradient colors={[ink(0), ink(0.82)]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <Animated.View pointerEvents="none" style={[s.ring, ring]} />
        <View style={s.foot}>
          <View style={[s.icon, on && { backgroundColor: C.primary }]}>
            <Ionicons name={o.icon} size={13} color={on ? C.onPrimary : C.white} />
          </View>
          <Text style={s.label} numberOfLines={2}>
            {o.label}
          </Text>
        </View>
        <View style={[s.check, on && s.checkOn]}>
          {on && (
            <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
              <Ionicons name="checkmark" size={14} color={C.onPrimary} />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  wall: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 12 },
  tile: { borderRadius: R.xl, backgroundColor: C.skeleton, ...shadowSm },
  clip: { ...StyleSheet.absoluteFill, borderRadius: R.xl, overflow: 'hidden' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: R.xl, borderWidth: 3 },
  foot: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 6 },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  label: { fontSize: 15, fontWeight: '800', color: C.white, letterSpacing: -0.2, lineHeight: 19 },
  check: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: ink(0.25), alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.white },

  strip: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: R.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.borderSoft },
  stripOn: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  stripIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stripText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: C.textSoft },
});
