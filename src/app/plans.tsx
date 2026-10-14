import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Accordion, Decor, fmtFull, GOLD, planEnd, PREMIUM_BG } from '@/components/profile/shared';
import { Button, Card, CountUp, Dialog, EASE_OUT, enter, IconButton, IconTile, nativeOnly, PressableScale, Screen, SectionTitle, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { COACHES, formatINR, PLAN_TIERS, TESTIMONIALS, type PlanTier } from '@/data/plans';
import { fmtDate, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, G, glow, MOTION, R } from '@/theme';
import { Glyph } from '@/components/Glyph';

const COUPON = { code: 'FIT40', off: 400 };
const METHODS: { id: string; title: string; sub: string; icon: IconName }[] = [
  { id: 'upi', title: 'UPI', sub: 'Google Pay, PhonePe, Paytm, BHIM', icon: 'phone-portrait-outline' },
  { id: 'card', title: 'Credit / Debit card', sub: 'Visa, Mastercard, RuPay, Amex', icon: 'card-outline' },
  { id: 'netbanking', title: 'Net banking', sub: 'All major Indian banks', icon: 'business-outline' },
  { id: 'wallet', title: 'Wallets', sub: 'Paytm, Amazon Pay, Mobikwik', icon: 'wallet-outline' },
];
const FAQ = [
  { q: 'Can I cancel anytime?', a: 'Yes. You can cancel from Profile → Manage plan. You keep premium access until the end of your billing period.' },
  { q: 'How do I talk to my coach?', a: 'Pro members get in-app chat with their nutritionist and trainer, plus a weekly 1-on-1 video check-in at a time that suits you.' },
  { q: 'Will it work for a vegetarian diet?', a: 'Absolutely. Every plan is built around Indian food and your diet preference — veg, Jain, eggetarian, vegan or non-veg.' },
];

/** Presentation accents per tier: Smart = brand teal, Pro = green-ink + gold. */
const ACCENT: Record<PlanTier, { color: string; fill: string; check: string; icon: IconName; iconColor: string; tile: string }> = {
  smart: { color: C.primary, fill: C.primaryDark, check: C.primary, icon: 'sparkles', iconColor: C.primaryDark, tile: C.primarySoft },
  pro: { color: C.navy, fill: C.navy, check: C.warning, icon: 'diamond', iconColor: C.warning, tile: C.warningSoft },
};
const inr = (n: number) => formatINR(Math.round(n));

export default function PlansScreen() {
  const params = useLocalSearchParams<{ tier?: string }>();
  const { state, subscribe, cancelPremium } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const focused = useIsFocused();
  const bar = <StatusBar style={focused ? 'light' : 'dark'} />;
  const premium = state.premium;

  const [tier, setTier] = useState<PlanTier>(params.tier === 'pro' || params.tier === 'smart' ? params.tier : premium ? 'pro' : 'smart');
  const [months, setMonths] = useState(6);
  const [checkout, setCheckout] = useState(false);
  const [method, setMethod] = useState('upi');
  const [coupon, setCoupon] = useState(true);
  const [paying, setPaying] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [success, setSuccess] = useState<{ tier: PlanTier; months: number } | null>(null);
  const [slide, setSlide] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const plan = PLAN_TIERS.find((p) => p.id === tier) ?? PLAN_TIERS[0];
  const dur = plan.durations.find((x) => x.months === months) ?? plan.durations[1];
  const discount = dur.was - dur.price;
  const total = Math.max(0, dur.price - (coupon ? COUPON.off : 0));
  const pctOff = (x: { price: number; was: number }) => Math.round((1 - x.price / x.was) * 100);
  const cta = premium?.tier === tier ? 'Renew' : premium?.tier === 'smart' && tier === 'pro' ? 'Upgrade' : 'Continue';
  const slideW = width - 100;
  const accent = ACCENT[tier];

  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const pay = () => {
    setPaying(true);
    timer.current = setTimeout(() => {
      subscribe(tier, months);
      setPaying(false);
      setCheckout(false);
      setSuccess({ tier, months });
    }, 1500);
  };

  if (success)
    return (
      <>
        {bar}
        <Success tier={success.tier} months={success.months} />
      </>
    );

  return (
    <Screen bg={C.navy}>
      {bar}
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <LinearGradient colors={PREMIUM_BG} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={st.hero}>
            <Decor />
            <View style={st.heroTop}>
              <IconButton icon="arrow-back" color={C.white} bg="rgba(255,255,255,0.12)" onPress={back} />
              <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.offer}>
                <Ionicons name="flame" size={12} color={C.navy} />
                <Text style={st.offerText}>UP TO 62% OFF · ENDS SUNDAY</Text>
              </LinearGradient>
            </View>
            <Animated.View entering={enter(0)} style={st.heroMedalWrap}>
              <View style={st.heroMedalHalo}>
                <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.heroMedal}>
                  <Ionicons name="diamond" size={26} color={C.navy} />
                </LinearGradient>
              </View>
            </Animated.View>
            <Animated.View entering={enter(1)}>
              <Text style={st.heroTitle}>Fitora Premium</Text>
              <Text style={st.heroSub}>Reach your goal faster with Ria AI and real Indian nutrition experts.</Text>
              <View style={st.proof}>
                <View style={st.stars}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Ionicons key={i} name="star" size={13} color={C.gold} />
                  ))}
                </View>
                <Text style={st.proofText}>4.8 · Loved by 2 lakh+ members</Text>
              </View>
            </Animated.View>
            <Animated.View entering={enter(2)} style={st.heroStats}>
              <HeroStat value="−6.8 kg" label="avg. in 90 days" />
              <View style={st.heroDiv} />
              <HeroStat value="24×7" label="AI coaching" />
              <View style={st.heroDiv} />
              <HeroStat value="500+" label="certified coaches" />
            </Animated.View>
          </LinearGradient>

          <View style={st.body}>
            {premium && (
              <Animated.View entering={enter(3)}>
                <Card style={st.active}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.activeIcon}>
                      <Ionicons name={premium.tier === 'pro' ? 'diamond' : 'sparkles'} size={18} color={C.navy} />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={T.h3}>{`You're on Fitora ${premium.tier === 'pro' ? 'Pro' : 'Smart'}`}</Text>
                      <Text style={T.small}>
                        Since {fmtDate(premium.since)} · valid till {fmtFull(planEnd(premium.since, premium.months))}
                      </Text>
                    </View>
                  </View>
                  <Button title="Cancel plan (demo)" variant="danger" small icon="close-circle-outline" style={{ marginTop: 14 }} onPress={() => setAskCancel(true)} />
                </Card>
              </Animated.View>
            )}

            {/* Tier picker */}
            <Animated.View entering={enter(3)}>
              <SectionTitle title="Choose your plan" style={{ marginTop: premium ? 24 : 22 }} />
              <View style={st.tiers}>
                {PLAN_TIERS.map((t) => (
                  <TierCard key={t.id} tier={t} selected={tier === t.id} onPress={() => setTier(t.id)} />
                ))}
              </View>

              {/* Features */}
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

            {/* Durations */}
            <Animated.View entering={enter(4)}>
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
                    selected={x.months === months}
                    onPress={() => setMonths(x.months)}
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
                    You save <Text style={st.priceSave}>{formatINR(discount)}</Text> · {formatINR(Math.round(dur.price / dur.months))}/month
                  </Text>
                </View>
                <View style={st.offBadge}>
                  <Text style={st.offBadgeNum}>{pctOff(dur)}%</Text>
                  <Text style={st.offBadgeText}>OFF</Text>
                </View>
              </Card>
            </Animated.View>

            {/* Ria (Smart) */}
            {tier === 'smart' && (
              <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))}>
                <Card style={st.ria} onPress={() => router.push('/coach')}>
                  <IconTile icon="sparkles" color={C.ai} bg={C.card} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={[st.coachName, { color: C.ai }]}>Meet Ria, your AI coach</Text>
                    <Text style={[T.small, { color: C.ai }]}>Instant answers on food, workouts and cravings — 24×7.</Text>
                  </View>
                  <View style={st.tryPill}>
                    <Text style={st.tryText}>Try it</Text>
                  </View>
                </Card>
              </Animated.View>
            )}

            {/* Coaches + testimonials on deep teal */}
            <Animated.View entering={enter(5)}>
              <LinearGradient colors={G.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.band}>
                <Decor />
                {tier === 'pro' && (
                  <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} style={{ marginBottom: 22 }}>
                    <Text style={st.bandEyebrow}>CERTIFIED COACHES</Text>
                    <Text style={st.bandTitle}>Your expert team</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.bandScroll}>
                      {COACHES.map((c) => (
                        <View key={c.name} style={st.coach}>
                          <View style={st.coachAvatar}>
                            <Glyph emoji={c.emoji} size={56} />
                          </View>
                          <View style={st.coachNameRow}>
                            <Text style={st.coachName} numberOfLines={1}>
                              {c.name}
                            </Text>
                            <Ionicons name="checkmark-circle" size={14} color={C.primary} />
                          </View>
                          <Text style={[T.small, { textAlign: 'center' }]} numberOfLines={1}>
                            {c.role}
                          </Text>
                          <View style={st.coachMeta}>
                            <Ionicons name="star" size={12} color={C.gold} />
                            <Text style={st.coachMetaText}>
                              {c.rating} · {c.exp}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}

                <Text style={st.bandEyebrow}>SUCCESS STORIES</Text>
                <Text style={st.bandTitle}>Real results</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={slideW + 12}
                  decelerationRate="fast"
                  contentContainerStyle={st.bandScroll}
                  scrollEventThrottle={16}
                  onScroll={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (slideW + 12)))}>
                  {TESTIMONIALS.map((t) => (
                    <View key={t.name} style={[st.quote, { width: slideW }]}>
                      <View style={st.quoteAvatar}>
                        <Text style={st.quoteInitial}>{t.name.slice(0, 1)}</Text>
                      </View>
                      <View style={st.quoteStars}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Ionicons key={i} name="star" size={15} color={C.gold} />
                        ))}
                      </View>
                      <Text style={st.quoteText}>“{t.text}”</Text>
                      <View style={st.quoteFoot}>
                        <Text style={st.quoteName}>{t.name}</Text>
                        <View style={st.kgPill}>
                          <Ionicons name="trending-down" size={13} color={C.primaryDark} />
                          <Text style={st.kgText}>{t.kg}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={st.dots}>
                  {TESTIMONIALS.map((t, i) => (
                    <Dot key={t.name} on={i === slide} />
                  ))}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* FAQ */}
            <Animated.View entering={enter(6)}>
              <SectionTitle title="FAQs" />
              <Card style={{ paddingVertical: 2 }}>
                {FAQ.map((f, i) => (
                  <Accordion key={f.q} q={f.q} a={f.a} last={i === FAQ.length - 1} />
                ))}
              </Card>
              <View style={st.trust}>
                <Ionicons name="shield-checkmark" size={14} color={C.muted} />
                <Text style={T.tiny}>Secure checkout · Cancel anytime</Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[st.cta, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={st.ctaNote} numberOfLines={1}>
            {plan.name} · {dur.months} months · {formatINR(Math.round(dur.price / dur.months))}/mo · save {pctOff(dur)}%
          </Text>
          <Button
            title={`${cta} · ${formatINR(dur.price)}`}
            variant={tier === 'pro' ? 'dark' : 'primary'}
            style={tier === 'pro' ? glow(C.navy) : undefined}
            onPress={() => setCheckout(true)}
          />
        </View>
      </View>

      {/* Checkout */}
      <Sheet visible={checkout} onClose={() => !paying && setCheckout(false)} title="Checkout">
        <ScrollView style={{ maxHeight: Math.min(430, height * 0.5) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.summary}>
            <View style={st.sumHead}>
              <IconTile icon={accent.icon} color={accent.iconColor} bg={accent.tile} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={st.sumTitle}>{plan.name}</Text>
                <Text style={T.small}>
                  {dur.months} months · till {fmtFull(planEnd(todayKey(), dur.months))}
                </Text>
              </View>
            </View>
            <Line label="Plan price (MRP)" value={formatINR(dur.was)} />
            <Line label={`Plan discount (${pctOff(dur)}%)`} value={`−${formatINR(discount)}`} green />
            {coupon && <Line label={`Coupon ${COUPON.code}`} value={`−${formatINR(COUPON.off)}`} green />}
            <View style={st.sumDivider} />
            <Line label="Total payable" value={formatINR(total)} bold />
            <Text style={[T.tiny, { marginTop: 2 }]}>Inclusive of all taxes</Text>
          </View>

          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            onPress={() => {
              tap();
              setCoupon(!coupon);
              toast(coupon ? 'Coupon removed' : `${COUPON.code} applied · ₹400 off`, 'pricetag');
            }}
            style={[st.coupon, coupon && st.couponOn]}>
            <IconTile icon={coupon ? 'checkmark-circle' : 'pricetag-outline'} color={coupon ? C.primary : C.textSoft} bg={coupon ? C.card : C.surfaceAlt} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={st.couponTitle}>{coupon ? `${COUPON.code} applied` : `Apply ${COUPON.code}`}</Text>
              <Text style={T.small}>Extra {formatINR(COUPON.off)} off on this plan</Text>
            </View>
            <Text style={[st.couponAction, !coupon && { color: C.primaryDark }]}>{coupon ? 'Remove' : 'Apply'}</Text>
          </PressableScale>

          <Text style={[T.label, st.payLabel]}>Pay with</Text>
          {METHODS.map((m) => {
            const on = method === m.id;
            return (
              <PressableScale
                key={m.id}
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  setMethod(m.id);
                }}
                style={[st.method, on && st.methodOn]}>
                <View style={[st.methodIcon, on && { backgroundColor: C.card }]}>
                  <Ionicons name={m.icon} size={19} color={on ? C.primaryDark : C.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.methodTitle}>{m.title}</Text>
                  <Text style={st.methodSub}>{m.sub}</Text>
                </View>
                <View style={[st.radio, on && { borderColor: C.primary }]}>{on && <View style={[st.radioDot, { backgroundColor: C.primary }]} />}</View>
              </PressableScale>
            );
          })}
        </ScrollView>
        <View style={st.demoNote}>
          <Ionicons name="information-circle" size={18} color={C.warning} />
          <Text style={st.demoText}>Demo mode — no real payment will be made.</Text>
        </View>
        <Button title={`Pay ${formatINR(total)}`} icon="lock-closed" loading={paying} onPress={pay} />
        <Text style={[T.tiny, { textAlign: 'center', marginTop: 8 }]}>100% secure · Cancel anytime</Text>
      </Sheet>

      <Dialog
        visible={askCancel}
        icon="😢"
        title={`Cancel Fitora ${premium?.tier === 'pro' ? 'Pro' : 'Smart'}?`}
        text="You'll lose Ria's unlimited chats and personalised plans. This is a demo, so nothing is charged or refunded."
        confirm="Cancel plan"
        cancel="Keep plan"
        danger
        onCancel={() => setAskCancel(false)}
        onConfirm={() => {
          setAskCancel(false);
          cancelPremium();
          toast("Plan cancelled · you're on the Free plan", 'close-circle');
        }}
      />
    </Screen>
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

function Dot({ on }: { on: boolean }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(on ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [on, p]);
  const style = useAnimatedStyle(() => ({ width: interpolate(p.get(), [0, 1], [6, 18]), opacity: interpolate(p.get(), [0, 1], [0.35, 1]) }));
  return <Animated.View style={[st.dot, style]} />;
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={st.hsValue}>{value}</Text>
      <Text style={st.hsLabel}>{label}</Text>
    </View>
  );
}

function Line({ label, value, green, bold }: { label: string; value: string; green?: boolean; bold?: boolean }) {
  return (
    <View style={st.line}>
      <Text style={[st.lineLabel, bold && st.lineBold]}>{label}</Text>
      <Text style={[st.lineValue, green && { color: C.primary }, bold && st.lineBold]}>{value}</Text>
    </View>
  );
}

const CONFETTI = [
  { cx: 22, cy: 60, r: 4, c: C.gold },
  { cx: 198, cy: 46, r: 5, c: '#7FE0C3' },
  { cx: 40, cy: 170, r: 3, c: '#7FE0C3' },
  { cx: 186, cy: 160, r: 4, c: C.gold },
  { cx: 110, cy: 8, r: 3, c: C.white },
  { cx: 8, cy: 112, r: 2.5, c: C.white },
  { cx: 214, cy: 104, r: 2.5, c: C.white },
  { cx: 120, cy: 214, r: 3.5, c: C.gold },
];

function Success({ tier, months }: { tier: PlanTier; months: number }) {
  const plan = PLAN_TIERS.find((p) => p.id === tier) ?? PLAN_TIERS[0];
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const pop = useSharedValue(0);
  const halo = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, { damping: 11, stiffness: 150, mass: 0.8 }));
    if (!reduce) halo.set(withDelay(200, withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1, false)));
  }, [pop, halo, reduce]);
  const medal = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.get() * 1.5), transform: [{ scale: interpolate(pop.get(), [0, 1], [0.4, 1]) }] }));
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(halo.get(), [0, 1], [0.5, 0]), transform: [{ scale: interpolate(halo.get(), [0, 1], [0.9, 1.75]) }] }));
  return (
    <LinearGradient colors={PREMIUM_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <Decor />
      <ScrollView contentContainerStyle={[st.success, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <View style={st.celebrate}>
          <Animated.View entering={nativeOnly(FadeIn.delay(180).duration(600))} style={StyleSheet.absoluteFill}>
            <Svg width={222} height={222} viewBox="0 0 222 222">
              {CONFETTI.map((d, i) => (
                <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} fillOpacity={0.8} />
              ))}
            </Svg>
          </Animated.View>
          <Animated.View style={[st.halo, ring]} />
          <Animated.View style={medal}>
            <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.sMedal}>
              <Ionicons name={tier === 'pro' ? 'diamond' : 'sparkles'} size={44} color={C.navy} />
            </LinearGradient>
          </Animated.View>
        </View>
        <Animated.Text entering={enter(3)} style={st.sTitle}>
          Welcome to {plan.name}!
        </Animated.Text>
        <Animated.Text entering={enter(4)} style={st.sSub}>
          Your {months}-month plan is active till {fmtFull(planEnd(todayKey(), months))}.
        </Animated.Text>
        <Animated.View entering={enter(5)} style={st.unlocked}>
          <Text style={st.unlockedLabel}>{"WHAT'S UNLOCKED"}</Text>
          {plan.features.map((f) => (
            <View key={f} style={st.feature}>
              <Ionicons name="checkmark-circle" size={20} color={C.gold} />
              <Text style={[st.featureText, { color: C.white }]}>{f}</Text>
            </View>
          ))}
        </Animated.View>
        {tier === 'pro' && (
          <Animated.View entering={enter(6)} style={st.coachNote}>
            <View style={st.coachNoteAvatar}>
              <Glyph emoji={COACHES[0].emoji} size={44} />
            </View>
            <Text style={st.coachNoteText}>
              {COACHES[0].name}, your nutritionist, will message you within 24 hours to book your first video check-in.
            </Text>
          </Animated.View>
        )}
        <Animated.View entering={enter(7)} style={{ alignSelf: 'stretch' }}>
          <Button title="Start exploring" variant="dark" style={st.sBtn} textStyle={{ color: C.navy }} onPress={() => router.replace('/(tabs)')} />
          <Button title="Say hi to Ria" variant="ghost" textStyle={{ color: C.white }} style={{ marginTop: 6, alignSelf: 'stretch' }} onPress={() => router.replace('/coach')} />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill },
  offerText: { fontSize: 11, fontWeight: '800', color: C.navy, letterSpacing: 0.4 },
  heroMedalWrap: { marginTop: 14, alignSelf: 'flex-start' },
  heroMedalHalo: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(245,196,81,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroMedal: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '800', color: C.white, letterSpacing: -0.8, marginTop: 12 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 22, marginTop: 6 },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  stars: { flexDirection: 'row', gap: 1 },
  proofText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingVertical: 14, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  heroDiv: { width: StyleSheet.hairlineWidth * 2, height: 28, backgroundColor: 'rgba(255,255,255,0.16)' },
  hsValue: { color: C.white, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  hsLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  body: { paddingHorizontal: 16 },
  active: { marginTop: 16, borderWidth: 1.5, borderColor: C.gold },
  activeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
  ria: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, backgroundColor: C.aiSoft, borderWidth: 1, borderColor: C.aiBorder, shadowOpacity: 0, elevation: 0 },
  tryPill: { backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.aiBorder },
  tryText: { fontSize: 13, fontWeight: '700', color: C.ai },
  band: { marginTop: 26, borderRadius: R.xl, paddingVertical: 22, overflow: 'hidden' },
  bandEyebrow: { color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20 },
  bandTitle: { color: C.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 4, marginBottom: 14, paddingHorizontal: 20 },
  bandScroll: { paddingHorizontal: 20, gap: 12 },
  coach: { width: 148, alignItems: 'center', gap: 2, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 16, paddingHorizontal: 10 },
  coachAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 3, borderColor: C.primaryTint },
  coachNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  coachName: { fontSize: 15, fontWeight: '700', color: C.text, flexShrink: 1 },
  coachMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: C.surfaceAlt, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  coachMetaText: { fontSize: 12, fontWeight: '700', color: C.textSoft, fontVariant: ['tabular-nums'] },
  quote: { backgroundColor: C.card, borderRadius: R.lg, paddingTop: 34, paddingBottom: 16, paddingHorizontal: 18, marginTop: 26, alignItems: 'center' },
  quoteAvatar: { position: 'absolute', top: -26, width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, borderWidth: 3, borderColor: C.card, alignItems: 'center', justifyContent: 'center' },
  quoteInitial: { fontSize: 20, fontWeight: '800', color: C.primaryDark },
  quoteStars: { flexDirection: 'row', gap: 3 },
  quoteText: { fontSize: 15, color: C.text, fontWeight: '600', lineHeight: 22, textAlign: 'center', marginTop: 10 },
  quoteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  quoteName: { fontSize: 13, color: C.textSoft, fontWeight: '700' },
  kgPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  kgText: { color: C.primaryDark, fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot: { height: 6, borderRadius: 3, backgroundColor: C.white },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  cta: { backgroundColor: C.card, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.border },
  ctaNote: { fontSize: 12, color: C.textSoft, fontWeight: '600', textAlign: 'center', marginBottom: 8, fontVariant: ['tabular-nums'] },
  summary: { backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  sumHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sumTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  sumDivider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.border, marginVertical: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineLabel: { fontSize: 14, color: C.textSoft },
  lineValue: { fontSize: 14, color: C.text, fontWeight: '600', fontVariant: ['tabular-nums'] },
  lineBold: { fontSize: 17, fontWeight: '800', color: C.text },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, marginTop: 12 },
  couponOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  couponTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  couponAction: { fontSize: 13, fontWeight: '700', color: C.danger },
  payLabel: { marginTop: 18, marginBottom: 8, marginLeft: 2 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 8 },
  methodOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  methodIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  methodSub: { fontSize: 12, color: C.textSoft, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.warningSoft, borderRadius: R.sm, padding: 10, marginVertical: 12 },
  demoText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },
  success: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  celebrate: { width: 222, height: 222, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: C.gold },
  sMedal: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)' },
  sTitle: { fontSize: 28, fontWeight: '800', color: C.white, textAlign: 'center', marginTop: 4, letterSpacing: -0.6 },
  sSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 22 },
  unlocked: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: R.lg, padding: 16, marginTop: 24, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  unlockedLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  coachNote: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,196,81,0.14)', borderRadius: R.md, padding: 14, marginTop: 12, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(245,196,81,0.3)' },
  coachNoteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  coachNoteText: { flex: 1, color: C.white, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  sBtn: { alignSelf: 'stretch', marginTop: 28, backgroundColor: C.gold, borderColor: C.gold },
});
