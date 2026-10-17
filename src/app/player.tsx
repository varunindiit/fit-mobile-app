import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ExerciseArt } from '@/components/program/ExerciseArt';
import { ExerciseSheet } from '@/components/program/ExerciseSheet';
import { GradientButton, PRIMARY } from '@/components/program/GradientButton';
import { accentTheme, findSession, fmtClock, itemLabel, logTitle, planItems, sessionMeta } from '@/components/program/session';
import { Dialog, EASE_OUT, EmptyState, Header, IconButton, PressableScale, Screen, tap, useToast } from '@/components/ui';
import { exerciseById, sessionStats, type Session } from '@/data/program';
import { useStore } from '@/lib/store';
import { C, G, R } from '@/theme';

type Phase = 'ready' | 'work' | 'rest';
/** Rest is the one light screen in the player: work is dark, rest is a white breather. */
const REST_BG: [string, string] = ['#FFFFFF', C.bg];
const GLASS = 'rgba(255,255,255,0.12)';
const GLASS_BORDER = 'rgba(255,255,255,0.16)';

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ key?: string | string[]; resume?: string | string[] }>();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const resume = Array.isArray(params.resume) ? params.resume[0] : params.resume;
  const { state } = useStore();
  const session = useMemo(() => findSession(String(key ?? '')), [key]);
  if (!session || session.restDay || planItems(session, state.planEdits).length === 0)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState icon="barbell-outline" title="Nothing to play here" text="This workout doesn't exist or has no exercises." action="Go back" onAction={() => (router.canGoBack() ? router.back() : router.replace('/fitness'))} />
      </Screen>
    );
  return <Player session={session} resume={resume === '1'} />;
}

function Player({ session, resume }: { session: Session; resume: boolean }) {
  const { state, completeSession, updateSettings, saveResume, clearResume } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const pal = useMemo(() => accentTheme(session.colors), [session.colors]);

  const [items] = useState(() => planItems(session, state.planEdits));
  const n = items.length;
  const [saved] = useState(() => (resume ? state.sessionResume[session.key] : undefined));
  const [startIdx] = useState(() => (saved ? Math.max(0, Math.min(n - 1, saved.idx)) : 0));
  const [readyTotal] = useState(() => Math.max(3, state.settings.countdown));
  const [idx, setIdx] = useState(startIdx);
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState(readyTotal);
  const [restTotal, setRestTotal] = useState(state.settings.restSeconds);
  const [done, setDone] = useState<number[]>(() => (saved ? saved.done.filter((i) => Number.isInteger(i) && i >= 0 && i < n) : []));
  const [paused, setPaused] = useState(false);
  const [info, setInfo] = useState<number | null>(null);
  const [askQuit, setAskQuit] = useState(false);

  const finished = useRef(false); // also set when quitting, so nothing re-saves progress afterwards
  const activeMs = useRef(saved && Number.isFinite(saved.elapsedMs) ? saved.elapsedMs : 0);
  const lastTs = useRef(0); // set on mount by the active-time effect below
  const fade = useSharedValue(1);

  const halted = paused || info !== null || askQuit;
  const item = items[idx];
  const ex = exerciseById(item.exerciseId);
  const timed = !!item.seconds;
  const ticking = !halted && (phase !== 'work' || timed);
  const artH = Math.round(Math.min(300, winH * 0.27));
  const ringSize = Math.round(Math.min(190, winH * 0.22));
  const roomy = winH >= 700;
  const upNext = idx < n - 1 ? items[idx + 1] : undefined;

  // Active (un-paused) wall-clock time for the workout log.
  useEffect(() => {
    if (halted) activeMs.current += Date.now() - lastTs.current;
    else lastTs.current = Date.now();
  }, [halted]);

  // Persist progress as it happens, so a crash or app kill can still continue from here.
  useEffect(() => {
    if (finished.current) return;
    saveResume(session.key, { idx, done, elapsedMs: activeMs.current + (halted ? 0 : Date.now() - lastTs.current) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  // Pause when the app leaves the foreground (and save elapsed time); un-freeze non-exercise countdowns on return.
  const live = useRef({ idx, done, phase, timed, halted });
  useEffect(() => {
    live.current = { idx, done, phase, timed, halted };
  });
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (finished.current) return;
      if (st === 'active') {
        if (!(live.current.phase === 'work' && live.current.timed)) setPaused(false);
        return;
      }
      setPaused(true);
      const { idx: i, done: d, halted: h } = live.current;
      saveResume(session.key, { idx: i, done: d, elapsedMs: activeMs.current + (h ? 0 : Date.now() - lastTs.current) });
    });
    return () => sub.remove();
  }, [session.key, saveResume]);

  // 1s real-time ticker for get-ready, rest and timed exercises.
  useEffect(() => {
    if (!ticking) return;
    const h = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(h);
  }, [ticking, phase, idx]);

  // Haptic "beeps" for the last 3 seconds.
  useEffect(() => {
    if (ticking && left > 0 && left <= 3) tap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  // Soft fade between screens.
  useEffect(() => {
    fade.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 260, easing: EASE_OUT })));
  }, [phase, idx, fade]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: (1 - fade.get()) * 10 }] }));

  const startWork = (i: number) => {
    tap();
    setIdx(i);
    setPhase('work');
    setLeft(items[i].seconds ?? 0);
    setPaused(false);
  };

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/program-day', params: { key: session.key } });
  };

  const finish = (count: number) => {
    if (finished.current) return;
    finished.current = true;
    if (count === 0) {
      clearResume(session.key);
      toast('No exercises completed — nothing was logged', 'information-circle');
      return leave();
    }
    const ms = activeMs.current + (halted ? 0 : Date.now() - lastTs.current);
    const minutes = Math.max(1, Math.round(ms / 60000));
    const kcal = Math.max(1, Math.round((sessionStats({ ...session, items }, state.settings.restSeconds).kcal * count) / n));
    const meta = sessionMeta(session);
    const prev = meta.program ? state.programProgress[meta.program.id] ?? 0 : 0;
    const advanced = !!meta.program && meta.day === prev + 1;
    completeSession({ sessionKey: session.key, title: logTitle(session), emoji: session.emoji, minutes, kcal });
    router.replace({ pathname: '/streak', params: { key: session.key, kcal: String(kcal), minutes: String(minutes), exercises: String(Math.max(1, count)), advanced: advanced ? '1' : '0' } });
  };

  const complete = () => {
    tap();
    const nextDone = done.includes(idx) ? done : [...done, idx];
    setDone(nextDone);
    if (idx >= n - 1) return finish(nextDone.length);
    setIdx(idx + 1);
    setPhase('rest');
    setRestTotal(state.settings.restSeconds);
    setLeft(state.settings.restSeconds);
    setPaused(false);
  };

  const goPrev = () => {
    if (idx === 0) return toast('This is the first exercise', 'information-circle');
    startWork(idx - 1);
  };
  const goNext = () => (idx >= n - 1 ? finish(done.length) : startWork(idx + 1));

  // Phase transitions when a countdown reaches zero (run a tick later, outside the effect body).
  useEffect(() => {
    if (left > 0 || halted || finished.current) return;
    const t = setTimeout(() => {
      if (phase === 'ready' || phase === 'rest') startWork(idx);
      else if (timed) complete();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, halted]);

  const requestQuit = () => setAskQuit(true);
  const quit = () => {
    setAskQuit(false);
    finished.current = true;
    // The quit dialog halts the clock, so activeMs already holds the elapsed time.
    if (idx > 0 || done.length > 0) {
      saveResume(session.key, { idx, done, elapsedMs: activeMs.current });
      toast('Progress saved — continue anytime', 'bookmark');
    } else clearResume(session.key);
    leave();
  };

  // Android hardware back asks before quitting.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setAskQuit(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  const toggleSound = () => {
    const on = !state.settings.coachVoice;
    updateSettings({ coachVoice: on });
    toast(on ? 'Coach voice on' : 'Coach voice muted', on ? 'volume-high' : 'volume-mute');
  };

  const segments = (rest = false) => (
    <View style={s.segments}>
      {items.map((_, i) => {
        const isDone = done.includes(i);
        const cur = i === idx && phase === 'work';
        const frac = cur ? (timed ? 1 - left / (item.seconds || 1) : 0.5) : 0;
        return (
          <View key={i} style={[s.seg, { backgroundColor: rest ? C.border : 'rgba(255,255,255,0.14)' }]}>
            {(isDone || cur) && <View style={{ height: '100%', width: isDone ? '100%' : `${Math.max(8, frac * 100)}%`, backgroundColor: rest ? pal.accent : C.primary, borderRadius: 2 }} />}
          </View>
        );
      })}
    </View>
  );

  const nameRow = (
    <Pressable hitSlop={6} onPress={() => (tap(), setInfo(idx))} style={({ pressed }) => [s.nameRow, pressed && { opacity: 0.7 }]}>
      <Text style={s.name} numberOfLines={2}>
        {ex.name}
      </Text>
      <Ionicons name="information-circle-outline" size={22} color="rgba(255,255,255,0.6)" />
    </Pressable>
  );

  const overlays = (
    <>
      <ExerciseSheet visible={info !== null} index={info ?? idx} items={items} onClose={() => setInfo(null)} />
      <Dialog
        visible={askQuit}
        icon="🥺"
        title="Quit workout?"
        text={`You've completed ${done.length} of ${n} exercises. Your progress will be saved so you can continue later.`}
        confirm="Quit"
        cancel="Resume"
        danger
        onConfirm={quit}
        onCancel={() => setAskQuit(false)}
      />
    </>
  );

  const frame = { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 20 };

  /* ---------- REST ---------- */
  if (phase === 'rest')
    return (
      <LinearGradient colors={REST_BG} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[s.flex, frame]}>
        <StatusBar style="dark" />
        {segments(true)}
        <View style={s.topRow}>
          <IconButton icon="close" color={C.text} bg={C.surfaceAlt} onPress={requestQuit} />
          <Text style={[s.topTitle, { color: C.textSoft }]}>Rest</Text>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View style={[s.flex, fadeStyle]}>
          <Text style={[s.nextLabel, { color: C.muted }]}>
            NEXT {idx + 1}/{n}
          </Text>
          <View style={s.nextRow}>
            <Text style={[s.nextName, { color: C.text }]} numberOfLines={2}>
              {ex.name}
            </Text>
            <View style={[s.nextValPill, { backgroundColor: pal.soft }]}>
              <Text style={[s.nextVal, { color: pal.accent }]}>{itemLabel(item)}</Text>
            </View>
          </View>
          <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`About ${ex.name}`} onPress={() => (tap(), setInfo(idx))} style={[s.preview, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
            <ExerciseArt id={ex.id} emoji={ex.emoji} width="100%" height={Math.round(artH * 0.62)} animated radius={R.lg} tint={pal.art} />
            <View style={[s.previewInfo, { backgroundColor: pal.accent }]}>
              <Ionicons name="information-circle" size={22} color={pal.on} />
            </View>
          </PressableScale>
          <View style={[s.flex, { alignItems: 'center', justifyContent: 'center' }]}>
            <CountdownRing key={`rest-${idx}`} size={ringSize} stroke={10} left={left} total={restTotal} ticking={ticking} color={pal.accent} track={C.border}>
              <Text style={[s.restLabel, { color: C.muted }]}>REST</Text>
              <Text style={[s.restClock, { color: C.text, fontSize: Math.round(ringSize * 0.27) }]}>{fmtClock(left)}</Text>
            </CountdownRing>
          </View>
          <View style={s.restBtns}>
            <PressableScale
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel="Add 20 seconds"
              onPress={() => {
                tap();
                setLeft((l) => l + 20);
                setRestTotal((t) => t + 20);
              }}
              style={[s.restBtn, s.restBtnGhost]}>
              <Ionicons name="add" size={18} color={C.text} />
              <Text style={[s.restBtnText, { color: C.text }]}>20s</Text>
            </PressableScale>
            <PressableScale scaleTo={0.96} accessibilityRole="button" onPress={() => startWork(idx)} style={[s.restBtn, { backgroundColor: pal.accent }]}>
              <Text style={[s.restBtnText, { color: pal.on }]}>Skip</Text>
              <Ionicons name="play-skip-forward" size={16} color={pal.on} />
            </PressableScale>
          </View>
        </Animated.View>
        {overlays}
      </LinearGradient>
    );

  /* ---------- GET READY / EXERCISE ---------- */
  return (
    <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[s.flex, frame]}>
      <StatusBar style="light" />
      {segments()}
      <View style={s.topRow}>
        <IconButton icon="close" color={C.white} bg={GLASS} onPress={requestQuit} />
        <Text style={s.topTitle}>{phase === 'ready' ? 'Get ready' : `${idx + 1} of ${n}`}</Text>
        <IconButton icon={state.settings.coachVoice ? 'volume-high' : 'volume-mute'} color={C.white} bg={GLASS} onPress={toggleSound} style={{ marginRight: 8 }} />
        <IconButton icon="information-circle-outline" color={C.white} bg={GLASS} onPress={() => setInfo(idx)} />
      </View>

      <Animated.View style={[s.flex, fadeStyle]}>
        <View style={s.artFrame}>
          <ExerciseArt id={ex.id} emoji={ex.emoji} width="100%" height={artH} animated radius={R.xl} />
        </View>

        {phase === 'ready' ? (
          <>
            <View style={s.center}>
              <Text style={s.readyLabel}>READY TO GO!</Text>
              {nameRow}
              <Text style={s.readySub}>{itemLabel(item)}</Text>
            </View>
            <View style={s.controls}>
              <View style={s.flex} />
              <CountdownRing key={`ready-${idx}`} size={116} stroke={9} left={left} total={readyTotal} ticking={ticking} color={C.primary} track="rgba(255,255,255,0.12)">
                <Text style={s.ringNum}>{left}</Text>
              </CountdownRing>
              <View style={[s.flex, { alignItems: 'flex-end' }]}>
                <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => startWork(idx)} style={s.skip}>
                  <Text style={s.skipText}>Skip</Text>
                  <Ionicons name="play-forward" size={15} color={C.white} />
                </PressableScale>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.center}>
              {timed ? (
                <CountdownRing key={`work-${idx}`} size={ringSize} stroke={10} left={left} total={item.seconds ?? 1} ticking={ticking} color={C.primary} track="rgba(255,255,255,0.12)">
                  <Text style={[s.clock, { fontSize: Math.round(ringSize * 0.25) }, paused && { color: 'rgba(255,255,255,0.45)' }]}>{fmtClock(left)}</Text>
                  {paused && <Text style={s.pausedTag}>PAUSED</Text>}
                </CountdownRing>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={s.huge}>x {item.reps ?? 10}</Text>
                  <Text style={s.repsTag}>REPS</Text>
                </View>
              )}
              <View style={{ marginTop: 10 }}>{nameRow}</View>
              {timed && (
                <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => (tap(), setPaused((p) => !p))} style={[s.pause, paused && { backgroundColor: C.primary, borderColor: C.primary }]}>
                  <Ionicons name={paused ? 'play' : 'pause'} size={15} color={paused ? C.onPrimary : C.white} />
                  <Text style={[s.pauseText, { color: paused ? C.onPrimary : C.white }]}>{paused ? 'RESUME' : 'PAUSE'}</Text>
                </PressableScale>
              )}
            </View>
            {roomy && upNext && <NextUp id={upNext.exerciseId} emoji={exerciseById(upNext.exerciseId).emoji} name={exerciseById(upNext.exerciseId).name} value={itemLabel(upNext)} />}
            <View style={s.controls}>
              <PressableScale hitSlop={8} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Previous exercise" onPress={goPrev} style={[s.side, idx === 0 && { opacity: 0.45 }]}>
                <View style={s.sideIcon}>
                  <Ionicons name="play-skip-back" size={22} color={C.white} />
                </View>
                <Text style={s.sideText}>Previous</Text>
              </PressableScale>
              <GradientButton {...PRIMARY} icon="checkmark" iconSize={36} height={70} onPress={complete} style={{ width: 150 }} />
              <PressableScale hitSlop={8} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={idx >= n - 1 ? 'Finish workout' : 'Skip exercise'} onPress={() => (tap(), goNext())} style={s.side}>
                <View style={s.sideIcon}>
                  <Ionicons name="play-skip-forward" size={22} color={C.white} />
                </View>
                <Text style={s.sideText}>{idx >= n - 1 ? 'Finish' : 'Skip'}</Text>
              </PressableScale>
            </View>
          </>
        )}
      </Animated.View>
      {overlays}
    </LinearGradient>
  );
}

function NextUp({ id, emoji, name, value }: { id: string; emoji: string; name: string; value: string }) {
  return (
    <View style={s.nextUp}>
      <ExerciseArt id={id} emoji={emoji} size={40} animated radius={12} />
      <View style={{ flex: 1 }}>
        <Text style={s.nextUpLabel}>NEXT UP</Text>
        <Text style={s.nextUpName} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Text style={s.nextUpVal}>{value}</Text>
    </View>
  );
}

const ACircle = Animated.createAnimatedComponent(Circle);

/** Countdown ring that sweeps continuously toward the next second while ticking and freezes while paused. */
function CountdownRing({ size, stroke, left, total, ticking, color, track, children }: { size: number; stroke: number; left: number; total: number; ticking: boolean; color: string; track: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(Math.max(0, Math.min(1, left / Math.max(1, total))));

  useEffect(() => {
    if (!ticking) {
      cancelAnimation(p);
      return;
    }
    const target = Math.max(0, Math.min(1, Math.max(0, left - 1) / Math.max(1, total)));
    p.set(withTiming(target, { duration: 1000, easing: Easing.linear }));
  }, [left, total, ticking, p]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  segments: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  topTitle: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700', letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
  artFrame: { marginTop: 4, borderRadius: R.xl + 4, padding: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  name: { fontSize: 22, fontWeight: '700', color: C.white, letterSpacing: -0.4, textAlign: 'center', flexShrink: 1 },
  clock: { fontWeight: '800', color: C.white, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  pausedTag: { color: C.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
  huge: { fontSize: 72, fontWeight: '800', color: C.white, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  repsTag: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: -4 },
  readyLabel: { fontSize: 24, fontWeight: '800', color: C.primary, letterSpacing: 0.5, marginBottom: 8 },
  readySub: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 6, fontVariant: ['tabular-nums'] },
  ringNum: { fontSize: 42, fontWeight: '800', color: C.white, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER, paddingHorizontal: 16, height: 42, borderRadius: R.pill },
  skipText: { fontSize: 15, fontWeight: '700', color: C.white },
  pause: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER, paddingHorizontal: 18, height: 40, borderRadius: R.pill },
  pauseText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  nextUp: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: R.md, padding: 8, paddingRight: 14, marginBottom: 6 },
  nextUpLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  nextUpName: { color: C.white, fontSize: 14, fontWeight: '700', marginTop: 1 },
  nextUpVal: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4 },
  side: { width: 76, alignItems: 'center', gap: 6 },
  sideIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER, alignItems: 'center', justifyContent: 'center' },
  sideText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  nextLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginTop: 4, fontVariant: ['tabular-nums'] },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14 },
  nextName: { flex: 1, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  nextValPill: { borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 },
  nextVal: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  preview: { borderWidth: 1, borderRadius: R.xl, padding: 6 },
  previewInfo: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  restLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 5 },
  restClock: { fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  restBtns: { flexDirection: 'row', gap: 12 },
  restBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  restBtnGhost: { backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border },
  restBtnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
