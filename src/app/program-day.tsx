import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  ZoomIn,
  ZoomOut,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { LockBadge, LockedScreen, openUpgrade } from '@/components/premium/locked';
import { ExerciseArt } from '@/components/program/ExerciseArt';
import { ExerciseSheet } from '@/components/program/ExerciseSheet';
import { GradientButton } from '@/components/program/GradientButton';
import { accentTheme, findSession, itemLabel, planItems, sessionMeta, type Accent } from '@/components/program/session';
import { WorkoutSettingsSheet } from '@/components/program/WorkoutSettingsSheet';
import { Button, Card, EmptyState, enter, Header, IconTile, layoutTransition, nativeOnly, ListRow, PressableScale, Screen, SectionTitle, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { exerciseById, sessionStats, type Session, type SessionItem } from '@/data/program';
import { useStore } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C, MOTION, R, shadowLg, shadowSm } from '@/theme';
import { Glyph } from '@/components/Glyph';
import { sessionArt } from '@/components/glyphs';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/fitness'));
const restTips = (t: Accent): { icon: IconName; color: string; bg: string; t: string }[] => [
  { icon: 'water', color: C.water, bg: C.waterSoft, t: 'Drink 8+ glasses of water to help your muscles recover.' },
  { icon: 'walk', color: C.steps, bg: C.stepsSoft, t: 'Go for a light 20-minute walk to keep blood flowing.' },
  { icon: 'body', color: t.accent, bg: t.soft, t: 'Do some gentle stretching or yoga for 10 minutes.' },
  { icon: 'nutrition', color: C.accent, bg: C.accentSoft, t: 'Eat enough protein — it rebuilds the muscle you trained.' },
  { icon: 'moon', color: C.weight, bg: C.weightSoft, t: 'Aim for 7–9 hours of sleep tonight.' },
];

const rowLayout = layoutTransition;
const rowOut = nativeOnly(FadeOut.duration(MOTION.fast));
const ctlIn = nativeOnly(ZoomIn.duration(MOTION.base));
const ctlOut = nativeOnly(ZoomOut.duration(MOTION.fast));

export default function ProgramDayScreen() {
  const { key: rawKey } = useLocalSearchParams<{ key?: string | string[] }>();
  const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
  const session = useMemo(() => findSession(String(key ?? '')), [key]);
  const access = useAccess();
  if (!session)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState icon="barbell-outline" title="Workout not found" text="This plan day doesn't exist or the link is incorrect." action="Go back" onAction={goBack} />
      </Screen>
    );
  // Plan gate: a locked day sells the upgrade instead of opening. Progress is never touched.
  const lock = access.lockFor(session.key);
  if (lock) return <LockedScreen lock={lock} eyebrow={sessionMeta(session).eyebrow} onBack={goBack} />;
  return <DayPlan key={session.key} session={session} />;
}

/** Stable-ish row keys: exercise id + occurrence, so removing a row animates the right one. */
const rowKeys = (items: SessionItem[]) => {
  const seen: Record<string, number> = {};
  return items.map((it) => {
    seen[it.exerciseId] = (seen[it.exerciseId] ?? 0) + 1;
    return `${it.exerciseId}-${seen[it.exerciseId]}`;
  });
};

function DayPlan({ session }: { session: Session }) {
  const { state, completeSession, setPlanEdit, clearResume, markTipSeen } = useStore();
  const access = useAccess();
  const canEdit = access.can('plan.customise');
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const meta = sessionMeta(session);
  const t = useMemo(() => accentTheme(session.colors), [session.colors]);
  const HERO = insets.top + 236;

  const [items, setItems] = useState<SessionItem[]>(() => planItems(session, state.planEdits));
  const [editing, setEditing] = useState(false);
  const [tip, setTip] = useState(() => canEdit && !state.seenTips.includes('plan-edit') && !session.restDay);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(false);
  const [solid, setSolid] = useState(false);
  const y = useSharedValue(0);
  const solidSV = useSharedValue(false);
  const tipP = useSharedValue(0);
  const firstItems = useRef(true);
  const restMarked = useRef(false);

  useEffect(() => {
    if (!tip) return;
    markTipSeen('plan-edit');
    tipP.set(withDelay(450, withSpring(1, { damping: 13, stiffness: 190, mass: 0.8 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist plan edits (skipping the initial load) so the player and later visits use them.
  useEffect(() => {
    if (firstItems.current) {
      firstItems.current = false;
      return;
    }
    setPlanEdit(session.key, JSON.stringify(items) === JSON.stringify(session.items) ? null : items);
  }, [items, session, setPlanEdit]);

  const resume = state.sessionResume[session.key];
  const resumeAt = resume ? Math.max(0, Math.min(resume.idx, items.length - 1)) : 0;
  const canResume = !!resume && (resumeAt > 0 || resume.done.length > 0);
  const resumePct = resume ? Math.min(100, Math.round((resume.done.length / items.length) * 100)) : 0;

  const stats = sessionStats({ ...session, items }, state.settings.restSeconds);
  const done = meta.program ? state.programProgress[meta.program.id] ?? 0 : 0;
  const completed = meta.day !== undefined && done >= meta.day;
  const edited = JSON.stringify(items) !== JSON.stringify(session.items);
  const keys = rowKeys(items);

  // Scroll-linked header (UI thread); only the status-bar flip crosses to JS.
  const onScroll = useAnimatedScrollHandler((e) => {
    const off = e.contentOffset.y;
    y.set(off);
    const v = off > HERO - 110;
    if (v !== solidSV.get()) {
      solidSV.set(v);
      scheduleOnRN(setSolid, v);
    }
  });
  const barBg = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [HERO - 140, HERO - 80], [0, 1], Extrapolation.CLAMP) }));
  const barTitle = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [HERO - 120, HERO - 70], [0, 1], Extrapolation.CLAMP) }));
  const heroContent = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [0, HERO * 0.55], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.get(), [-120, 0, HERO], [-24, 0, HERO * 0.32], Extrapolation.CLAMP) }],
  }));
  const heroArt = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(y.get(), [-140, 0], [1.18, 1], Extrapolation.CLAMP) }] }));
  const tipStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, tipP.get()), transform: [{ scale: interpolate(tipP.get(), [0, 1], [0.85, 1]) }] }));

  const dismissTip = () => setTip(false);
  const toggleEdit = () => {
    if (tip) dismissTip();
    // Tuning a routine is a Smart feature; Free taps go to the paywall instead.
    if (!canEdit) return openUpgrade(access.lock('plan.customise')!.need);
    setEditing((e) => !e);
  };
  const finishEdit = () => {
    setEditing(false);
    if (edited) toast('Workout plan updated', 'create');
  };
  const remove = (i: number) => {
    if (items.length <= 1) return toast('Keep at least one exercise', 'alert-circle');
    setItems((list) => list.filter((_, k) => k !== i));
    clearResume(session.key);
  };
  const adjust = (i: number, dir: 1 | -1) =>
    setItems((list) =>
      list.map((it, k) => {
        if (k !== i) return it;
        if (it.seconds) return { ...it, seconds: Math.max(5, Math.min(300, it.seconds + dir * 5)) };
        return { ...it, reps: Math.max(1, Math.min(100, (it.reps ?? 10) + dir)) };
      }),
    );
  const resetPlan = () => {
    setItems(session.items);
    clearResume(session.key);
  };
  const start = (cont = false) => {
    if (!cont) clearResume(session.key);
    router.push({ pathname: '/player', params: cont ? { key: session.key, resume: '1' } : { key: session.key } });
  };
  const markRest = () => {
    if (!meta.program || meta.day === undefined || restMarked.current) return;
    if (meta.day !== done + 1) return toast(`Finish Day ${done + 1} first`, 'information-circle');
    restMarked.current = true;
    completeSession({ sessionKey: session.key, title: `${meta.program.title} · Day ${meta.day} (Rest)`, emoji: '😴', minutes: 0, kcal: 0 });
    toast(`Day ${meta.day} rest complete — see you tomorrow!`, 'moon');
    goBack();
  };
  const afterMore = (fn: () => void) => {
    setMore(false);
    setTimeout(fn, 350);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={solid ? 'dark' : 'light'} />
      <View style={[s.overscroll, { height: HERO, backgroundColor: session.colors[0] }]} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        <LinearGradient colors={session.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, { height: HERO, paddingTop: insets.top + 60 }]}>
          <View pointerEvents="none" style={s.heroDeco}>
            <Svg width={300} height={300}>
              <Circle cx={150} cy={150} r={150} fill={C.white} opacity={0.08} />
              <Circle cx={150} cy={150} r={98} fill="none" stroke={C.white} strokeOpacity={0.16} strokeWidth={1.5} />
              <Circle cx={150} cy={150} r={46} fill={C.white} opacity={0.07} />
            </Svg>
          </View>
          <Animated.View style={[{ flex: 1 }, heroContent]}>
            <View style={{ paddingRight: 116 }}>
              <View style={s.eyebrowPill}>
                <Text style={s.eyebrow} numberOfLines={1}>
                  {meta.eyebrow}
                </Text>
              </View>
              <Text style={[s.heroTitle, session.title.length > 12 && { fontSize: 28 }]} numberOfLines={2}>
                {session.title}
              </Text>
              <View style={s.levelRow}>
                <View style={{ flexDirection: 'row' }}>
                  {[1, 2, 3].map((n) => (
                    <Ionicons key={n} name="flash" size={15} color={n <= meta.bolts ? C.gold : 'rgba(255,255,255,0.35)'} />
                  ))}
                </View>
                <Text style={s.levelText}>{meta.level}</Text>
              </View>
              {meta.program && meta.day !== undefined && (
                <View style={s.journey}>
                  <View style={s.journeyTrack}>
                    <View style={[s.journeyFill, { width: `${Math.min(100, (done / 30) * 100)}%` }]} />
                  </View>
                  <Text style={s.journeyText}>{done}/30 days</Text>
                </View>
              )}
              {completed && (
                <View style={s.doneBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.white} />
                  <Text style={s.doneBadgeText}>Done · nice work</Text>
                </View>
              )}
            </View>
            <Animated.View style={[s.heroDisc, heroArt]}>
              <Glyph emoji={session.emoji} src={sessionArt(session.key)} size={sessionArt(session.key) ? 120 : 74} />
            </Animated.View>
          </Animated.View>
        </LinearGradient>

        <View style={s.body}>
          {session.restDay ? (
            <RestDay done={completed} t={t} />
          ) : (
            <>
              <Animated.View entering={enter(0)}>
                <View style={s.stats}>
                  <Stat icon="body" color={t.accent} bg={t.soft} value={`${stats.exercises}`} label="Moves" />
                  <Stat icon="time" color={C.water} bg={C.waterSoft} value={`${stats.minutes}`} unit=" min" label="Duration" />
                  <Stat icon="flame" color={C.warning} bg={C.warningSoft} value={`~${stats.kcal}`} unit=" kcal" label="Est. burn" />
                </View>
              </Animated.View>

              <Animated.View entering={enter(1)}>
                <Card style={s.settingsCard}>
                  <ListRow icon="options" iconBg={t.soft} iconColor={t.accent} title="Tune your workout" subtitle="Rest time, countdown, coach & music" onPress={() => setSettings(true)} />
                </Card>
              </Animated.View>

              <Animated.View entering={enter(2)} style={s.exHead}>
                <Text style={s.exTitle}>Your routine</Text>
                <View style={[s.countPill, { backgroundColor: t.soft }]}>
                  <Text style={[s.countText, { color: t.accent }]}>{items.length}</Text>
                </View>
                <View style={{ flex: 1 }} />
                {editing && edited && (
                  <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))}>
                    <Pressable hitSlop={10} onPress={resetPlan} style={{ marginRight: 14 }}>
                      <Text style={[s.resetText, { color: t.accent }]}>Reset</Text>
                    </Pressable>
                  </Animated.View>
                )}
                <PressableScale scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={editing ? 'Finish editing' : 'Edit plan'} onPress={toggleEdit} style={[s.pencil, editing && { backgroundColor: t.accent, borderColor: t.accent }]}>
                  <Ionicons name={editing ? 'checkmark' : 'pencil'} size={18} color={editing ? t.on : C.text} />
                  {!canEdit && <LockBadge need="smart" compact style={{ position: 'absolute', top: -5, right: -5 }} />}
                </PressableScale>
                {tip && (
                  <Animated.View exiting={nativeOnly(FadeOut.duration(160))} style={[s.tip, tipStyle]}>
                    <View style={s.tipArrow} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <IconTile icon="create-outline" size={42} color={t.accent} bg={t.soft} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.tipTitle}>Make it yours</Text>
                        <Text style={s.tipText}>Tap the pencil to remove moves or change reps and time.</Text>
                      </View>
                    </View>
                    <Button title="Got it" small onPress={dismissTip} style={{ marginTop: 14, backgroundColor: t.accent }} textStyle={{ color: t.on }} />
                  </Animated.View>
                )}
              </Animated.View>

              <View>
                {items.map((it, i) => {
                  const ex = exerciseById(it.exerciseId);
                  return (
                    <Animated.View key={keys[i]} entering={enter(i + 3)} exiting={rowOut} layout={rowLayout} style={s.step}>
                      {/* Timeline rail: numbered stop, joined to its neighbours */}
                      <View style={s.rail}>
                        <View style={[s.railLine, { backgroundColor: t.tint }, i === 0 && { top: '50%' }, i === items.length - 1 && { bottom: '50%' }]} />
                        <View style={[s.railDot, { backgroundColor: t.accent }]}>
                          <Text style={[s.railNum, { color: t.on }]}>{i + 1}</Text>
                        </View>
                      </View>
                      <PressableScale
                        scaleTo={0.98}
                        accessibilityRole="button"
                        onPress={() => {
                          tap();
                          setSheetIdx(i);
                        }}
                        style={[s.row, { flex: 1 }]}>
                        {editing && (
                          <Animated.View entering={ctlIn} exiting={ctlOut}>
                            <Pressable hitSlop={8} accessibilityLabel={`Remove ${ex.name}`} onPress={() => remove(i)} style={s.minus}>
                              <Ionicons name="remove" size={16} color={C.white} />
                            </Pressable>
                          </Animated.View>
                        )}
                        <ExerciseArt id={ex.id} emoji={ex.emoji} size={60} animated radius={R.sm} tint={t.art} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.rowName} numberOfLines={2}>
                            {ex.name}
                          </Text>
                          <View style={[s.amount, { backgroundColor: t.soft }]}>
                            <Ionicons name={it.seconds ? 'timer-outline' : 'repeat'} size={13} color={t.accent} />
                            <Text style={[s.amountText, { color: t.accent }]}>{itemLabel(it)}</Text>
                          </View>
                        </View>
                        {editing ? (
                          <Animated.View entering={ctlIn} exiting={ctlOut} style={s.adjust}>
                            <PressableScale scaleTo={0.88} hitSlop={6} accessibilityLabel="Less" onPress={() => (tap(), adjust(i, -1))} style={s.adjBtn}>
                              <Ionicons name="remove" size={16} color={C.text} />
                            </PressableScale>
                            <PressableScale scaleTo={0.88} hitSlop={6} accessibilityLabel="More" onPress={() => (tap(), adjust(i, 1))} style={[s.adjBtn, { backgroundColor: t.accent, borderColor: t.accent }]}>
                              <Ionicons name="add" size={16} color={t.on} />
                            </PressableScale>
                          </Animated.View>
                        ) : (
                          <Ionicons name="information-circle-outline" size={20} color={C.muted} />
                        )}
                      </PressableScale>
                    </Animated.View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Top bar: fades from transparent-over-hero to solid white on scroll */}
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, s.topBarBg, barBg]} pointerEvents="none" />
        <TopIcon icon="arrow-back" label="Back" y={y} hero={HERO} onPress={goBack} />
        <Animated.Text style={[s.topTitle, barTitle]} numberOfLines={1}>
          {session.title}
        </Animated.Text>
        <TopIcon icon="ellipsis-horizontal" label="Options" y={y} hero={HERO} onPress={() => setMore(true)} />
      </View>

      {/* Sticky bottom CTA */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {session.restDay ? (
          completed ? (
            <Button title="Rest day completed" icon="checkmark-circle" variant="secondary" onPress={goBack} />
          ) : (
            <GradientButton colors={t.cta} fg={t.on} title="Mark rest day as done" icon="moon" onPress={markRest} />
          )
        ) : editing ? (
          <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} style={s.adjustPill}>
            <View style={{ flex: 1 }}>
              <Text style={s.adjustTitle}>Adjust</Text>
              <Text style={s.adjustHint}>Remove or change reps & time</Text>
            </View>
            <PressableScale
              scaleTo={0.95}
              accessibilityRole="button"
              onPress={() => {
                tap();
                finishEdit();
              }}
              style={[s.doneBtn, { backgroundColor: t.accent }]}>
              <Ionicons name="checkmark" size={18} color={t.on} />
              <Text style={[s.doneText, { color: t.on }]}>Done</Text>
            </PressableScale>
          </Animated.View>
        ) : canResume ? (
          <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale
              scaleTo={0.96}
              accessibilityRole="button"
              onPress={() => {
                tap();
                start(false);
              }}
              style={s.restart}>
              <Ionicons name="refresh" size={17} color={C.text} />
              <Text style={s.restartText}>Restart</Text>
            </PressableScale>
            <GradientButton colors={t.cta} fg={t.on} title={`Continue · ${resumePct}% done`} onPress={() => start(true)} style={{ flex: 1 }} />
          </Animated.View>
        ) : (
          <GradientButton colors={t.cta} fg={t.on} title={completed ? 'Do it again' : `Let's go · ${stats.minutes} min`} icon="play" onPress={() => start(false)} />
        )}
      </View>

      <ExerciseSheet visible={sheetIdx !== null} index={sheetIdx ?? 0} items={items} onClose={() => setSheetIdx(null)} accent={t} />
      <WorkoutSettingsSheet visible={settings} onClose={() => setSettings(false)} />
      <Sheet visible={more} onClose={() => setMore(false)} title="Options">
        {!session.restDay && (
          <ListRow
            icon="refresh"
            title={meta.program ? 'Restart this day' : 'Restart this workout'}
            subtitle="Clear saved progress and plan edits"
            onPress={() =>
              afterMore(() => {
                resetPlan();
                toast(`${session.title} restarted`, 'refresh');
              })
            }
          />
        )}
        <ListRow icon="swap-horizontal" iconBg={C.workoutSoft} iconColor={C.workout} title="Change plan" subtitle="Pick a different 30-day program" onPress={() => afterMore(() => router.push('/select-plan'))} />
        <ListRow icon="options" iconBg={C.accentSoft} iconColor={C.accent} title="Workout settings" subtitle="Rest time, countdown, coach & music" onPress={() => afterMore(() => setSettings(true))} />
      </Sheet>
    </View>
  );
}

function Stat({ icon, color, bg, value, unit, label }: { icon: IconName; color: string; bg: string; value: string; unit?: string; label: string }) {
  return (
    <View style={[s.statTile, { backgroundColor: bg }]}>
      <View style={s.statIcon}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ alignItems: 'flex-start' }}>
        <Text style={s.statVal} numberOfLines={1} adjustsFontSizeToFit>
          {value}
          {unit && <Text style={s.statUnit}>{unit}</Text>}
        </Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TopIcon({ icon, label, y, hero, onPress }: { icon: IconName; label: string; y: SharedValue<number>; hero: number; onPress: () => void }) {
  const light = useAnimatedStyle(() => ({ opacity: 1 - interpolate(y.get(), [hero - 140, hero - 80], [0, 1], Extrapolation.CLAMP) }));
  const dark = useAnimatedStyle(() => ({ opacity: interpolate(y.get(), [hero - 140, hero - 80], [0, 1], Extrapolation.CLAMP) }));
  return (
    <PressableScale
      hitSlop={8}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={s.topIcon}>
      <Animated.View style={[StyleSheet.absoluteFill, s.topIconLight, light]}>
        <Ionicons name={icon} size={21} color={C.white} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, s.topIconDark, dark]}>
        <Ionicons name={icon} size={21} color={C.text} />
      </Animated.View>
    </PressableScale>
  );
}

function RestDay({ done, t }: { done: boolean; t: Accent }) {
  return (
    <View>
      <Animated.View entering={enter(0)}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
          <View style={[s.restArt, { backgroundColor: t.soft }]}>
            <Glyph emoji="😴" size={66} />
          </View>
          <Text style={[T.h2, { textAlign: 'center', marginTop: 14 }]}>Recovery is part of training</Text>
          <Text style={[T.body, { textAlign: 'center', marginTop: 8 }]}>
            {done ? "You've already logged this rest day. Great discipline — your muscles thank you!" : 'Muscles grow and repair while you rest. Take it easy today — you have earned it.'}
          </Text>
        </Card>
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <SectionTitle title="Rest-day tips" />
        <Card style={{ gap: 14 }}>
          {restTips(t).map((tip) => (
            <View key={tip.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon={tip.icon} color={tip.color} bg={tip.bg} size={38} />
              <Text style={[T.body, { flex: 1, color: C.text }]}>{tip.t}</Text>
            </View>
          ))}
        </Card>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, overflow: 'hidden' },
  heroDeco: { position: 'absolute', top: -90, right: -110 },
  overscroll: { position: 'absolute', top: 0, left: 0, right: 0 },
  eyebrowPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill },
  eyebrow: { color: C.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  heroTitle: { color: C.white, fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 10 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  journey: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  journeyTrack: { flex: 1, maxWidth: 150, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  journeyFill: { height: '100%', borderRadius: 3, backgroundColor: C.white },
  journeyText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  levelText: { color: C.white, fontSize: 14, fontWeight: '600' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  doneBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },
  heroDisc: { position: 'absolute', right: 0, top: 4, width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  body: { marginTop: -28, backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 16, paddingTop: 18 },
  stats: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, padding: 12, borderRadius: R.lg, gap: 10 },
  statIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  statUnit: { fontSize: 12, fontWeight: '600', color: C.textSoft, letterSpacing: 0 },
  statLabel: { fontSize: 11.5, color: C.textSoft, fontWeight: '700', marginTop: 1 },
  settingsCard: { marginTop: 10, paddingVertical: 2, paddingHorizontal: 10 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12, zIndex: 20 },
  exTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  countPill: { minWidth: 26, height: 22, paddingHorizontal: 7, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  resetText: { fontWeight: '700', fontSize: 14 },
  pencil: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  tip: { position: 'absolute', top: 50, right: -4, width: 290, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadowLg },
  tipArrow: { position: 'absolute', top: -7, right: 16, width: 16, height: 16, backgroundColor: C.card, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  tipText: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 3 },
  step: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  rail: { width: 26, alignItems: 'center', justifyContent: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1 },
  railDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.bg },
  railNum: { fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, marginVertical: 5, backgroundColor: C.card, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadowSm },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  amountText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  minus: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  adjust: { flexDirection: 'row', gap: 8 },
  adjBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceAlt, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  topBarBg: { backgroundColor: C.card, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  topIcon: { width: 40, height: 40 },
  topIconLight: { alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.18)' },
  topIconDark: { alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: C.surfaceAlt },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  restart: { flexDirection: 'row', gap: 6, height: 54, paddingHorizontal: 18, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  restartText: { fontSize: 15, fontWeight: '700', color: C.text },
  adjustPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, borderRadius: R.lg, paddingLeft: 20, paddingRight: 6, height: 60, ...shadowSm },
  adjustTitle: { color: C.white, fontSize: 16, fontWeight: '700' },
  adjustHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 20, borderRadius: R.md },
  doneText: { fontSize: 15, fontWeight: '700' },
  restArt: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
