import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { PressableScale, tap, type IconName } from '@/components/ui';
import { C, G, R, shadow } from '@/theme';

const COACH_PHOTO = require('@/assets/images/trainers/arjun-mehta.webp');

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: 'person', text: '1:1 coach' },
  { icon: 'chatbubbles', text: 'Chat & calls' },
  { icon: 'barbell', text: 'Custom workouts' },
];

const PHOTO = 56;
const FRAME = PHOTO + 8;
const SHEEN_W = 64;
const SHEEN = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)'] as const;

const openPlans = () => {
  tap();
  router.push({ pathname: '/plans', params: { tier: 'pro' } });
};

/**
 * Free and Smart only: sells Fittelo Pro's personal coach from the Home tab.
 *
 * Sits in the slot the old "ACTIVE PLAN" card used, in the same dark/gold family as
 * AssignedCoachCard. Pro members never see it — they get AssignedCoachCard instead. The
 * portrait is a sample certified coach, not the member's own; the whole card opens the
 * plans screen with Pro preselected.
 */
export function ProCoachPromo({ tier }: { tier: 'free' | 'smart' }) {
  const reduce = useReducedMotion();
  const halo = useSharedValue(0);
  const sheen = useSharedValue(0);
  const btnW = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    const breathe = { duration: 1600, easing: Easing.inOut(Easing.quad) };
    halo.set(withRepeat(withSequence(withTiming(1, breathe), withTiming(0, breathe)), -1, false));
    sheen.set(
      withDelay(
        900,
        withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withDelay(2800, withTiming(0, { duration: 0 }))), -1, false),
      ),
    );
    return () => {
      cancelAnimation(halo);
      cancelAnimation(sheen);
      halo.set(0);
      sheen.set(0);
    };
  }, [halo, sheen, reduce]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.get(), [0, 1], [0.45, 0.12]),
    transform: [{ scale: interpolate(halo.get(), [0, 1], [1, 1.16]) }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.get(), [0, 1], [-SHEEN_W, btnW.get()]) }, { skewX: '-18deg' }],
  }));

  return (
    <PressableScale scaleTo={0.98} onPress={openPlans} style={st.wrap} accessibilityRole="button" accessibilityLabel="Upgrade to Fittelo Pro and get your personal coach">
      <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Circle cx="92%" cy="8%" r={96} fill={C.gold} opacity={0.07} />
          <Circle cx="10%" cy="104%" r={80} fill={C.white} opacity={0.04} />
        </Svg>

        <View style={st.top}>
          <View style={{ flex: 1 }}>
            <View style={st.labelRow}>
              <View style={st.label}>
                <Ionicons name="diamond" size={12} color={C.gold} />
                <Text style={st.labelText}>FITTELO PRO</Text>
              </View>
              {tier === 'smart' && (
                <View style={st.currentPill}>
                  <Text style={st.currentText}>{"YOU'RE ON SMART"}</Text>
                </View>
              )}
            </View>
            <Text style={st.title}>Unlock Your Personal Fitness Coach!</Text>
            <Text style={st.sub}>Get a dedicated trainer for your workouts and progress.</Text>
          </View>

          <View style={st.portrait}>
            <Animated.View style={[st.halo, haloStyle]} />
            <View style={st.frame}>
              <Image source={COACH_PHOTO} style={st.photo} contentFit="cover" accessibilityLabel="A Fittelo Pro certified coach" />
            </View>
            <View style={st.badgeWrap}>
              <View style={st.badge}>
                <Ionicons name="checkmark-circle" size={10} color={C.navy} />
                <Text style={st.badgeText}>Certified</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={st.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={st.benefit}>
              <Ionicons name={b.icon} size={12} color={C.gold} />
              <Text style={st.benefitText} numberOfLines={1}>
                {b.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={st.cta} onLayout={(e) => btnW.set(e.nativeEvent.layout.width)}>
          <Animated.View pointerEvents="none" style={[st.sheen, sheenStyle]}>
            <LinearGradient colors={SHEEN} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Text style={st.ctaText}>Get My Personal Coach</Text>
          <Ionicons name="arrow-forward" size={16} color={C.navy} />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 26, borderRadius: R.lg, ...shadow },
  card: { borderRadius: R.lg, padding: 16, overflow: 'hidden' },

  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 6 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelText: { color: C.gold, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  currentPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  currentText: { color: 'rgba(255,255,255,0.72)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: C.white, fontWeight: '800', fontSize: 17, lineHeight: 22, marginTop: 6, letterSpacing: -0.3 },

  portrait: { width: FRAME, height: FRAME + 8, alignItems: 'center' },
  halo: { position: 'absolute', top: 0, width: FRAME, height: FRAME, borderRadius: FRAME / 2, backgroundColor: 'rgba(245,196,81,0.28)' },
  frame: { width: FRAME, height: FRAME, borderRadius: FRAME / 2, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  photo: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, backgroundColor: 'rgba(245,196,81,0.12)' },
  badgeWrap: { position: 'absolute', bottom: 0, left: -8, right: -8, alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.gold, borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2.5, borderWidth: 1.5, borderColor: C.navy },
  badgeText: { color: C.navy, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.2 },

  sub: { color: 'rgba(255,255,255,0.72)', marginTop: 4, fontSize: 12.5, lineHeight: 17 },

  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(245,196,81,0.1)', borderWidth: 1, borderColor: 'rgba(245,196,81,0.22)' },
  benefitText: { color: C.white, fontSize: 11.5, fontWeight: '700' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: R.sm, backgroundColor: C.gold, marginTop: 12, overflow: 'hidden' },
  ctaText: { fontWeight: '800', color: C.navy, fontSize: 14.5, letterSpacing: -0.1 },
  sheen: { position: 'absolute', top: -4, bottom: -4, left: 0, width: SHEEN_W },
});
