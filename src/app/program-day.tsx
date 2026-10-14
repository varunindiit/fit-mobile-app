import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
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

import { ExerciseArt } from '@/components/program/ExerciseArt';
import { ExerciseSheet } from '@/components/program/ExerciseSheet';
import { GradientButton, PRIMARY_COLORS } from '@/components/program/GradientButton';
import { editedPlans, findSession, itemLabel, planItems, programFlags, resumePoints, sessionMeta } from '@/components/program/session';
import { WorkoutSettingsSheet } from '@/components/program/WorkoutSettingsSheet';
import { Button, Card, EmptyState, enter, Header, IconTile, ListRow, PressableScale, Screen, SectionTitle, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { exerciseById, sessionStats, type Session, type SessionItem } from '@/data/program';
import { useStore } from '@/lib/store';
import { C, MOTION, R, shadowLg, shadowSm } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/fitness'));
const REST_TIPS: { icon: IconName; color: string; bg: string; t: string }[] = [
  { icon: 'water', color: C.water, bg: C.waterSoft, t: 'Drink 8+ glasses of water to help your muscles recover.' },
  { icon: 'walk', color: C.steps, bg: C.stepsSoft, t: 'Go for a light 20-minute walk to keep blood flowing.' },
  { icon: 'body', color: C.primaryDark, bg: C.primarySoft, t: 'Do some gentle stretching or yoga for 10 minutes.' },
  { icon: 'nutrition', color: C.accent, bg: C.accentSoft, t: 'Eat enough protein — it rebuilds the muscle you trained.' },
  { icon: 'moon', color: C.weight, bg: C.weightSoft, t: 'Aim for 7–9 hours of sleep tonight.' },
];

const rowLayout = LinearTransition.duration(MOTION.base);
const rowOut = FadeOut.duration(MOTION.fast);
const ctlIn = ZoomIn.duration(MOTION.base);
const ctlOut = ZoomOut.duration(MOTION.fast);

export default function ProgramDayScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const session = useMemo(() => findSession(String(key ?? '')), [key]);
  if (!session)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState icon="barbell-outline" title="Workout not found" text="This plan day doesn't exist or the link is incorrect." action="Go back" onAction={goBack} />
      </Screen>
    );
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
  const { state, completeSession } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const meta = sessionMeta(session);
  const HERO = insets.top + 236;

  const [items, setItems] = useState<SessionItem[]>(() => planItems(session));
  const [editing, setEditing] = useState(false);
  const [tip, setTip] = useState(() => !programFlags.tipShown && !session.restDay);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [solid, setSolid] = useState(false);
  const y = useSharedValue(0);
  const solidSV = useSharedValue(false);
  const tipP = useSharedValue(0);

  useEffect(() => {
    if (!tip) return;
    programFlags.tipShown = true;
    tipP.set(withDelay(450, withSpring(1, { damping: 13, stiffness: 190, mass: 0.8 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the edited plan in the in-memory store so the player uses it.
  useEffect(() => {
    if (JSON.stringify(items) === JSON.stringify(session.items)) editedPlans.delete(session.key);
    else editedPlans.set(session.key, items);
  }, [items, session]);

  useFocusEffect(
    useCallback(() => {
      setResumeAt(Math.min(resumePoints.get(session.key) ?? 0, planItems(session).length - 1));
    }, [session]),
  );

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
    setEditing((e) => !e);
  };
  const finishEdit = () => {
    setEditing(false);
    if (edited) toast('Workout plan updated', 'create');
  };
  const remove = (i: number) => {
    if (items.length <= 1) return toast('Keep at least one exercise', 'alert-circle');
    setItems((list) => list.filter((_, k) => k !== i));
    resumePoints.delete(session.key);
    setResumeAt(0);
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
    resumePoints.delete(session.key);
    setResumeAt(0);
  };
  const start = (resume = false) => {
    if (!resume) {
      resumePoints.delete(session.key);
      setResumeAt(0);
    }
    router.push({ pathname: '/player', params: resume ? { key: session.key, resume: '1' } : { key: session.key } });
  };
  const markRest = () => {
    if (!meta.program) return;
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
              {completed && (
                <View style={s.doneBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={C.white} />
                  <Text style={s.doneBadgeText}>Completed</Text>
                </View>
              )}
            </View>
            <Animated.View style={[s.heroDisc, heroArt]}>
              <Text style={s.heroEmoji}>{session.emoji}</Text>
            </Animated.View>
          </Animated.View>
        </LinearGradient>

        <View style={s.body}>
          {session.restDay ? (
            <RestDay done={completed} />
          ) : (
            <>
              <Animated.View entering={enter(0)}>
                <Card style={s.stats}>
                  <Stat icon="list" color={C.primaryDark} bg={C.primarySoft} value={`${stats.exercises}`} label="Exercises" />
                  <View style={s.statDiv} />
                  <Stat icon="time" color={C.water} bg={C.waterSoft} value={`${stats.minutes}`} unit=" min" label="Time" />
                  <View style={s.statDiv} />
                  <Stat icon="flame" color={C.accent} bg={C.accentSoft} value={`${stats.kcal}`} unit=" kcal" label="Calories (≈)" />
                </Card>
              </Animated.View>

              <Animated.View entering={enter(1)}>
                <Card style={s.settingsCard}>
                  <ListRow icon="options" iconBg={C.accentSoft} iconColor={C.accent} title="Workout settings" subtitle="Music, coach, timer & more" onPress={() => setSettings(true)} />
                </Card>
              </Animated.View>

              <Animated.View entering={enter(2)} style={s.exHead}>
                <Text style={s.exTitle}>Exercises</Text>
                <View style={s.countPill}>
                  <Text style={s.countText}>{items.length}</Text>
                </View>
                <View style={{ flex: 1 }} />
                {editing && edited && (
                  <Animated.View entering={FadeIn.duration(MOTION.base)} exiting={FadeOut.duration(MOTION.fast)}>
                    <Pressable hitSlop={10} onPress={resetPlan} style={{ marginRight: 14 }}>
                      <Text style={s.resetText}>Reset</Text>
                    </Pressable>
                  </Animated.View>
                )}
                <PressableScale scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={editing ? 'Finish editing' : 'Edit plan'} onPress={toggleEdit} style={[s.pencil, editing && s.pencilOn]}>
                  <Ionicons name={editing ? 'checkmark' : 'pencil'} size={18} color={editing ? C.white : C.text} />
                </PressableScale>
                {tip && (
                  <Animated.View exiting={FadeOut.duration(160)} style={[s.tip, tipStyle]}>
                    <View style={s.tipArrow} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <IconTile icon="create-outline" size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.tipTitle}>{"Don't like some exercises?"}</Text>
                        <Text style={s.tipText}>Tap here to customize your workout plan just the way you like it!</Text>
                      </View>
                    </View>
                    <Button title="Got it" small onPress={dismissTip} style={{ marginTop: 14 }} />
                  </Animated.View>
                )}
              </Animated.View>

              <View style={{ gap: 10 }}>
                {items.map((it, i) => {
                  const ex = exerciseById(it.exerciseId);
                  return (
                    <Animated.View key={keys[i]} entering={enter(i + 3)} exiting={rowOut} layout={rowLayout}>
                      <PressableScale
                        scaleTo={0.98}
                        accessibilityRole="button"
                        onPress={() => {
                          tap();
                          setSheetIdx(i);
                        }}
                        style={s.row}>
                        {editing && (
                          <Animated.View entering={ctlIn} exiting={ctlOut}>
                            <Pressable hitSlop={8} accessibilityLabel={`Remove ${ex.name}`} onPress={() => remove(i)} style={s.minus}>
                              <Ionicons name="remove" size={16} color={C.white} />
                            </Pressable>
                          </Animated.View>
                        )}
                        <ExerciseArt emoji={ex.emoji} size={60} radius={R.sm} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.rowName} numberOfLines={2}>
                            {ex.name}
                          </Text>
                          <View style={s.amount}>
                            <Ionicons name={it.seconds ? 'timer-outline' : 'repeat'} size={13} color={C.primaryDark} />
                            <Text style={s.amountText}>{itemLabel(it)}</Text>
                          </View>
                        </View>
                        {editing ? (
                          <Animated.View entering={ctlIn} exiting={ctlOut} style={s.adjust}>
                            <PressableScale scaleTo={0.88} hitSlop={6} accessibilityLabel="Less" onPress={() => (tap(), adjust(i, -1))} style={s.adjBtn}>
                              <Ionicons name="remove" size={16} color={C.text} />
                            </PressableScale>
                            <PressableScale scaleTo={0.88} hitSlop={6} accessibilityLabel="More" onPress={() => (tap(), adjust(i, 1))} style={[s.adjBtn, s.adjBtnOn]}>
                              <Ionicons name="add" size={16} color={C.white} />
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
            <GradientButton title="Mark rest day as done" icon="moon" colors={PRIMARY_COLORS} onPress={markRest} />
          )
        ) : editing ? (
          <Animated.View entering={FadeIn.duration(MOTION.base)} style={s.adjustPill}>
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
              style={s.doneBtn}>
              <Ionicons name="checkmark" size={18} color={C.white} />
              <Text style={s.doneText}>Done</Text>
            </PressableScale>
          </Animated.View>
        ) : resumeAt > 0 ? (
          <Animated.View entering={FadeIn.duration(MOTION.base)} style={{ flexDirection: 'row', gap: 10 }}>
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
            <GradientButton title={`Continue · ${Math.round((resumeAt / items.length) * 100)}% done`} onPress={() => start(true)} style={{ flex: 1 }} />
          </Animated.View>
        ) : (
          <GradientButton title={completed ? 'START AGAIN' : 'START'} icon="play" onPress={() => start(false)} />
        )}
      </View>

      <ExerciseSheet visible={sheetIdx !== null} index={sheetIdx ?? 0} items={items} onClose={() => setSheetIdx(null)} />
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
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <IconTile icon={icon} color={color} bg={bg} size={34} />
      <View style={{ alignItems: 'center' }}>
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

function RestDay({ done }: { done: boolean }) {
  return (
    <View>
      <Animated.View entering={enter(0)}>
        <Card style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}>
          <View style={s.restArt}>
            <Text style={{ fontSize: 52 }}>😴</Text>
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
          {REST_TIPS.map((t) => (
            <View key={t.icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <IconTile icon={t.icon} color={t.color} bg={t.bg} size={38} />
              <Text style={[T.body, { flex: 1, color: C.text }]}>{t.t}</Text>
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
  levelText: { color: C.white, fontSize: 14, fontWeight: '600' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  doneBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },
  heroDisc: { position: 'absolute', right: 0, top: 4, width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 58 },
  body: { marginTop: -28, backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 16, paddingTop: 18 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  statDiv: { width: StyleSheet.hairlineWidth * 2, height: 44, backgroundColor: C.borderSoft },
  statVal: { fontSize: 19, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  statUnit: { fontSize: 12, fontWeight: '600', color: C.textSoft, letterSpacing: 0 },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 1 },
  settingsCard: { marginTop: 10, paddingVertical: 2, paddingHorizontal: 10 },
  exHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12, zIndex: 20 },
  exTitle: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  countPill: { minWidth: 26, height: 22, paddingHorizontal: 7, borderRadius: R.pill, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, fontWeight: '700', color: C.primaryDark, fontVariant: ['tabular-nums'] },
  resetText: { color: C.primary, fontWeight: '700', fontSize: 14 },
  pencil: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  pencilOn: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  tip: { position: 'absolute', top: 50, right: -4, width: 290, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadowLg },
  tipArrow: { position: 'absolute', top: -7, right: 16, width: 16, height: 16, backgroundColor: C.card, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  tipText: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, backgroundColor: C.card, borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadowSm },
  rowName: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 6, backgroundColor: C.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.pill },
  amountText: { fontSize: 12, fontWeight: '700', color: C.primaryDark, fontVariant: ['tabular-nums'] },
  minus: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  adjust: { flexDirection: 'row', gap: 8 },
  adjBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceAlt, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  adjBtnOn: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
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
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, height: 48, paddingHorizontal: 20, borderRadius: R.md },
  doneText: { color: C.white, fontSize: 15, fontWeight: '700' },
  restArt: { width: 96, height: 96, borderRadius: 32, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
