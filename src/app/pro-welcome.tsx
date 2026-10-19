import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
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

import { Decor, GOLD, PlanBadge, PREMIUM_BG } from '@/components/profile/shared';
import { AvailabilityLine, TrainerAvatar } from '@/components/trainer/parts';
import { Button, EASE_OUT, enter, layoutTransition, nativeOnly, PressableScale, tap, type IconName } from '@/components/ui';
import { availability, firstName, trainerById } from '@/data/trainers';
import { useStore } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C, fade, R } from '@/theme';

/** Confetti ring around the medal, in the 222-unit box the celebration stage is scaled from. */
const CONFETTI = [
  { cx: 22, cy: 60, r: 4, c: C.gold },
  { cx: 198, cy: 46, r: 5, c: '#B2F5A9' },
  { cx: 40, cy: 170, r: 3, c: '#B2F5A9' },
  { cx: 186, cy: 160, r: 4, c: C.gold },
  { cx: 110, cy: 8, r: 3, c: C.white },
  { cx: 8, cy: 112, r: 2.5, c: C.white },
  { cx: 214, cy: 104, r: 2.5, c: C.white },
  { cx: 120, cy: 214, r: 3.5, c: C.gold },
];

type Benefit = { id: string; icon: IconName; title: string; line: string; detail: string };

/** The six Pro coaching capabilities, each with the longer copy the "Explore" action reveals. */
const BENEFITS: Benefit[] = [
  {
    id: 'plans',
    icon: 'barbell',
    title: 'Personalized Workout Plans',
    line: 'A training week built around your goal and your kit.',
    detail:
      'Your coach lays out each training day — the moves, the reps and the rest between them — and reshapes the week when your schedule or your energy changes.',
  },
  {
    id: 'chat',
    icon: 'chatbubble-ellipses',
    title: 'Direct Coach Chat',
    line: 'One thread with your coach, open every day.',
    detail:
      'Ask about a movement, flag a niggle, or say how a session felt. Everything stays in one conversation, so nothing has to be explained twice.',
  },
  {
    id: 'audio',
    icon: 'call',
    title: 'Audio Calls',
    line: 'Quick voice check-ins when typing is too slow.',
    detail: 'Short calls to talk through a plan, a plateau or a week that went sideways — no camera needed.',
  },
  {
    id: 'video',
    icon: 'videocam',
    title: 'Video Coaching',
    line: 'Live form checks so every rep earns its place.',
    detail: 'Train in front of the camera and get corrections as you go, on the lifts where technique decides the result.',
  },
  {
    id: 'recs',
    icon: 'sparkles',
    title: 'Workout Recommendations',
    line: 'Next-session picks that follow what you log.',
    detail: 'Finished sessions, skipped days and how hard each one felt all feed the next suggestion, so the plan keeps up with you.',
  },
  {
    id: 'progress',
    icon: 'trending-up',
    title: 'Progress Guidance',
    line: 'Load and recovery tuned as you get stronger.',
    detail: 'Your coach reads your logs for trends — volume, consistency and recovery — and says when to push and when to back off.',
  },
];

export default function ProWelcomeScreen() {
  const { state, markProIntroSeen } = useStore();
  const access = useAccess();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();

  const scroller = useRef<ScrollView>(null);
  const benefitsY = useRef(0);
  const seen = useRef(false);
  const [open, setOpen] = useState<string[]>([]);

  const pro = access.isPro;
  // Free and Smart must never see this; the trigger can only ever be wrong, never a reason to show it.
  useEffect(() => {
    if (!pro) router.replace('/(tabs)');
  }, [pro]);

  // Once-only: the ref keeps a re-render (expanding a benefit, a rotation) from re-marking.
  useEffect(() => {
    if (!pro || seen.current) return;
    seen.current = true;
    markProIntroSeen();
  }, [pro, markProIntroSeen]);

  const pop = useSharedValue(0);
  const halo = useSharedValue(0);
  useEffect(() => {
    pop.set(withSpring(1, { damping: 11, stiffness: 150, mass: 0.8 }));
    if (!reduce) halo.set(withDelay(200, withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1, false)));
  }, [pop, halo, reduce]);
  const medal = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.get() * 1.5), transform: [{ scale: interpolate(pop.get(), [0, 1], [0.4, 1]) }] }));
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(halo.get(), [0, 1], [0.5, 0]), transform: [{ scale: interpolate(halo.get(), [0, 1], [0.9, 1.75]) }] }));

  // The headline has to be readable without scrolling, so the stage gives way on short or narrow screens.
  const stage = Math.max(146, Math.min(222, width - 72, height * 0.27));
  const medalSize = Math.round(stage * 0.5);
  const haloSize = Math.round(stage * 0.59);
  const portrait = Math.round(Math.max(84, Math.min(112, width * 0.27)));
  const padTop = insets.top + 16;

  const trainer = trainerById(state.trainerId);
  const avail = availability(trainer);
  const allOpen = open.length === BENEFITS.length;
  const toggle = (id: string) => {
    tap();
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const exploreAll = () => {
    tap();
    setOpen(allOpen ? [] : BENEFITS.map((b) => b.id));
    if (!allOpen) scroller.current?.scrollTo({ y: Math.max(0, padTop + benefitsY.current - 12), animated: !reduce });
  };

  if (!pro) return <View style={st.blank} />;

  return (
    <LinearGradient colors={PREMIUM_BG} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.root}>
      <StatusBar style="light" />
      <Decor />
      <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={[st.content, { paddingTop: padTop }]}>
        <View style={st.inner}>
          {/* 1 — Celebration */}
          <View style={[st.celebrate, { width: stage, height: stage }]}>
            <Animated.View entering={nativeOnly(FadeIn.delay(180).duration(600))} style={StyleSheet.absoluteFill}>
              <Svg width="100%" height="100%" viewBox="0 0 222 222">
                {CONFETTI.map((d, i) => (
                  <Circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.c} fillOpacity={0.8} />
                ))}
              </Svg>
            </Animated.View>
            <Animated.View style={[st.halo, { width: haloSize, height: haloSize, borderRadius: haloSize / 2 }, ring]} />
            <Animated.View style={medal}>
              <LinearGradient
                colors={GOLD}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[st.medal, { width: medalSize, height: medalSize, borderRadius: medalSize / 2 }]}>
                <Ionicons name="diamond" size={Math.round(medalSize * 0.39)} color={C.navy} />
              </LinearGradient>
            </Animated.View>
          </View>

          <Animated.View entering={enter(2)}>
            <PlanBadge tier="pro" />
          </Animated.View>
          <Animated.Text entering={enter(3)} style={st.title}>
            Welcome to Pro! 🎉
          </Animated.Text>
          <Animated.Text entering={enter(4)} style={st.sub}>
            Your fitness journey just got personal. You now have your own dedicated fitness coach to guide you every step of the way.
          </Animated.Text>

          {/* 2 — Meet your coach. Always the coach already assigned in the store. */}
          <Animated.View entering={enter(5)} style={st.sectionLabelWrap}>
            <Text style={st.sectionLabel}>MEET YOUR COACH</Text>
          </Animated.View>
          <Animated.View entering={enter(6)} style={st.coachCard}>
            <View style={st.coachTop}>
              <TrainerAvatar trainer={trainer} size={portrait} online={avail.online} />
              <View style={st.coachHead}>
                <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.proCoach}>
                  <Ionicons name="diamond" size={9} color={C.navy} />
                  <Text style={st.proCoachText}>PRO COACH</Text>
                </LinearGradient>
                <Text style={st.coachName} numberOfLines={2}>
                  {trainer.name}
                </Text>
                <Text style={st.coachRole} numberOfLines={2}>
                  {trainer.role}
                </Text>
                <AvailabilityLine trainer={trainer} style={st.availPill} />
              </View>
            </View>

            <View style={st.coachStats}>
              <Stat icon="star" value={trainer.rating.toFixed(1)} label={`${trainer.reviews} reviews`} gold />
              <View style={st.vDivider} />
              <Stat icon="time-outline" value={`${trainer.years} yrs`} label="Coaching" />
              <View style={st.vDivider} />
              <Stat icon="ribbon-outline" value={String(trainer.certifications.length)} label="Certified" />
            </View>

            <View style={st.specs}>
              {trainer.specialities.map((sp) => (
                <Text key={sp} style={st.spec}>
                  {sp}
                </Text>
              ))}
            </View>

            <View style={st.quote}>
              <Ionicons name="chatbox-ellipses" size={14} color={C.gold} />
              <Text style={st.quoteText}>
                <Text style={st.quoteWho}>{firstName(trainer)}: </Text>
                {trainer.intro}
              </Text>
            </View>

            <View style={st.certs}>
              {trainer.certifications.map((c) => (
                <View key={c.title} style={st.cert}>
                  <View style={st.certDisc}>
                    <Ionicons name="ribbon" size={15} color={C.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.certTitle}>{c.title}</Text>
                    <Text style={st.certBody}>
                      {c.body} · {c.year}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={st.langRow}>
              <Ionicons name="language-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={st.langText} numberOfLines={2}>
                {trainer.languages.join(' · ')} · {trainer.city}
              </Text>
            </View>
          </Animated.View>

          {/* 3 — What you've unlocked */}
          <Animated.View entering={enter(7)} style={st.sectionLabelWrap} onLayout={(e) => (benefitsY.current = e.nativeEvent.layout.y)}>
            <Text style={st.sectionLabel}>{"WHAT YOU'VE UNLOCKED"}</Text>
          </Animated.View>
          {BENEFITS.map((b, i) => (
            <BenefitCard key={b.id} benefit={b} index={i} open={open.includes(b.id)} onToggle={() => toggle(b.id)} />
          ))}

          <Text style={st.footNote}>Coach profiles, calls and messages in this Pro preview are simulated, not a real person.</Text>
        </View>
      </ScrollView>

      <View style={[st.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={st.inner}>
          <Button
            title="Meet My Trainer"
            variant="dark"
            style={st.primaryBtn}
            textStyle={{ color: C.navy }}
            onPress={() => router.replace('/trainer')}
          />
          <Button
            title={allOpen ? 'Hide Pro benefit details' : 'Explore My Pro Benefits'}
            variant="ghost"
            style={st.secondaryBtn}
            textStyle={{ color: C.white }}
            onPress={exploreAll}
          />
          <PressableScale
            scaleTo={0.96}
            accessibilityRole="button"
            onPress={() => {
              tap();
              router.replace('/(tabs)');
            }}
            style={st.quietBtn}>
            <Text style={st.quietText}>Continue to Home</Text>
          </PressableScale>
        </View>
      </View>
    </LinearGradient>
  );
}

function Stat({ icon, value, label, gold }: { icon: IconName; value: string; label: string; gold?: boolean }) {
  return (
    <View style={st.stat}>
      <View style={st.statTop}>
        <Ionicons name={icon} size={13} color={gold ? C.gold : 'rgba(255,255,255,0.6)'} />
        <Text style={st.statValue}>{value}</Text>
      </View>
      <Text style={st.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** One unlocked capability. Tapping it — or the "Explore" action — reveals the longer copy in place. */
function BenefitCard({ benefit, index, open, onToggle }: { benefit: Benefit; index: number; open: boolean; onToggle: () => void }) {
  return (
    <Animated.View entering={enter(8 + index)} layout={layoutTransition}>
      <PressableScale
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${benefit.title}. ${open ? 'Hide' : 'Show'} details`}
        onPress={onToggle}
        style={[st.benefit, open && st.benefitOpen]}>
        <View style={st.benefitRow}>
          <View style={st.benefitDisc}>
            <Ionicons name={benefit.icon} size={18} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.benefitTitle}>{benefit.title}</Text>
            <Text style={st.benefitLine}>{benefit.line}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.45)" />
        </View>
        {open && <Text style={st.benefitDetail}>{benefit.detail}</Text>}
      </PressableScale>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  blank: { flex: 1, backgroundColor: C.navy },
  content: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  celebrate: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', borderWidth: 2, borderColor: C.gold },
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  title: { fontSize: 28, fontWeight: '800', color: C.white, textAlign: 'center', marginTop: 14, letterSpacing: -0.6 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 22 },

  sectionLabelWrap: { marginTop: 28, marginBottom: 10 },
  sectionLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  coachCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(245,196,81,0.28)' },
  coachTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  coachHead: { flex: 1, alignItems: 'flex-start' },
  proCoach: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  proCoachText: { color: C.navy, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7 },
  coachName: { color: C.white, fontSize: 21, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 },
  coachRole: { color: 'rgba(255,255,255,0.68)', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 2 },
  availPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 10, height: 28, marginTop: 8, maxWidth: '100%' },

  coachStats: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  stat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { color: C.white, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10.5, fontWeight: '600' },
  vDivider: { width: StyleSheet.hairlineWidth * 2, height: 30, backgroundColor: 'rgba(255,255,255,0.16)' },

  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  spec: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },

  quote: { flexDirection: 'row', gap: 9, marginTop: 14, padding: 12, borderRadius: R.md, backgroundColor: 'rgba(245,196,81,0.12)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(245,196,81,0.26)' },
  quoteText: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  quoteWho: { color: C.white, fontWeight: '800' },

  certs: { marginTop: 14, gap: 10 },
  cert: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  certDisc: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: fade(C.gold, 0.16) },
  certTitle: { color: C.white, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  certBody: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.12)' },
  langText: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: '700' },

  benefit: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: R.md, padding: 13, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  benefitOpen: { backgroundColor: 'rgba(255,255,255,0.11)', borderColor: 'rgba(245,196,81,0.3)' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitDisc: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: fade(C.gold, 0.16) },
  benefitTitle: { color: C.white, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  benefitLine: { color: 'rgba(255,255,255,0.62)', fontSize: 12.5, fontWeight: '500', lineHeight: 17, marginTop: 2 },
  benefitDetail: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 19, marginTop: 11, paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.14)' },

  footNote: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', lineHeight: 16, textAlign: 'center', marginTop: 18, paddingHorizontal: 8 },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(11,11,12,0.94)', borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: 'rgba(255,255,255,0.12)' },
  primaryBtn: { alignSelf: 'stretch', backgroundColor: C.gold, borderColor: C.gold },
  secondaryBtn: { alignSelf: 'stretch', height: 46, marginTop: 8, borderColor: 'rgba(255,255,255,0.22)' },
  quietBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  quietText: { color: 'rgba(255,255,255,0.6)', fontSize: 13.5, fontWeight: '700' },
});
