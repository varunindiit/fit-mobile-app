import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseArt } from '@/components/program/ExerciseArt';
import { ExerciseSheet } from '@/components/program/ExerciseSheet';
import { GradientButton, PRIMARY_COLORS } from '@/components/program/GradientButton';
import { editedPlans, findSession, itemLabel, planItems, programFlags, resumePoints, sessionMeta } from '@/components/program/session';
import { WorkoutSettingsSheet } from '@/components/program/WorkoutSettingsSheet';
import { Button, Card, EmptyState, Header, ListRow, Screen, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { exerciseById, sessionStats, type Session, type SessionItem } from '@/data/program';
import { useStore } from '@/lib/store';
import { C, R, shadow } from '@/theme';

const ND = Platform.OS !== 'web';
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/fitness'));
const REST_TIPS = [
  { e: '💧', t: 'Drink 8+ glasses of water to help your muscles recover.' },
  { e: '🚶', t: 'Go for a light 20-minute walk to keep blood flowing.' },
  { e: '🧘', t: 'Do some gentle stretching or yoga for 10 minutes.' },
  { e: '🥗', t: 'Eat enough protein — it rebuilds the muscle you trained.' },
  { e: '😴', t: 'Aim for 7–9 hours of sleep tonight.' },
];

export default function ProgramDayScreen() {
  const { key } = useLocalSearchParams<{ key?: string }>();
  const session = useMemo(() => findSession(String(key ?? '')), [key]);
  if (!session)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState emoji="🤷" title="Workout not found" text="This plan day doesn't exist or the link is incorrect." action="Go back" onAction={goBack} />
      </Screen>
    );
  return <DayPlan key={session.key} session={session} />;
}

function DayPlan({ session }: { session: Session }) {
  const { state, completeSession } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const meta = sessionMeta(session);
  const HERO = insets.top + 210;

  const [items, setItems] = useState<SessionItem[]>(() => planItems(session));
  const [editing, setEditing] = useState(false);
  const [tip, setTip] = useState(() => !programFlags.tipShown && !session.restDay);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(false);
  const [resumeAt, setResumeAt] = useState(0);
  const [solid, setSolid] = useState(false);
  const solidRef = useRef(false);
  const y = useRef(new Animated.Value(0)).current;
  const tipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!tip) return;
    programFlags.tipShown = true;
    Animated.spring(tipAnim, { toValue: 1, delay: 450, friction: 6, useNativeDriver: ND }).start();
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
  const barOpacity = y.interpolate({ inputRange: [HERO - 140, HERO - 80], outputRange: [0, 1], extrapolate: 'clamp' });

  const dismissTip = () => {
    Animated.timing(tipAnim, { toValue: 0, duration: 160, useNativeDriver: ND }).start(() => setTip(false));
  };
  const toggleEdit = () => {
    if (tip) dismissTip();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing((e) => !e);
  };
  const finishEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(false);
    if (edited) toast('Workout plan updated', 'create');
  };
  const remove = (i: number) => {
    if (items.length <= 1) return toast('Keep at least one exercise', 'alert-circle');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    <View style={{ flex: 1, backgroundColor: C.card }}>
      <StatusBar style={solid ? 'dark' : 'light'} />
      <View style={[s.overscroll, { height: HERO, backgroundColor: session.colors[0] }]} />
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
          useNativeDriver: ND,
          listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const v = e.nativeEvent.contentOffset.y > HERO - 110;
            if (v !== solidRef.current) {
              solidRef.current = v;
              setSolid(v);
            }
          },
        })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}>
        <LinearGradient colors={session.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, { height: HERO, paddingTop: insets.top + 58 }]}>
          <View style={[s.blob, { width: 220, height: 220, top: -60, right: -50 }]} />
          <View style={[s.blob, { width: 120, height: 120, bottom: 10, left: -40 }]} />
          <View style={{ flex: 1, paddingRight: 112 }}>
            <Text style={s.eyebrow} numberOfLines={1}>
              {meta.eyebrow.toUpperCase()}
            </Text>
            <Text style={[s.heroTitle, session.title.length > 12 && { fontSize: 26 }]} numberOfLines={2}>
              {session.title}
            </Text>
            <View style={s.levelRow}>
              <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3].map((n) => (
                  <Ionicons key={n} name="flash" size={16} color={n <= meta.bolts ? C.gold : 'rgba(255,255,255,0.35)'} />
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
          <Text style={[s.heroEmoji, { top: insets.top + 56 }]}>{session.emoji}</Text>
        </LinearGradient>

        <View style={s.body}>
          {session.restDay ? (
            <RestDay done={completed} />
          ) : (
            <>
              <View style={s.stats}>
                <Stat value={`${stats.exercises}`} label="Exercises" />
                <View style={s.statDiv} />
                <Stat value={`${stats.minutes}`} unit=" min" label="Time" />
                <View style={s.statDiv} />
                <Stat value={`${stats.kcal}`} unit=" kcal(≈)" label="Calories" />
              </View>

              <View style={s.settingsCard}>
                <ListRow icon="options" iconBg={C.accentSoft} iconColor={C.accent} title="Workout Settings" subtitle="Music & Coach & Timer, etc." onPress={() => setSettings(true)} />
              </View>

              <View style={s.exHead}>
                <Text style={s.exTitle}>
                  Exercise <Text style={{ color: C.muted, fontWeight: '700' }}>({items.length})</Text>
                </Text>
                {editing && edited && (
                  <Pressable hitSlop={10} onPress={resetPlan} style={{ marginRight: 12 }}>
                    <Text style={{ color: C.primary, fontWeight: '800' }}>Reset</Text>
                  </Pressable>
                )}
                <Pressable onPress={toggleEdit} hitSlop={8} style={[s.pencil, editing && { backgroundColor: C.primary }]}>
                  <Ionicons name={editing ? 'checkmark' : 'pencil'} size={18} color={editing ? C.white : C.text} />
                </Pressable>
                {tip && (
                  <Animated.View style={[s.tip, { opacity: tipAnim, transform: [{ scale: tipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
                    <View style={s.tipArrow} />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={s.coach}>
                        <Text style={{ fontSize: 26 }}>🧔</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.tipTitle}>Don't like some exercises?</Text>
                        <Text style={s.tipText}>Tap here to customize your workout plan just the way you like it!</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        tap();
                        dismissTip();
                      }}
                      style={({ pressed }) => [s.gotIt, pressed && { opacity: 0.85 }]}>
                      <Text style={s.gotItText}>GOT IT</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>

              {items.map((it, i) => {
                const ex = exerciseById(it.exerciseId);
                return (
                  <Pressable
                    key={`${it.exerciseId}-${i}`}
                    onPress={() => {
                      tap();
                      setSheetIdx(i);
                    }}
                    style={({ pressed }) => [s.row, i > 0 && s.rowBorder, pressed && { opacity: 0.7 }]}>
                    {editing && (
                      <Pressable hitSlop={8} onPress={() => remove(i)} style={s.minus}>
                        <Ionicons name="remove" size={16} color={C.white} />
                      </Pressable>
                    )}
                    <ExerciseArt emoji={ex.emoji} size={editing ? 58 : 68} radius={14} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName} numberOfLines={2}>
                        {ex.name.toUpperCase()}
                      </Text>
                      <Text style={s.rowSub}>{itemLabel(it)}</Text>
                    </View>
                    {editing ? (
                      <View style={s.adjust}>
                        <Pressable hitSlop={6} onPress={() => (tap(), adjust(i, -1))} style={s.adjBtn}>
                          <Ionicons name="remove" size={16} color={C.text} />
                        </Pressable>
                        <Pressable hitSlop={6} onPress={() => (tap(), adjust(i, 1))} style={[s.adjBtn, { backgroundColor: C.primary }]}>
                          <Ionicons name="add" size={16} color={C.white} />
                        </Pressable>
                      </View>
                    ) : (
                      <Ionicons name="information-circle-outline" size={20} color={C.muted} />
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Top bar: fades from transparent-over-hero to solid white on scroll */}
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, s.topBarBg, { opacity: barOpacity }]} pointerEvents="none" />
        <TopIcon icon="arrow-back" fade={barOpacity} onPress={goBack} />
        <Animated.Text style={[s.topTitle, { opacity: barOpacity }]} numberOfLines={1}>
          {session.title}
        </Animated.Text>
        <TopIcon icon="ellipsis-vertical" fade={barOpacity} onPress={() => setMore(true)} />
      </View>

      {/* Sticky bottom CTA */}
      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {session.restDay ? (
          completed ? (
            <Button title="Rest day completed ✓" variant="secondary" onPress={goBack} style={{ borderRadius: R.pill }} />
          ) : (
            <GradientButton title="Mark rest day as done" icon="moon" colors={PRIMARY_COLORS} onPress={markRest} />
          )
        ) : editing ? (
          <View style={s.adjustPill}>
            <View style={{ flex: 1 }}>
              <Text style={s.adjustTitle}>Adjust</Text>
              <Text style={s.adjustHint}>Remove or change reps & time</Text>
            </View>
            <Pressable
              onPress={() => {
                tap();
                finishEdit();
              }}
              style={({ pressed }) => [s.doneBtn, pressed && { opacity: 0.85 }]}>
              <Ionicons name="checkmark" size={18} color={C.white} />
              <Text style={s.doneText}>Done</Text>
            </Pressable>
          </View>
        ) : resumeAt > 0 ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => {
                tap();
                start(false);
              }}
              style={({ pressed }) => [s.restart, pressed && { opacity: 0.8 }]}>
              <Text style={s.restartText}>RESTART</Text>
            </Pressable>
            <GradientButton title={`CONTINUE · ${Math.round((resumeAt / items.length) * 100)}% completed`} onPress={() => start(true)} style={{ flex: 1 }} />
          </View>
        ) : (
          <GradientButton title={completed ? 'START AGAIN' : 'START'} onPress={() => start(false)} />
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

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.statVal} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit && <Text style={s.statUnit}>{unit}</Text>}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function TopIcon({ icon, fade, onPress }: { icon: IconName; fade: Animated.AnimatedInterpolation<number>; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s.topIcon, pressed && { opacity: 0.6 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, s.topIconLight, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Ionicons name={icon} size={22} color={C.white} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, s.topIconCenter, { opacity: fade }]}>
        <Ionicons name={icon} size={22} color={C.text} />
      </Animated.View>
    </Pressable>
  );
}

function RestDay({ done }: { done: boolean }) {
  return (
    <View style={{ paddingTop: 8 }}>
      <View style={{ alignItems: 'center', paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 72 }}>😴</Text>
        <Text style={[T.h2, { textAlign: 'center', marginTop: 6 }]}>Recovery is part of training</Text>
        <Text style={[T.body, { textAlign: 'center', marginTop: 8 }]}>
          {done ? "You've already logged this rest day. Great discipline — your muscles thank you!" : 'Muscles grow and repair while you rest. Take it easy today — you have earned it.'}
        </Text>
      </View>
      <Card style={{ marginTop: 20, gap: 14 }}>
        <Text style={T.label}>Rest-day tips</Text>
        {REST_TIPS.map((t) => (
          <View key={t.e} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={s.tipEmoji}>
              <Text style={{ fontSize: 18 }}>{t.e}</Text>
            </View>
            <Text style={[T.body, { flex: 1 }]}>{t.t}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 22, overflow: 'hidden' },
  overscroll: { position: 'absolute', top: 0, left: 0, right: 0 },
  blob: { position: 'absolute', borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.1)' },
  eyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: C.white, fontSize: 36, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  levelText: { color: C.white, fontSize: 14, fontWeight: '700' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  doneBadgeText: { color: C.white, fontSize: 12, fontWeight: '800' },
  heroEmoji: { position: 'absolute', right: 20, fontSize: 92 },
  body: { marginTop: -30, backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 22 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  statDiv: { width: 1, height: 30, backgroundColor: C.border },
  statVal: { fontSize: 22, fontWeight: '900', color: C.text },
  statUnit: { fontSize: 13, fontWeight: '700', color: C.textSoft },
  statLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  settingsCard: { marginTop: 16, backgroundColor: C.bg, borderRadius: R.lg, paddingHorizontal: 12 },
  exHead: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 6, zIndex: 20 },
  exTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: C.text },
  pencil: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  tip: { position: 'absolute', top: 50, right: -4, width: 290, backgroundColor: C.card, borderRadius: 18, padding: 16, ...shadow, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  tipArrow: { position: 'absolute', top: -7, right: 16, width: 16, height: 16, backgroundColor: C.card, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  coach: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  tipText: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 3 },
  gotIt: { marginTop: 14, height: 40, borderRadius: R.pill, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  gotItText: { color: C.white, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.borderSoft },
  rowName: { fontSize: 15, fontWeight: '900', color: C.text, letterSpacing: 0.2 },
  rowSub: { fontSize: 14, color: C.textSoft, fontWeight: '600', marginTop: 4 },
  minus: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  adjust: { flexDirection: 'row', gap: 8 },
  adjBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.borderSoft, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  topBarBg: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: C.text },
  topIcon: { width: 40, height: 40 },
  topIconLight: { alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.16)' },
  topIconCenter: { alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft },
  restart: { height: 56, paddingHorizontal: 20, borderRadius: R.pill, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  restartText: { fontSize: 15, fontWeight: '900', color: C.text, letterSpacing: 0.8 },
  adjustPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.navy, borderRadius: R.pill, paddingLeft: 22, paddingRight: 6, height: 60, ...shadow },
  adjustTitle: { color: C.white, fontSize: 16, fontWeight: '800' },
  adjustHint: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, height: 48, paddingHorizontal: 20, borderRadius: R.pill },
  doneText: { color: C.white, fontSize: 15, fontWeight: '800' },
  tipEmoji: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
