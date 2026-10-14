import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Accordion, fmtFull, GOLD, planEnd, PREMIUM_BG } from '@/components/profile/shared';
import { Button, Card, Dialog, IconButton, Screen, Segmented, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { COACHES, formatINR, PLAN_TIERS, TESTIMONIALS, type PlanTier } from '@/data/plans';
import { fmtDate, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

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
const soft = (t: PlanTier) => (t === 'pro' ? C.workoutSoft : C.primarySoft);

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
  const slideW = width - 56;

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
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <LinearGradient colors={PREMIUM_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
            <View style={st.heroTop}>
              <IconButton icon="arrow-back" color={C.white} bg="rgba(255,255,255,0.12)" onPress={back} />
              <LinearGradient colors={GOLD} style={st.offer}>
                <Text style={st.offerText}>🔥 UP TO 62% OFF · ENDS SUNDAY</Text>
              </LinearGradient>
            </View>
            <Text style={{ fontSize: 44, marginTop: 10 }}>👑</Text>
            <Text style={st.heroTitle}>Fitora Premium</Text>
            <Text style={st.heroSub}>Reach your goal faster with Ria AI and real Indian nutrition experts.</Text>
            <View style={st.proof}>
              <Text style={st.stars}>★★★★★</Text>
              <Text style={st.proofText}>4.8 · Loved by 2 lakh+ members</Text>
            </View>
            <View style={st.heroStats}>
              <HeroStat value="−6.8 kg" label="avg. in 90 days" />
              <HeroStat value="24×7" label="AI coaching" />
              <HeroStat value="500+" label="certified coaches" />
            </View>
          </LinearGradient>

          <View style={st.body}>
            {premium && (
              <Card style={st.active}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <LinearGradient colors={GOLD} style={st.activeIcon}>
                    <Ionicons name={premium.tier === 'pro' ? 'diamond' : 'star'} size={18} color={C.navy} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={T.h3}>You're on Fitora {premium.tier === 'pro' ? 'Pro' : 'Smart'}</Text>
                    <Text style={T.small}>
                      Since {fmtDate(premium.since)} · valid till {fmtFull(planEnd(premium.since, premium.months))}
                    </Text>
                  </View>
                </View>
                <Button title="Cancel plan (demo)" variant="danger" small icon="close-circle-outline" style={{ marginTop: 14 }} onPress={() => setAskCancel(true)} />
              </Card>
            )}

            <Segmented<PlanTier>
              style={{ marginTop: 18 }}
              options={[
                { value: 'smart', label: '✨ Smart' },
                { value: 'pro', label: '👑 Pro' },
              ]}
              value={tier}
              onChange={setTier}
            />

            {/* Features */}
            <Card style={{ marginTop: 14 }}>
              <Text style={[st.planName, { color: plan.color }]}>{plan.name}</Text>
              <Text style={[T.small, { marginBottom: 10 }]}>{plan.tagline}</Text>
              {plan.features.map((f) => (
                <View key={f} style={st.feature}>
                  <Ionicons name="checkmark-circle" size={20} color={plan.color} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </Card>

            {/* Durations */}
            <Text style={st.h}>Choose your plan</Text>
            {plan.durations.map((x) => {
              const on = x.months === months;
              return (
                <Pressable
                  key={x.months}
                  onPress={() => {
                    tap();
                    setMonths(x.months);
                  }}
                  style={[st.dur, on && { borderColor: plan.color, backgroundColor: soft(tier) }]}>
                  {x.badge && (
                    <View style={[st.durBadge, { backgroundColor: x.badge === 'Best value' ? C.gold : plan.color }]}>
                      <Text style={[st.durBadgeText, x.badge === 'Best value' && { color: C.navy }]}>{x.badge.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={[st.radio, on && { borderColor: plan.color }]}>{on && <View style={[st.radioDot, { backgroundColor: plan.color }]} />}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.durTitle}>{x.months} months</Text>
                    <Text style={T.small}>{formatINR(Math.round(x.price / x.months))}/month</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.durPrice}>{formatINR(x.price)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={st.was}>{formatINR(x.was)}</Text>
                      <Text style={st.off}>{pctOff(x)}% off</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {/* Coaches / Ria */}
            {tier === 'pro' ? (
              <>
                <Text style={st.h}>Your expert team</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.bleed} contentContainerStyle={st.bleedInner}>
                  {COACHES.map((c) => (
                    <Card key={c.name} style={st.coach}>
                      <View style={st.coachAvatar}>
                        <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
                      </View>
                      <Text style={st.coachName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={T.small} numberOfLines={1}>
                        {c.role}
                      </Text>
                      <View style={st.coachMeta}>
                        <Ionicons name="star" size={12} color={C.gold} />
                        <Text style={st.coachMetaText}>
                          {c.rating} · {c.exp}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </ScrollView>
              </>
            ) : (
              <Card style={st.ria} onPress={() => router.push('/coach')}>
                <LinearGradient colors={[C.primary, '#0D9488']} style={st.riaIcon}>
                  <Ionicons name="sparkles" size={22} color={C.white} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={st.coachName}>Meet Ria, your AI coach</Text>
                  <Text style={T.small}>Instant answers on food, workouts and cravings — 24×7.</Text>
                </View>
                <Text style={st.tryText}>Try it</Text>
              </Card>
            )}

            {/* Testimonials */}
            <Text style={st.h}>Real results</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={slideW + 12}
              decelerationRate="fast"
              style={st.bleed}
              contentContainerStyle={st.bleedInner}
              scrollEventThrottle={16}
              onScroll={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (slideW + 12)))}>
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} style={[st.quote, { width: slideW }]}>
                  <Text style={st.quoteMark}>“</Text>
                  <Text style={st.quoteText}>{t.text}</Text>
                  <View style={st.quoteFoot}>
                    <Text style={st.quoteName}>{t.name}</Text>
                    <View style={st.kgPill}>
                      <Text style={st.kgText}>{t.kg}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </ScrollView>
            <View style={st.dots}>
              {TESTIMONIALS.map((t, i) => (
                <View key={t.name} style={[st.dot, i === slide && { backgroundColor: plan.color, width: 18 }]} />
              ))}
            </View>

            {/* FAQ */}
            <Text style={st.h}>FAQs</Text>
            <Card style={{ paddingVertical: 2 }}>
              {FAQ.map((f, i) => (
                <Accordion key={f.q} q={f.q} a={f.a} last={i === FAQ.length - 1} />
              ))}
            </Card>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[st.cta, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={st.ctaNote}>
            {plan.name} · {dur.months} months · {formatINR(Math.round(dur.price / dur.months))}/mo · save {pctOff(dur)}%
          </Text>
          <Button title={`${cta} · ${formatINR(dur.price)}`} style={{ backgroundColor: plan.color, borderColor: plan.color }} onPress={() => setCheckout(true)} />
        </View>
      </View>

      {/* Checkout */}
      <Sheet visible={checkout} onClose={() => !paying && setCheckout(false)} title="Checkout">
        <ScrollView style={{ maxHeight: Math.min(430, height * 0.5) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={st.summary}>
            <View style={st.sumHead}>
              <View style={[st.sumIcon, { backgroundColor: soft(tier) }]}>
                <Text style={{ fontSize: 20 }}>{tier === 'pro' ? '👑' : '✨'}</Text>
              </View>
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

          <Pressable
            onPress={() => {
              tap();
              setCoupon(!coupon);
              toast(coupon ? 'Coupon removed' : `${COUPON.code} applied · ₹400 off`, 'pricetag');
            }}
            style={[st.coupon, coupon && st.couponOn]}>
            <Ionicons name={coupon ? 'checkmark-circle' : 'pricetag-outline'} size={20} color={coupon ? C.primary : C.textSoft} />
            <View style={{ flex: 1 }}>
              <Text style={st.couponTitle}>{coupon ? `${COUPON.code} applied` : `Apply ${COUPON.code}`}</Text>
              <Text style={T.small}>Extra {formatINR(COUPON.off)} off on this plan</Text>
            </View>
            <Text style={[st.couponAction, !coupon && { color: C.primary }]}>{coupon ? 'Remove' : 'Apply'}</Text>
          </Pressable>

          <Text style={st.payLabel}>Pay with</Text>
          {METHODS.map((m) => {
            const on = method === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  tap();
                  setMethod(m.id);
                }}
                style={[st.method, on && st.methodOn]}>
                <View style={st.methodIcon}>
                  <Ionicons name={m.icon} size={19} color={C.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.methodTitle}>{m.title}</Text>
                  <Text style={st.methodSub}>{m.sub}</Text>
                </View>
                <View style={[st.radio, on && { borderColor: C.primary }]}>{on && <View style={[st.radioDot, { backgroundColor: C.primary }]} />}</View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={st.demoNote}>
          <Ionicons name="information-circle" size={18} color="#B45309" />
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

function Success({ tier, months }: { tier: PlanTier; months: number }) {
  const plan = PLAN_TIERS.find((p) => p.id === tier) ?? PLAN_TIERS[0];
  const pop = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [pop]);
  return (
    <LinearGradient colors={PREMIUM_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[st.success, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <Animated.Text style={{ fontSize: 72, transform: [{ scale: pop }] }}>🎉</Animated.Text>
        <Text style={st.sTitle}>Welcome to {plan.name}!</Text>
        <Text style={st.sSub}>
          Your {months}-month plan is active till {fmtFull(planEnd(todayKey(), months))}.
        </Text>
        <View style={st.unlocked}>
          <Text style={st.unlockedLabel}>WHAT'S UNLOCKED</Text>
          {plan.features.map((f) => (
            <View key={f} style={st.feature}>
              <Ionicons name="checkmark-circle" size={20} color={C.gold} />
              <Text style={[st.featureText, { color: C.white }]}>{f}</Text>
            </View>
          ))}
        </View>
        {tier === 'pro' && (
          <View style={st.coachNote}>
            <Text style={{ fontSize: 26 }}>{COACHES[0].emoji}</Text>
            <Text style={st.coachNoteText}>
              {COACHES[0].name}, your nutritionist, will message you within 24 hours to book your first video check-in.
            </Text>
          </View>
        )}
        <Button title="Start exploring" style={st.sBtn} textStyle={{ color: C.navy }} onPress={() => router.replace('/(tabs)')} />
        <Button title="Say hi to Ria" variant="ghost" textStyle={{ color: C.white }} style={{ marginTop: 6, alignSelf: 'stretch' }} onPress={() => router.replace('/coach')} />
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offer: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill },
  offerText: { fontSize: 11, fontWeight: '900', color: C.navy, letterSpacing: 0.3 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: C.white, letterSpacing: -0.5, marginTop: 6 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 21, marginTop: 6 },
  proof: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  stars: { color: C.gold, fontSize: 15, letterSpacing: 1 },
  proofText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroStats: { flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  hsValue: { color: C.white, fontSize: 18, fontWeight: '800' },
  hsLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  body: { paddingHorizontal: 16 },
  active: { marginTop: 16, borderWidth: 1.5, borderColor: C.gold },
  activeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 20, fontWeight: '800' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  featureText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  h: { fontSize: 18, fontWeight: '800', color: C.text, marginTop: 24, marginBottom: 12 },
  dur: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 12 },
  durBadge: { position: 'absolute', top: -10, right: 14, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  durBadgeText: { fontSize: 10, fontWeight: '900', color: C.white, letterSpacing: 0.4 },
  durTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  durPrice: { fontSize: 18, fontWeight: '800', color: C.text },
  was: { fontSize: 12, color: C.muted, textDecorationLine: 'line-through' },
  off: { fontSize: 12, fontWeight: '800', color: C.primary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  bleed: { marginHorizontal: -16 },
  bleedInner: { paddingHorizontal: 16, gap: 12, paddingBottom: 6 },
  coach: { width: 150, alignItems: 'center', gap: 2 },
  coachAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  coachName: { fontSize: 15, fontWeight: '800', color: C.text },
  coachMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  coachMetaText: { fontSize: 12, fontWeight: '700', color: C.textSoft },
  ria: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  riaIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tryText: { fontSize: 14, fontWeight: '800', color: C.primary },
  quote: { minHeight: 140 },
  quoteMark: { fontSize: 40, lineHeight: 40, color: C.primary, fontWeight: '800', height: 26 },
  quoteText: { fontSize: 16, color: C.text, fontWeight: '600', lineHeight: 23 },
  quoteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  quoteName: { fontSize: 13, color: C.textSoft, fontWeight: '700' },
  kgPill: { backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  kgText: { color: C.primaryDark, fontWeight: '800', fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  cta: { backgroundColor: C.card, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderSoft },
  ctaNote: { fontSize: 12, color: C.textSoft, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  summary: { backgroundColor: C.bg, borderRadius: R.md, padding: 14 },
  sumHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sumIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sumTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  sumDivider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineLabel: { fontSize: 14, color: C.textSoft },
  lineValue: { fontSize: 14, color: C.text, fontWeight: '600' },
  lineBold: { fontSize: 16, fontWeight: '800', color: C.text },
  coupon: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, marginTop: 12 },
  couponOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  couponTitle: { fontSize: 14, fontWeight: '800', color: C.text },
  couponAction: { fontSize: 13, fontWeight: '800', color: C.danger },
  payLabel: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 16, marginBottom: 8 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, marginBottom: 8 },
  methodOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  methodIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  methodSub: { fontSize: 12, color: C.textSoft, marginTop: 1 },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, marginVertical: 12 },
  demoText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#92400E' },
  success: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24 },
  sTitle: { fontSize: 26, fontWeight: '800', color: C.white, textAlign: 'center', marginTop: 12, letterSpacing: -0.4 },
  sSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  unlocked: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: R.lg, padding: 16, marginTop: 24 },
  unlockedLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  coachNote: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,196,81,0.14)', borderRadius: R.md, padding: 14, marginTop: 12 },
  coachNoteText: { flex: 1, color: C.white, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  sBtn: { alignSelf: 'stretch', marginTop: 28, backgroundColor: C.gold, borderColor: C.gold },
});
