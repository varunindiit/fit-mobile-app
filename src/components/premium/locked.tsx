import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GOLD } from '@/components/profile/shared';
import { Button, Card, enter, IconButton, PressableScale, Screen, T, tap, type IconName } from '@/components/ui';
import { PLAN_TIERS, type PlanTier } from '@/data/plans';
import type { Lock } from '@/lib/entitlements';
import { C, G, R, shadow } from '@/theme';
import Animated from 'react-native-reanimated';

/** Open the paywall pre-selected on the plan a lock needs. */
export const openUpgrade = (need: PlanTier) => {
  tap();
  router.push({ pathname: '/plans', params: { tier: need } });
};

const TIER_ICON: Record<PlanTier, IconName> = { smart: 'sparkles', pro: 'diamond' };

/** Small "SMART"/"PRO" lock chip for a locked row, card or day tile. */
export function LockBadge({ need, style, compact }: { need: PlanTier; style?: ViewStyle; compact?: boolean }) {
  return (
    <LinearGradient colors={GOLD as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.badge, compact && s.badgeCompact, style]}>
      <Ionicons name="lock-closed" size={compact ? 9 : 10} color={C.navy} />
      {!compact && <Text style={s.badgeText}>{need === 'pro' ? 'PRO' : 'SMART'}</Text>}
    </LinearGradient>
  );
}

/** Round lock disc for overlaying artwork (day tiles, exercise tiles). */
export function LockDisc({ size = 26, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View style={[s.disc, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Ionicons name="lock-closed" size={Math.round(size * 0.52)} color={C.navy} />
    </View>
  );
}

/** Inline upgrade card for a locked section inside an otherwise usable screen. */
export function LockedCard({ lock, style }: { lock: Lock; style?: ViewStyle }) {
  return (
    <Card style={[s.inline, style] as ViewStyle[]}>
      <View style={s.inlineHead}>
        <LinearGradient colors={GOLD as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.inlineIcon}>
          <Ionicons name="lock-closed" size={18} color={C.navy} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>{lock.title}</Text>
          <Text style={[T.small, { marginTop: 3 }]}>{lock.text}</Text>
        </View>
      </View>
      <Button title={`Upgrade to ${lock.need === 'pro' ? 'Pro' : 'Smart'}`} icon={TIER_ICON[lock.need]} onPress={() => openUpgrade(lock.need)} style={{ marginTop: 14 }} />
    </Card>
  );
}

/**
 * Full-screen state shown instead of locked content (a Day 2+ workout on Free, the
 * trainer dashboard without Pro). Sells the plan the lock needs and lists what it adds.
 */
export function LockedScreen({ lock, eyebrow, onBack }: { lock: Lock; eyebrow?: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const plan = PLAN_TIERS.find((p) => p.id === lock.need) ?? PLAN_TIERS[0];
  const from = Math.min(...plan.durations.map((d) => d.price / d.months));

  return (
    <Screen edges={[]}>
      <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <View style={s.heroBar}>
          <IconButton icon="arrow-back" color={C.white} bg="rgba(255,255,255,0.14)" onPress={onBack} />
          <View style={{ flex: 1 }} />
        </View>
        <Animated.View entering={enter(0)} style={{ alignItems: 'center', paddingBottom: 28 }}>
          <LinearGradient colors={GOLD as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroDisc}>
            <Ionicons name="lock-closed" size={30} color={C.navy} />
          </LinearGradient>
          {!!eyebrow && <Text style={s.heroEyebrow}>{eyebrow.toUpperCase()}</Text>}
          <Text style={s.heroTitle}>{lock.title}</Text>
          <Text style={s.heroText}>{lock.text}</Text>
        </Animated.View>
      </LinearGradient>

      <View style={[s.body, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Animated.View entering={enter(1)} style={{ flex: 1 }}>
          <View style={s.planHead}>
            <Ionicons name={TIER_ICON[lock.need]} size={16} color={lock.need === 'pro' ? C.warning : C.primaryDark} />
            <Text style={s.planName}>{plan.name}</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.planFrom}>from ${from.toFixed(2)}/mo</Text>
          </View>
          {plan.features.map((f, i) => (
            <Animated.View key={f} entering={enter(2 + i)} style={s.feature}>
              <Ionicons name="checkmark-circle" size={20} color={lock.need === 'pro' ? C.warning : C.primary} />
              <Text style={s.featureText}>{f}</Text>
            </Animated.View>
          ))}
          <View style={s.keep}>
            <Ionicons name="shield-checkmark" size={15} color={C.primaryDark} />
            <Text style={s.keepText}>Everything you have already logged stays exactly as it is.</Text>
          </View>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <Button title={`Upgrade to ${lock.need === 'pro' ? 'Pro' : 'Smart'}`} icon={TIER_ICON[lock.need]} onPress={() => openUpgrade(lock.need)} />
          <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={onBack} style={s.later}>
            <Text style={s.laterText}>Maybe later</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.pill, alignSelf: 'flex-start' },
  badgeCompact: { paddingHorizontal: 0, width: 22, justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '800', color: C.navy, letterSpacing: 0.6 },
  disc: { backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', ...shadow },
  inline: { borderWidth: 1, borderColor: C.border },
  inlineHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  inlineIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 20 },
  heroBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12 },
  heroDisc: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heroEyebrow: { color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { color: C.white, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  heroText: { color: 'rgba(255,255,255,0.74)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22 },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  planName: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  planFrom: { fontSize: 13, fontWeight: '700', color: C.muted, fontVariant: ['tabular-nums'] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  featureText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  keep: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 16, backgroundColor: C.primarySoft, borderRadius: R.md, padding: 12 },
  keepText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19, fontWeight: '500' },
  later: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  laterText: { fontSize: 15, fontWeight: '700', color: C.muted },
});
