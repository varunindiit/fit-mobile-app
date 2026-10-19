import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { LockedScreen } from '@/components/premium/locked';
import { Button, Card, Dialog, EmptyState, enter, Header, nativeOnly, IconButton, IconTile, PressableScale, Ring, Screen, SectionTitle, T, tap, useToast, type IconName } from '@/components/ui';
import { workoutById, type Workout } from '@/data/fitness';
import { pad } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C, MOTION, R, shadow, shadowSm } from '@/theme';
import { Glyph } from '@/components/Glyph';
import { WORKOUT_ART, WORKOUT_HERO } from '@/components/glyphs';

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
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const w = workoutById(String(id ?? ''));
  const access = useAccess();
  if (!w)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState icon="barbell-outline" title="Workout not found" text="This workout may have been removed or the link is incorrect." action="Back to Fitness" onAction={goBack} />
      </Screen>
    );
  // Plan gate: beyond the Free beginner classes, the class sells the upgrade instead of opening.
  const lock = access.lockClass(w.level);
  if (lock) return <LockedScreen lock={lock} eyebrow={`${w.category} class`} onBack={goBack} />;
  return <WorkoutFlow w={w} />;
}

function WorkoutFlow({ w }: { w: Workout }) {
  const { state, logWorkout, removeWorkout, saveClassRun, updateSettings } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const n = w.exercises.length;
  const total = w.exercises.reduce((a, e) => a + e.seconds, 0);

  const [phase, setPhase] = useState<Phase>('overview');
  const [run, setRun] = useState<Run>(() => freshRun(w));
  const [paused, setPaused] = useState(false);
  const speed = SPEEDS.includes(state.settings.classSpeed) ? state.settings.classSpeed : 5;
  const [askEnd, setAskEnd] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const wasPaused = useRef(false);
  const loggedId = useRef<string | null>(null);
  const finishing = useRef(false);

  const saved = state.classRun?.workoutId === w.id && state.classRun.idx >= 0 && state.classRun.idx < n ? state.classRun : null;
  const timesDone = state.workouts.filter((x) => x.workoutId === w.id).length;
  const cur = w.exercises[run.idx];
  const doneSec = w.exercises.slice(0, run.idx).reduce((a, e) => a + e.seconds, 0) + (cur.seconds - run.left);
  const frac = Math.min(1, doneSec / total);
  const liveKcal = Math.round(w.kcal * Math.min(1, run.elapsed / total)); // skipped time earns nothing

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

  // Keep the in-progress run so the class can be continued after leaving or an app kill.
  useEffect(() => {
    if (phase !== 'player' || finishing.current) return;
    saveClassRun({ workoutId: w.id, idx: run.idx, left: run.left, elapsed: run.elapsed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, run.idx, paused]);

  // Pause when the app leaves the foreground (the pause also saves the run).
  useEffect(() => {
    if (phase !== 'player') return;
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && setPaused(true));
    return () => sub.remove();
  }, [phase]);

  /** Credit is proportional to time actually exercised (`elapsed`), so skipping ahead never earns full credit. */
  const finish = (reachedEnd: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    saveClassRun(null);
    const f = Math.min(1, run.elapsed / total);
    const completed = reachedEnd && run.elapsed >= total - 0.5;
    if (run.elapsed < 20) {
      setPhase('overview');
      toast('Too short to log — nothing was saved', 'stop-circle');
      return;
    }
    const r: Result = {
      completed,
      kcal: completed ? w.kcal : Math.max(1, Math.round(w.kcal * f)),
      minutes: completed ? w.minutes : Math.max(1, Math.round(w.minutes * f)),
      done: reachedEnd ? n : run.idx,
    };
    loggedId.current = logWorkout({ workoutId: w.id, title: w.title, emoji: w.emoji, minutes: r.minutes, kcal: r.kcal });
    setResult(r);
    setPhase('done');
  };

  // Hand off to the completion view once the last exercise runs out (deferred a tick, outside the effect body).
  useEffect(() => {
    if (!(run.finished && phase === 'player')) return;
    const t = setTimeout(() => finish(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.finished]);

  const start = (from?: Run) => {
    finishing.current = false;
    loggedId.current = null;
    setRun(from ?? freshRun(w));
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

  // Skipped time never counts toward `elapsed` (and so never toward credit).
  const skip = () =>
    setRun((r) => {
      if (r.prep > 0) return { ...r, prep: 0 };
      if (r.idx + 1 < n) return { ...r, idx: r.idx + 1, left: w.exercises[r.idx + 1].seconds };
      return { ...r, left: 0, finished: true };
    });

  const save = () => {
    if (!result) return;
    toast(`Saved to activity log · ${result.kcal} kcal burned`, 'flame');
    goBack();
  };
  const discard = () => {
    if (loggedId.current) removeWorkout(loggedId.current);
    loggedId.current = null;
    toast('Workout discarded', 'trash');
    goBack();
  };
  const resumeRun = () => {
    if (!saved) return;
    const ex = w.exercises[saved.idx];
    const left = Number.isFinite(saved.left) && saved.left > 0 && saved.left <= ex.seconds ? saved.left : ex.seconds;
    start({ idx: saved.idx, left, elapsed: Number.isFinite(saved.elapsed) ? Math.max(0, saved.elapsed) : 0, prep: PREP, finished: false });
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
          <Animated.View entering={nativeOnly(ZoomIn.springify().damping(11).stiffness(160))} style={st.doneDisc}>
            <Glyph emoji={result.completed ? '🎉' : '👏'} size={78} color={C.primaryDark} />
          </Animated.View>
          <Animated.View entering={enter(1)} style={{ alignItems: 'center' }}>
            <Text style={[T.h1, { textAlign: 'center' }]}>{result.completed ? 'Workout complete!' : 'Good effort!'}</Text>
            <Text style={[T.body, { textAlign: 'center', marginTop: 6 }]}>
              {w.title} · {result.completed ? 'all exercises done' : 'ended early'}
            </Text>
          </Animated.View>
          <Animated.View entering={enter(2)} style={st.doneStats}>
            <DoneStat icon="flame" color={C.accent} bg={C.accentSoft} value={String(result.kcal)} label="kcal burned" />
            <DoneStat icon="time" color={C.water} bg={C.waterSoft} value={String(result.minutes)} label="minutes" />
            <DoneStat icon="checkmark-done" color={C.primaryDark} bg={C.primarySoft} value={`${result.done}/${n}`} label="exercises" />
          </Animated.View>
          {rotis >= 1 && (
            <Animated.View entering={enter(3)} style={st.fact}>
              <View style={st.factTile}>
                <Glyph emoji="🫓" size={30} />
              </View>
              <Text style={[T.small, { flex: 1, color: C.text }]}>
                That&apos;s roughly <Text style={{ fontWeight: '800' }}>{rotis === 1 ? '1 roti' : `${rotis} rotis`}</Text> worth of energy. {result.completed ? 'Fantastic work!' : 'Every minute counts!'}
              </Text>
            </Animated.View>
          )}
          <Animated.View entering={enter(4)} style={{ alignSelf: 'stretch' }}>
            <Button title="Done" icon="checkmark-circle" onPress={save} style={{ marginTop: 28 }} />
            <Button title="Do it again" icon="refresh" variant="outline" onPress={() => start()} style={{ marginTop: 10 }} />
            <Button title="Discard this workout" variant="ghost" onPress={discard} style={{ marginTop: 4 }} />
          </Animated.View>
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
          <IconButton icon="close" color={C.white} bg="rgba(255,255,255,0.16)" onPress={requestEnd} />
          <Text style={st.pTopTitle} numberOfLines={1}>
            {prepping ? w.title : `Exercise ${run.idx + 1} of ${n}`}
          </Text>
          <PressableScale
            hitSlop={8}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={`Demo speed ${speed}x`}
            onPress={() => {
              tap();
              updateSettings({ classSpeed: SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] });
            }}
            style={st.speed}>
            <Ionicons name="speedometer-outline" size={13} color={C.white} />
            <Text style={st.speedText}>{speed}×</Text>
          </PressableScale>
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
              <Animated.Text key={Math.ceil(run.prep)} entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={st.prepNum}>
                {Math.ceil(run.prep)}
              </Animated.Text>
              <Text style={st.pDetail}>
                {n} exercises · {w.minutes} min · {w.kcal} kcal
              </Text>
            </>
          ) : (
            <Animated.View key={run.idx} entering={nativeOnly(FadeIn.duration(MOTION.base))} style={{ alignItems: 'center' }}>
              <Text style={st.pName} numberOfLines={2}>
                {cur.name}
              </Text>
              <Text style={st.pDetail}>{cur.detail}</Text>
              <View style={st.ringWrap}>
                <Ring size={220} stroke={14} value={(cur.seconds - run.left) / cur.seconds} color={C.white} track="rgba(255,255,255,0.16)">
                  <Text style={st.timer}>{clock(run.left)}</Text>
                  <Text style={st.timerLabel}>{paused ? 'PAUSED' : 'REMAINING'}</Text>
                </Ring>
              </View>
            </Animated.View>
          )}
          <View style={st.pStats}>
            <PStat icon="time-outline" value={clock(run.elapsed, true)} label="Elapsed" />
            <View style={st.pStatDiv} />
            <PStat icon="flame-outline" value={String(liveKcal)} label="kcal" />
            <View style={st.pStatDiv} />
            <PStat icon="list-outline" value={`${run.idx}/${n}`} label="Done" />
          </View>
        </View>

        <View style={st.next}>
          <View style={st.nextIcon}>
            <Ionicons name={next || prepping ? 'arrow-forward' : 'flag'} size={16} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.nextKicker}>{prepping ? 'FIRST UP' : next ? 'UP NEXT' : 'LAST ONE'}</Text>
            <Text style={st.nextName} numberOfLines={1}>
              {next ? `${next.name} · ${next.detail}` : 'Finish strong — you’ve got this!'}
            </Text>
          </View>
        </View>

        <View style={st.controls}>
          <Ctrl icon="stop" label="End" onPress={requestEnd} />
          <PressableScale
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
            onPress={() => {
              tap();
              setPaused((p) => !p);
            }}
            style={st.playBtn}>
            <Ionicons name={paused ? 'play' : 'pause'} size={34} color={w.color} style={paused ? { marginLeft: 4 } : undefined} />
          </PressableScale>
          <Ctrl icon="play-skip-forward" label={next || prepping ? 'Skip' : 'Finish'} onPress={skip} />
        </View>

        <Dialog
          visible={askEnd}
          icon={tooEarly ? '🛑' : '⏸️'}
          title="End workout early?"
          text={
            tooEarly
              ? 'You’ve only just started, so nothing will be saved.'
              : `You’ve done ${clock(run.elapsed, true)} and burned about ${liveKcal} kcal. It will be saved to your activity log.`
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
              saveClassRun(null);
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
  const photo = WORKOUT_HERO[w.id];
  const meta: [IconName, string, string, string, string][] = [
    ['time', `${w.minutes} min`, 'Duration', C.water, C.waterSoft],
    ['flame', `${w.kcal} kcal`, 'Burn', C.accent, C.accentSoft],
    ['speedometer', w.level, 'Level', C.steps, C.stepsSoft],
    ['barbell', w.equipment, 'Equipment', C.workout, C.workoutSoft],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[w.color, w.color + 'C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { paddingTop: insets.top + 8 }]}>
          {photo ? (
            <>
              <Image source={photo} style={st.heroPhoto} contentFit="cover" transition={220} />
              {/* Scrim: keeps the back button and the white title legible over any photo. */}
              <LinearGradient pointerEvents="none" colors={['rgba(12,10,9,0.38)', 'rgba(12,10,9,0.08)', 'rgba(12,10,9,0.74)']} locations={[0, 0.4, 1]} style={st.heroPhoto} />
            </>
          ) : (
            <View pointerEvents="none" style={st.heroDeco}>
              <Svg width={320} height={320}>
                <Circle cx={160} cy={160} r={160} fill={C.white} opacity={0.08} />
                <Circle cx={160} cy={160} r={104} fill="none" stroke={C.white} strokeOpacity={0.16} strokeWidth={1.5} />
                <Circle cx={160} cy={160} r={50} fill={C.white} opacity={0.07} />
              </Svg>
            </View>
          )}
          <View style={st.heroTop}>
            <IconButton icon="arrow-back" color={C.white} bg="rgba(255,255,255,0.2)" onPress={goBack} />
            <View style={st.catPill}>
              <Text style={st.catText}>{w.category}</Text>
            </View>
          </View>
          {photo ? (
            <View style={st.heroPhotoGap} />
          ) : (
            <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.enter))} style={st.heroDisc}>
              <Glyph emoji={w.emoji} src={WORKOUT_ART[w.id]} size={WORKOUT_ART[w.id] ? 100 : 74} />
            </Animated.View>
          )}
          <Text style={st.heroTitle}>{w.title}</Text>
          <Text style={st.heroCoach}>{coachText}</Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, marginTop: -30 }}>
          <Animated.View entering={enter(0)}>
            <Card style={st.statsCard}>
              {meta.map(([icon, value, label, color, bg]) => (
                <View key={label} style={st.statCol}>
                  <IconTile icon={icon} color={color} bg={bg} size={36} />
                  <Text style={st.statVal} numberOfLines={2}>
                    {value}
                  </Text>
                  <Text style={T.tiny}>{label}</Text>
                </View>
              ))}
            </Card>
          </Animated.View>

          <Animated.View entering={enter(1)}>
            <Card style={{ marginTop: 12 }}>
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
          </Animated.View>

          <Animated.View entering={enter(2)}>
            <SectionTitle title={`Exercises · ${n}`} />
            <Card style={{ paddingVertical: 4 }}>
              {w.exercises.map((e, i) => (
                <View key={i}>
                  {i > 0 && <View style={st.exBorder} />}
                  <View style={st.exRow}>
                    <View style={[st.exNum, { backgroundColor: w.color + '1A' }]}>
                      <Text style={[st.exNumText, { color: w.color }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.exName}>{e.name}</Text>
                      <Text style={T.small}>{e.detail}</Text>
                    </View>
                    <View style={st.exTime}>
                      <Ionicons name="timer-outline" size={12} color={C.textSoft} />
                      <Text style={st.exTimeText}>{clock(e.seconds)}</Text>
                    </View>
                </View>
                  </View>
              ))}
            </Card>
          </Animated.View>
          <Animated.View entering={enter(3)} style={st.tip}>
            <IconTile icon="bulb" color={C.warning} bg={C.warningSoft} size={34} />
            <Text style={[T.small, { flex: 1 }]}>Keep water nearby and stop if you feel dizzy or any sharp pain. Demo runs at {speed}× speed — tap the speed badge to change it.</Text>
          </Animated.View>
        </View>
      </ScrollView>
      <View style={[st.sticky, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {saved ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Restart" icon="refresh" variant="outline" onPress={() => start()} style={{ flex: 1 }} />
            <Button title={`Continue · ${Math.round(Math.min(1, saved.elapsed / total) * 100)}%`} icon="play" onPress={resumeRun} style={{ flex: 2 }} />
          </View>
        ) : (
          <Button title="Start workout" icon="play" onPress={() => start()} />
        )}
      </View>
    </View>
  );
}

function DoneStat({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: string; label: string }) {
  return (
    <View style={st.doneStat}>
      <IconTile icon={icon} color={color} bg={bg} size={36} />
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
    <PressableScale
      hitSlop={6}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ alignItems: 'center', gap: 6, width: 72 }}>
      <View style={st.ctrl}>
        <Ionicons name={icon} size={22} color={C.white} />
      </View>
      <Text style={st.ctrlLabel}>{label}</Text>
    </PressableScale>
  );
}

const st = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 48, alignItems: 'center', overflow: 'hidden' },
  heroDeco: { position: 'absolute', top: -110, right: -120 },
  heroPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Same footprint as the glyph disc (104 + 4 margin), so the hero keeps its height when a photo replaces it.
  heroPhotoGap: { height: 108 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  catPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill },
  catText: { color: C.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  heroDisc: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  heroTitle: { color: C.white, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 12, letterSpacing: -0.7 },
  heroCoach: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginTop: 4 },
  statsCard: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  statCol: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 2 },
  statVal: { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center', letterSpacing: -0.1, fontVariant: ['tabular-nums'] },
  doneBefore: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primarySoft, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  doneBeforeText: { fontSize: 12, fontWeight: '700', color: C.primaryDark, flex: 1 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  exBorder: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft, marginLeft: 46 },
  exNum: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  exNumText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  exName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2, letterSpacing: -0.1 },
  exTime: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.surfaceAlt, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 4 },
  exTimeText: { fontSize: 12, fontWeight: '700', color: C.textSoft, fontVariant: ['tabular-nums'] },
  tip: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginTop: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },

  player: { flex: 1, paddingHorizontal: 20 },
  pTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pTopTitle: { color: C.white, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  speed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, height: 32, borderRadius: R.pill, minWidth: 40, justifyContent: 'center' },
  speedText: { color: C.white, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  segs: { flexDirection: 'row', gap: 4, marginTop: 16 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  segFill: { height: '100%', backgroundColor: C.white, borderRadius: 3 },
  pctText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 8, fontVariant: ['tabular-nums'] },
  pMid: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  prepNum: { color: C.white, fontSize: 120, fontWeight: '800', lineHeight: 140, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  pName: { color: C.white, fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: -0.7 },
  pDetail: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  ringWrap: { marginTop: 22, padding: 10, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.05)' },
  timer: { color: C.white, fontSize: 50, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  pStats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 28 },
  pStatDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.14)' },
  pStatValue: { color: C.white, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12 },
  nextIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  nextKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  nextName: { color: C.white, fontSize: 15, fontWeight: '700', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 20 },
  ctrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },

  doneWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneDisc: { width: 128, height: 128, borderRadius: 64, backgroundColor: C.primarySoft, borderWidth: 6, borderColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: 18, ...shadowSm },
  doneStats: { flexDirection: 'row', gap: 10, marginTop: 26, alignSelf: 'stretch' },
  doneStat: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  doneStatValue: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: 6, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primarySoft, borderRadius: R.md, padding: 14, marginTop: 16, alignSelf: 'stretch' },
  factTile: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
});
