import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Dialog, EmptyState, Header, IconButton, Ring, Screen, SectionTitle, T, tap, useToast, type IconName } from '@/components/ui';
import { workoutById, type Workout } from '@/data/fitness';
import { pad, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, R, shadow } from '@/theme';

type Phase = 'overview' | 'player' | 'done';
type Run = { idx: number; left: number; elapsed: number; prep: number; finished: boolean };
type Result = { completed: boolean; kcal: number; minutes: number; done: number };

const PREP = 3; // real seconds of "get ready"
const SPEEDS = [1, 5, 10];
const clock = (s: number, up = false) => {
  const t = Math.max(0, up ? Math.floor(s) : Math.ceil(s));
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
};
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/fitness'));
const freshRun = (w: Workout): Run => ({ idx: 0, left: w.exercises[0].seconds, elapsed: 0, prep: PREP, finished: false });

/** Advance the player by `real` wall-clock seconds at the given demo speed. */
function advance(r: Run, real: number, speed: number, w: Workout): Run {
  if (r.finished) return r;
  if (r.prep > 0) return { ...r, prep: Math.max(0, r.prep - real) };
  const dt = real * speed;
  if (r.left - dt > 0) return { ...r, left: r.left - dt, elapsed: r.elapsed + dt };
  const elapsed = r.elapsed + r.left;
  if (r.idx + 1 < w.exercises.length) return { ...r, idx: r.idx + 1, left: w.exercises[r.idx + 1].seconds, elapsed };
  return { ...r, left: 0, elapsed, finished: true };
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = workoutById(String(id ?? ''));
  if (!w)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState emoji="🤷" title="Workout not found" text="This workout may have been removed or the link is incorrect." action="Back to Fitness" onAction={goBack} />
      </Screen>
    );
  return <WorkoutFlow w={w} />;
}

function WorkoutFlow({ w }: { w: Workout }) {
  const { state, logWorkout } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const n = w.exercises.length;
  const total = w.exercises.reduce((a, e) => a + e.seconds, 0);

  const [phase, setPhase] = useState<Phase>('overview');
  const [run, setRun] = useState<Run>(() => freshRun(w));
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [askEnd, setAskEnd] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const wasPaused = useRef(false);
  const pop = useRef(new Animated.Value(0)).current;

  const timesDone = state.workouts.filter((x) => x.workoutId === w.id).length;
  const cur = w.exercises[run.idx];
  const doneSec = w.exercises.slice(0, run.idx).reduce((a, e) => a + e.seconds, 0) + (cur.seconds - run.left);
  const frac = Math.min(1, doneSec / total);
  const liveKcal = Math.round(w.kcal * frac);

  // Ticker — delta-time based so throttled web tabs stay accurate.
  useEffect(() => {
    if (phase !== 'player' || paused) return;
    let last = Date.now();
    const h = setInterval(() => {
      const now = Date.now();
      const real = (now - last) / 1000;
      last = now;
      setRun((r) => advance(r, real, speed, w));
    }, 100);
    return () => clearInterval(h);
  }, [phase, paused, speed, w]);

  // Haptic tick when a new exercise starts
  useEffect(() => {
    if (phase === 'player' && run.idx > 0) tap();
  }, [run.idx, phase]);

  const finish = (completed: boolean) => {
    const f = completed ? 1 : frac;
    setResult({
      completed,
      kcal: completed ? w.kcal : Math.max(1, Math.round(w.kcal * f)),
      minutes: completed ? w.minutes : Math.max(1, Math.round(w.minutes * f)),
      done: completed ? n : run.idx,
    });
    setPhase('done');
  };

  // Celebration pop once the completion view is mounted
  useEffect(() => {
    if (phase !== 'done') return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [phase, pop]);

  useEffect(() => {
    if (run.finished && phase === 'player') finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.finished]);

  const start = () => {
    setRun(freshRun(w));
    setPaused(false);
    setResult(null);
    setPhase('player');
  };

  const requestEnd = () => {
    wasPaused.current = paused;
    setPaused(true);
    setAskEnd(true);
  };

  // Android hardware back during the player asks before quitting.
  useEffect(() => {
    if (phase !== 'player') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestEnd();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);

  const skip = () =>
    setRun((r) => {
      if (r.prep > 0) return { ...r, prep: 0 };
      if (r.idx + 1 < n) return { ...r, idx: r.idx + 1, left: w.exercises[r.idx + 1].seconds };
      return { ...r, left: 0, finished: true };
    });

  const save = () => {
    if (!result) return;
    logWorkout({ workoutId: w.id, title: w.title, emoji: w.emoji, minutes: result.minutes, kcal: result.kcal, date: todayKey() });
    toast(`Saved to activity log · ${result.kcal} kcal burned`, 'flame');
    goBack();
  };

  const tooEarly = run.elapsed < 20;

  /* ---------- Completion ---------- */
  if (phase === 'done' && result) {
    const rotis = Math.round(result.kcal / 75);
    return (
      <Screen edges={['top', 'bottom']}>
        <Stack.Screen options={{ gestureEnabled: true }} />
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={st.doneWrap}>
          <Animated.Text style={[st.doneEmoji, { transform: [{ scale: pop }] }]}>{result.completed ? '🎉' : '👏'}</Animated.Text>
          <Text style={[T.h1, { textAlign: 'center' }]}>{result.completed ? 'Workout complete!' : 'Good effort!'}</Text>
          <Text style={[T.body, { textAlign: 'center', marginTop: 6 }]}>
            {w.emoji} {w.title} · {result.completed ? 'all exercises done' : 'ended early'}
          </Text>
          <View style={st.doneStats}>
            <DoneStat emoji="🔥" value={String(result.kcal)} label="kcal burned" />
            <DoneStat emoji="⏱️" value={String(result.minutes)} label="minutes" />
            <DoneStat emoji="✅" value={`${result.done}/${n}`} label="exercises" />
          </View>
          {rotis >= 1 && (
            <View style={st.fact}>
              <Text style={{ fontSize: 22 }}>🫓</Text>
              <Text style={[T.small, { flex: 1, color: C.text }]}>
                That&apos;s roughly <Text style={{ fontWeight: '800' }}>{rotis === 1 ? '1 roti' : `${rotis} rotis`}</Text> worth of energy. {result.completed ? 'Fantastic work!' : 'Every minute counts!'}
              </Text>
            </View>
          )}
          <Button title="Save to activity log" icon="checkmark-circle" onPress={save} style={{ marginTop: 28, alignSelf: 'stretch' }} />
          <Button title="Do it again" icon="refresh" variant="outline" onPress={start} style={{ marginTop: 10, alignSelf: 'stretch' }} />
          <Button title="Close without saving" variant="ghost" onPress={goBack} style={{ marginTop: 4, alignSelf: 'stretch' }} />
        </ScrollView>
      </Screen>
    );
  }

  /* ---------- Player ---------- */
  if (phase === 'player') {
    const prepping = run.prep > 0;
    const next = prepping ? w.exercises[0] : w.exercises[run.idx + 1];
    return (
      <LinearGradient colors={[w.color, C.navy]} start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }} style={[st.player, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <StatusBar style="light" />
        <View style={st.pTop}>
          <IconButton icon="close" color={C.white} bg="rgba(255,255,255,0.18)" onPress={requestEnd} />
          <Text style={st.pTopTitle}>{prepping ? w.title : `Exercise ${run.idx + 1} of ${n}`}</Text>
          <Pressable
            hitSlop={8}
            onPress={() => {
              tap();
              setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);
            }}
            style={st.speed}>
            <Ionicons name="speedometer-outline" size={13} color={C.white} />
            <Text style={st.speedText}>{speed}×</Text>
          </Pressable>
        </View>

        <View style={st.segs}>
          {w.exercises.map((e, i) => (
            <View key={i} style={st.seg}>
              <View style={[st.segFill, { width: `${i < run.idx ? 100 : i === run.idx ? ((e.seconds - run.left) / e.seconds) * 100 : 0}%` }]} />
            </View>
          ))}
        </View>
        <Text style={st.pctText}>{Math.round(frac * 100)}% complete</Text>

        <View style={st.pMid}>
          {prepping ? (
            <>
              <Text style={st.kicker}>GET READY</Text>
              <Text style={st.prepNum}>{Math.ceil(run.prep)}</Text>
              <Text style={st.pDetail}>
                {n} exercises · {w.minutes} min · {w.kcal} kcal
              </Text>
            </>
          ) : (
            <>
              <Text style={st.pName} numberOfLines={2}>
                {cur.name}
              </Text>
              <Text style={st.pDetail}>{cur.detail}</Text>
              <View style={{ marginTop: 22 }}>
                <Ring size={220} stroke={14} value={(cur.seconds - run.left) / cur.seconds} color={C.white} track="rgba(255,255,255,0.18)">
                  <Text style={st.timer}>{clock(run.left)}</Text>
                  <Text style={st.timerLabel}>{paused ? 'PAUSED' : 'REMAINING'}</Text>
                </Ring>
              </View>
            </>
          )}
          <View style={st.pStats}>
            <PStat icon="time-outline" value={clock(run.elapsed, true)} label="Elapsed" />
            <PStat icon="flame-outline" value={String(liveKcal)} label="kcal" />
            <PStat icon="list-outline" value={`${run.idx}/${n}`} label="Done" />
          </View>
        </View>

        <View style={st.next}>
          <Text style={st.nextKicker}>{prepping ? 'FIRST UP' : next ? 'UP NEXT' : 'LAST ONE'}</Text>
          <Text style={st.nextName} numberOfLines={1}>
            {next ? `${next.name} · ${next.detail}` : 'Finish strong — you’ve got this! 💪'}
          </Text>
        </View>

        <View style={st.controls}>
          <Ctrl icon="stop" label="End" onPress={requestEnd} />
          <Pressable
            onPress={() => {
              tap();
              setPaused((p) => !p);
            }}
            style={({ pressed }) => [st.playBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
            <Ionicons name={paused ? 'play' : 'pause'} size={34} color={w.color} style={paused ? { marginLeft: 4 } : undefined} />
          </Pressable>
          <Ctrl icon="play-skip-forward" label={next || prepping ? 'Skip' : 'Finish'} onPress={skip} />
        </View>

        <Dialog
          visible={askEnd}
          icon={tooEarly ? '🛑' : '⏸️'}
          title="End workout early?"
          text={
            tooEarly
              ? 'You’ve only just started, so nothing will be saved.'
              : `You’ve done ${clock(run.elapsed, true)} and burned about ${liveKcal} kcal. We’ll show your summary so you can save it.`
          }
          confirm="End workout"
          cancel="Keep going"
          danger
          onCancel={() => {
            setAskEnd(false);
            setPaused(wasPaused.current);
          }}
          onConfirm={() => {
            setAskEnd(false);
            if (tooEarly) {
              setPhase('overview');
              toast('Workout ended', 'stop-circle');
            } else finish(false);
          }}
        />
      </LinearGradient>
    );
  }

  /* ---------- Overview ---------- */
  const coachText = /\s\w\.$/.test(w.coach) ? `with ${w.coach}` : w.coach;
  const meta: [IconName, string][] = [
    ['time-outline', `${w.minutes} min`],
    ['flame-outline', `${w.kcal} kcal`],
    ['speedometer-outline', w.level],
    ['barbell-outline', w.equipment],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[w.color, w.color + 'C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { paddingTop: insets.top + 8 }]}>
          <View style={st.heroTop}>
            <IconButton icon="arrow-back" color={C.white} bg="rgba(255,255,255,0.2)" onPress={goBack} />
            <View style={st.catPill}>
              <Text style={st.catText}>{w.category.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={st.heroEmoji}>{w.emoji}</Text>
          <Text style={st.heroTitle}>{w.title}</Text>
          <Text style={st.heroCoach}>{coachText}</Text>
          <View style={st.metaRow}>
            {meta.map(([icon, text]) => (
              <View key={text} style={st.metaPill}>
                <Ionicons name={icon} size={13} color={C.white} />
                <Text style={st.metaText}>{text}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -18 }}>
          <Card>
            <Text style={T.h3}>About this workout</Text>
            <Text style={[T.body, { marginTop: 6 }]}>{w.description}</Text>
            {timesDone > 0 && (
              <View style={st.doneBefore}>
                <Ionicons name="trophy" size={14} color={C.primaryDark} />
                <Text style={st.doneBeforeText}>
                  You&apos;ve completed this {timesDone === 1 ? 'once' : `${timesDone} times`} — nice consistency!
                </Text>
              </View>
            )}
          </Card>

          <SectionTitle title={`Exercises · ${n}`} />
          <Card style={{ paddingVertical: 4 }}>
            {w.exercises.map((e, i) => (
              <View key={i} style={[st.exRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.borderSoft }]}>
                <View style={[st.exNum, { backgroundColor: w.color + '1F' }]}>
                  <Text style={[st.exNumText, { color: w.color }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.exName}>{e.name}</Text>
                  <Text style={T.small}>{e.detail}</Text>
                </View>
                <Text style={st.exTime}>{clock(e.seconds)}</Text>
              </View>
            ))}
          </Card>
          <View style={st.tip}>
            <Text style={{ fontSize: 18 }}>💡</Text>
            <Text style={[T.small, { flex: 1 }]}>Keep water nearby and stop if you feel dizzy or any sharp pain. Demo runs at 5× speed — tap the speed badge to change it.</Text>
          </View>
        </View>
      </ScrollView>
      <View style={[st.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title="Start workout" icon="play" onPress={start} style={{ backgroundColor: w.color, borderColor: w.color }} />
      </View>
    </View>
  );
}

function DoneStat({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={st.doneStat}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={st.doneStatValue}>{value}</Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

function PStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Ionicons name={icon} size={15} color="rgba(255,255,255,0.75)" />
        <Text style={st.pStatValue}>{value}</Text>
      </View>
      <Text style={st.pStatLabel}>{label}</Text>
    </View>
  );
}

function Ctrl({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ alignItems: 'center', gap: 6, width: 72 }, pressed && { opacity: 0.6 }]}>
      <View style={st.ctrl}>
        <Ionicons name={icon} size={22} color={C.white} />
      </View>
      <Text style={st.ctrlLabel}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 38, alignItems: 'center' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  catPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  catText: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  heroEmoji: { fontSize: 76, marginTop: 6 },
  heroTitle: { color: C.white, fontSize: 27, fontWeight: '800', textAlign: 'center', marginTop: 8, letterSpacing: -0.5 },
  heroCoach: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill },
  metaText: { color: C.white, fontSize: 12, fontWeight: '700' },
  doneBefore: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primarySoft, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  doneBeforeText: { fontSize: 12, fontWeight: '700', color: C.primaryDark, flex: 1 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  exNum: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 14, fontWeight: '800' },
  exName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  exTime: { fontSize: 13, fontWeight: '700', color: C.textSoft, fontVariant: ['tabular-nums'] },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginTop: 14, borderWidth: 1, borderColor: C.borderSoft },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.borderSoft, ...shadow },

  player: { flex: 1, paddingHorizontal: 20 },
  pTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pTopTitle: { color: C.white, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  speed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, height: 32, borderRadius: R.pill, minWidth: 40, justifyContent: 'center' },
  speedText: { color: C.white, fontSize: 13, fontWeight: '800' },
  segs: { flexDirection: 'row', gap: 4, marginTop: 16 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  segFill: { height: '100%', backgroundColor: C.white, borderRadius: 3 },
  pctText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', marginTop: 8 },
  pMid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  prepNum: { color: C.white, fontSize: 120, fontWeight: '800', lineHeight: 140 },
  pName: { color: C.white, fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  pDetail: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  timer: { color: C.white, fontSize: 50, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  pStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 28 },
  pStatValue: { color: C.white, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  next: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: R.md, paddingHorizontal: 16, paddingVertical: 12 },
  nextKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  nextName: { color: C.white, fontSize: 15, fontWeight: '700', marginTop: 3 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 20 },
  ctrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },

  doneWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneEmoji: { fontSize: 84, marginBottom: 10 },
  doneStats: { flexDirection: 'row', gap: 10, marginTop: 26, alignSelf: 'stretch' },
  doneStat: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 16, alignItems: 'center', gap: 4, ...shadow },
  doneStatValue: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 2 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primarySoft, borderRadius: R.md, padding: 14, marginTop: 16, alignSelf: 'stretch' },
});
