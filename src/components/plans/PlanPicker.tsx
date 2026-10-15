import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Card, CountUp, EASE_OUT, enter, IconTile, nativeOnly, PressableScale, SectionTitle, T, tap, type IconName } from '@/components/ui';
import { formatINR, PLAN_TIERS, type PlanTier } from '@/data/plans';
import { C, MOTION, R } from '@/theme';

/** Presentation accents per tier: Smart = brand teal, Pro = green-ink + gold. */
export const ACCENT: Record<PlanTier, { color: string; fill: string; check: string; icon: IconName; iconColor: string; tile: string }> = {
  smart: { color: C.primary, fill: C.primaryDark, check: C.primary, icon: 'sparkles', iconColor: C.primaryDark, tile: C.primarySoft },
  pro: { color: C.navy, fill: C.navy, check: C.warning, icon: 'diamond', iconColor: C.warning, tile: C.warningSoft },
};
export const DEFAULT_MONTHS = 6;
export const pctOff = (x: { price: number; was: number }) => Math.round((1 - x.price / x.was) * 100);
export const planFor = (tier: PlanTier, months: number) => {
  const plan = PLAN_TIERS.find((p) => p.id === tier) ?? PLAN_TIERS[0];
  return { plan, dur: plan.durations.find((x) => x.months === months) ?? plan.durations[1] };
};
const inr = (n: number) => formatINR(Math.round(n));

/** Tier cards → tier features → duration chips → total. Shared by the Premium screen and the onboarding paywall so both sell the same plans. */
export function PlanPicker({ tier, months, onTier, onMonths, enterAt = 0, titleTop = 22 }: { tier: PlanTier; months: number; onTier: (t: PlanTier) => void; onMonths: (m: number) => void; enterAt?: number; titleTop?: number }) {
  const { plan, dur } = planFor(tier, months);
  const accent = ACCENT[tier];
  return (
    <>
      <Animated.View entering={enter(enterAt)}>
        <SectionTitle title="Choose your plan" style={{ marginTop: titleTop }} />
        <View style={st.tiers}>
          {PLAN_TIERS.map((t) => (
            <TierCard key={t.id} tier={t} selected={tier === t.id} onPress={() => onTier(t.id)} />
          ))}
        </View>

        <Card style={{ marginTop: 12 }}>
          <Animated.View key={tier} entering={nativeOnly(FadeIn.duration(MOTION.base))}>
            <View style={st.featHead}>
              <IconTile icon={accent.icon} color={accent.iconColor} bg={accent.tile} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={st.planName}>{plan.name}</Text>
                <Text style={T.small}>{plan.tagline}</Text>
              </View>
            </View>
            {plan.features.map((f) => (
              <View key={f} style={st.feature}>
                <Ionicons name="checkmark-circle" size={20} color={accent.check} />
                <Text style={st.featureText}>{f}</Text>
              </View>
            ))}
          </Animated.View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(enterAt + 1)}>
        <SectionTitle title="Plan duration" />
        <View style={st.durRow}>
          {plan.durations.map((x) => (
            <DurationChip
              key={x.months}
              months={x.months}
              perMonth={Math.round(x.price / x.months)}
              off={pctOff(x)}
              badge={x.badge}
              fill={accent.fill}
              selected={x.months === dur.months}
              onPress={() => onMonths(x.months)}
            />
          ))}
        </View>
        <Card style={st.priceCard}>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Total · {dur.months} months</Text>
            <View style={st.priceRow}>
              <CountUp value={dur.price} format={inr} style={st.price} />
              <Text style={st.was}>{formatINR(dur.was)}</Text>
            </View>
            <Text style={st.priceSub}>
              You save <Text style={st.priceSave}>{formatINR(dur.was - dur.price)}</Text> · {formatINR(Math.round(dur.price / dur.months))}/month
            </Text>
          </View>
          <View style={st.offBadge}>
            <Text style={st.offBadgeNum}>{pctOff(dur)}%</Text>
            <Text style={st.offBadgeText}>OFF</Text>
          </View>
        </Card>
      </Animated.View>
    </>
  );
}

/** Selectable tier card: border, check and scale ease in when selected. */
function TierCard({ tier, selected, onPress }: { tier: (typeof PLAN_TIERS)[number]; selected: boolean; onPress: () => void }) {
  const a = ACCENT[tier.id];
  const sel = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    sel.set(withTiming(selected ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [selected, sel]);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(sel.get(), [0, 1], [C.border, a.color]),
    transform: [{ scale: interpolate(sel.get(), [0, 1], [0.97, 1]) }],
  }));
  const check = useAnimatedStyle(() => ({ opacity: sel.get(), transform: [{ scale: interpolate(sel.get(), [0, 1], [0.4, 1]) }] }));
  const from = Math.min(...tier.durations.map((x) => Math.round(x.price / x.months)));
  return (
    <PressableScale
      scaleTo={0.97}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flex: 1 }}>
      <Animated.View style={[st.tier, box]}>
        <Animated.View style={[st.tierCheck, { backgroundColor: a.fill }, check]}>
          <Ionicons name="checkmark" size={13} color={tier.id === 'pro' ? C.gold : C.white} />
        </Animated.View>
        <IconTile icon={a.icon} color={a.iconColor} bg={a.tile} size={38} />
        <Text style={st.tierName}>{tier.name.replace('Fitora ', '')}</Text>
        <Text style={st.tierTag} numberOfLines={2}>
          {tier.tagline}
        </Text>
        <Text style={st.tierFrom}>
          from <Text style={st.tierFromNum}>{formatINR(from)}</Text>/mo
        </Text>
      </Animated.View>
    </PressableScale>
  );
}

/** Duration chip-card: fills with the tier colour when selected. */
function DurationChip({ months, perMonth, off, badge, fill, selected, onPress }: { months: number; perMonth: number; off: number; badge?: string; fill: string; selected: boolean; onPress: () => void }) {
  const sel = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    sel.set(withTiming(selected ? 1 : 0, { duration: MOTION.fast }));
  }, [selected, sel]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(sel.get(), [0, 1], [C.card, fill]),
    borderColor: interpolateColor(sel.get(), [0, 1], [C.border, fill]),
  }));
  const strong = useAnimatedStyle(() => ({ color: interpolateColor(sel.get(), [0, 1], [C.text, C.white]) }));
  const soft = useAnimatedStyle(() => ({ color: interpolateColor(sel.get(), [0, 1], [C.textSoft, 'rgba(255,255,255,0.78)']) }));
  const best = badge === 'Best value';
  return (
    <PressableScale
      scaleTo={0.96}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flex: 1 }}>
      <Animated.View style={[st.dur, box]}>
        <Animated.Text style={[st.durMonths, soft]}>{months} months</Animated.Text>
        <Animated.Text style={[st.durPer, strong]} numberOfLines={1} adjustsFontSizeToFit>
          {formatINR(perMonth)}
        </Animated.Text>
        <Animated.Text style={[st.durPerUnit, soft]}>per month</Animated.Text>
        <Text style={[st.durOff, { color: selected ? C.gold : C.primary }]}>{off}% off</Text>
      </Animated.View>
      {badge && (
        <View style={[st.durBadge, { backgroundColor: best ? C.gold : C.accent }]}>
          <Text style={[st.durBadgeText, best && { color: C.navy }]}>{badge.toUpperCase()}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const st = StyleSheet.create({
  tiers: { flexDirection: 'row', gap: 10 },
  tier: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border, padding: 14, minHeight: 168 },
  tierCheck: { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tierName: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginTop: 12 },
  tierTag: { fontSize: 12, color: C.textSoft, lineHeight: 16, marginTop: 3, minHeight: 32 },
  tierFrom: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 10 },
  tierFromNum: { fontSize: 15, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  featHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  planName: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  durRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dur: { borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 8, alignItems: 'center' },
  durMonths: { fontSize: 13, fontWeight: '700' },
  durPer: { fontSize: 18, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  durPerUnit: { fontSize: 11, fontWeight: '600' },
  durOff: { fontSize: 12, fontWeight: '800', marginTop: 6 },
  durBadge: { position: 'absolute', top: -9, alignSelf: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  durBadgeText: { fontSize: 9, fontWeight: '800', color: C.white, letterSpacing: 0.5 },
  priceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  price: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  was: { fontSize: 14, color: C.muted, textDecorationLine: 'line-through', marginBottom: 5, fontVariant: ['tabular-nums'] },
  priceSub: { fontSize: 13, color: C.textSoft, marginTop: 2 },
  priceSave: { fontWeight: '800', color: C.primary, fontVariant: ['tabular-nums'] },
  offBadge: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  offBadgeNum: { fontSize: 18, fontWeight: '800', color: C.primaryDark, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  offBadgeText: { fontSize: 10, fontWeight: '800', color: C.primaryDark, letterSpacing: 0.6 },
});
