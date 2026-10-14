import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseArt } from '@/components/program/ExerciseArt';
import { ExerciseSheet } from '@/components/program/ExerciseSheet';
import { GradientButton, PRIMARY_COLORS } from '@/components/program/GradientButton';
import { findSession, fmtClock, itemLabel, logTitle, planItems, resumePoints, sessionMeta } from '@/components/program/session';
import { Dialog, EmptyState, Header, IconButton, Ring, Screen, tap, useToast } from '@/components/ui';
import { exerciseById, sessionStats, type Session } from '@/data/program';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

type Phase = 'ready' | 'work' | 'rest';
const ND = Platform.OS !== 'web';
const REST_COLORS: [string, string] = [C.primary, '#0B5563'];

export default function PlayerScreen() {
  const { key, resume } = useLocalSearchParams<{ key?: string; resume?: string }>();
  const session = useMemo(() => findSession(String(key ?? '')), [key]);
  if (!session || session.restDay || planItems(session).length === 0)
    return (
      <Screen>
        <Header title="Workout" />
        <EmptyState emoji="🤷" title="Nothing to play here" text="This workout doesn't exist or has no exercises." action="Go back" onAction={() => (router.canGoBack() ? router.back() : router.replace('/fitness'))} />
      </Screen>
    );
  return <Player session={session} resume={resume === '1'} />;
}

function Player({ session, resume }: { session: Session; resume: boolean }) {
  const { state, completeSession, updateSettings } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const [items] = useState(() => planItems(session));
  const n = items.length;
  const [startIdx] = useState(() => (resume ? Math.max(0, Math.min(n - 1, resumePoints.get(session.key) ?? 0)) : 0));
  const [readyTotal] = useState(() => Math.max(3, state.settings.countdown));
  const [idx, setIdx] = useState(startIdx);
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState(readyTotal);
  const [restTotal, setRestTotal] = useState(state.settings.restSeconds);
  const [done, setDone] = useState<number[]>(() => Array.from({ length: startIdx }, (_, i) => i));
  const [paused, setPaused] = useState(false);
  const [info, setInfo] = useState<number | null>(null);
  const [askQuit, setAskQuit] = useState(false);

  const finished = useRef(false);
  const activeMs = useRef(0);
  const lastTs = useRef(Date.now());
  const fade = useRef(new Animated.Value(1)).current;

  const halted = paused || info !== null || askQuit;
  const item = items[idx];
  const ex = exerciseById(item.exerciseId);
  const timed = !!item.seconds;
  const ticking = !halted && (phase !== 'work' || timed);
  const artH = Math.round(Math.min(360, winH * 0.36));

  // Active (un-paused) wall-clock time for the workout log.
  useEffect(() => {
    if (halted) activeMs.current += Date.now() - lastTs.current;
    else lastTs.current = Date.now();
  }, [halted]);

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
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: ND }).start();
  }, [phase, idx, fade]);

  const startWork = (i: number) => {
    tap();
    setIdx(i);
    setPhase('work');
    setLeft(items[i].seconds ?? 0);
    setPaused(false);
  };

  const finish = (count: number) => {
    if (finished.current) return;
    finished.current = true;
    const ms = activeMs.current + (halted ? 0 : Date.now() - lastTs.current);
    const minutes = Math.max(1, Math.round(ms / 60000));
    const kcal = Math.max(1, Math.round((sessionStats({ ...session, items }, state.settings.restSeconds).kcal * count) / n));
    const meta = sessionMeta(session);
    const prev = meta.program ? state.programProgress[meta.program.id] ?? 0 : 0;
    const advanced = !!meta.program && meta.day === prev + 1;
    completeSession({ sessionKey: session.key, title: logTitle(session), emoji: session.emoji, minutes, kcal });
    resumePoints.delete(session.key);
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

  // Phase transitions when a countdown reaches zero.
  useEffect(() => {
    if (left > 0 || halted || finished.current) return;
    if (phase === 'ready' || phase === 'rest') startWork(idx);
    else if (timed) complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, halted]);

  const requestQuit = () => setAskQuit(true);
  const quit = () => {
    setAskQuit(false);
    if (idx > 0) {
      resumePoints.set(session.key, idx);
      toast('Progress saved — continue anytime', 'bookmark');
    } else resumePoints.delete(session.key);
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/program-day', params: { key: session.key } });
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

  const segments = (light = false) => (
    <View style={s.segments}>
      {items.map((_, i) => {
        const isDone = done.includes(i);
        const cur = i === idx && phase === 'work';
        const frac = cur ? (timed ? 1 - left / (item.seconds || 1) : 0.5) : 0;
        return (
          <View key={i} style={[s.seg, { backgroundColor: light ? 'rgba(255,255,255,0.25)' : C.borderSoft }]}>
            {(isDone || cur) && <View style={{ height: '100%', width: isDone ? '100%' : `${Math.max(8, frac * 100)}%`, backgroundColor: light ? C.white : C.primary, borderRadius: 2 }} />}
          </View>
        );
      })}
    </View>
  );

  const nameRow = (
    <Pressable hitSlop={6} onPress={() => (tap(), setInfo(idx))} style={s.nameRow}>
      <Text style={s.name} numberOfLines={2}>
        {ex.name.toUpperCase()}
      </Text>
      <Ionicons name="information-circle-outline" size={22} color={C.muted} />
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

  /* ---------- REST ---------- */
  if (phase === 'rest')
    return (
      <LinearGradient colors={REST_COLORS} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[s.flex, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 20 }]}>
        <StatusBar style="light" />
        {segments(true)}
        <View style={s.topRow}>
          <IconButton icon="close" color={C.white} bg="rgba(255,255,255,0.18)" onPress={requestQuit} />
        </View>
        <Animated.View style={[s.flex, { opacity: fade }]}>
          <Text style={s.nextLabel}>
            NEXT {idx + 1}/{n}
          </Text>
          <View style={s.nextRow}>
            <Text style={s.nextName} numberOfLines={2}>
              {ex.name.toUpperCase()}
            </Text>
            <Text style={s.nextVal}>{itemLabel(item)}</Text>
          </View>
          <Pressable onPress={() => (tap(), setInfo(idx))} style={s.preview}>
            <ExerciseArt emoji={ex.emoji} width="100%" height={Math.round(artH * 0.62)} animated radius={R.lg} />
            <View style={s.previewInfo}>
              <Ionicons name="information-circle" size={22} color={C.primary} />
            </View>
          </Pressable>
          <View style={[s.flex, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={s.restLabel}>REST</Text>
            <Text style={s.restClock}>{fmtClock(left)}</Text>
            <View style={s.restTrack}>
              <View style={[s.restFill, { width: `${Math.min(100, (left / Math.max(1, restTotal)) * 100)}%` }]} />
            </View>
          </View>
          <View style={s.restBtns}>
            <Pressable
              onPress={() => {
                tap();
                setLeft((l) => l + 20);
                setRestTotal((t) => t + 20);
              }}
              style={({ pressed }) => [s.restBtn, s.restBtnGhost, pressed && { opacity: 0.8 }]}>
              <Text style={[s.restBtnText, { color: C.white }]}>+20s</Text>
            </Pressable>
            <Pressable onPress={() => startWork(idx)} style={({ pressed }) => [s.restBtn, { backgroundColor: C.white }, pressed && { opacity: 0.85 }]}>
              <Text style={[s.restBtnText, { color: C.primaryDark }]}>Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
        {overlays}
      </LinearGradient>
    );

  /* ---------- GET READY / EXERCISE ---------- */
  return (
    <View style={[s.flex, { backgroundColor: C.card, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 20 }]}>
      <StatusBar style="dark" />
      {segments()}
      <View style={s.topRow}>
        <IconButton icon="close" bg={C.bg} onPress={requestQuit} />
        <View style={s.flex} />
        <IconButton icon={state.settings.coachVoice ? 'volume-high' : 'volume-mute'} bg={C.bg} onPress={toggleSound} style={{ marginRight: 8 }} />
        <IconButton icon="information-circle-outline" bg={C.bg} onPress={() => setInfo(idx)} />
      </View>

      <Animated.View style={[s.flex, { opacity: fade }]}>
        <ExerciseArt emoji={ex.emoji} width="100%" height={artH} animated radius={R.xl} style={{ marginTop: 6 }} />

        {phase === 'ready' ? (
          <>
            <View style={s.center}>
              <Text style={s.readyLabel}>READY TO GO!</Text>
              {nameRow}
              <Text style={s.readySub}>{itemLabel(item)}</Text>
            </View>
            <View style={s.controls}>
              <View style={s.flex} />
              <Ring size={112} stroke={9} value={left / readyTotal} color={C.primary}>
                <Text style={s.ringNum}>{left}</Text>
              </Ring>
              <View style={[s.flex, { alignItems: 'flex-end' }]}>
                <Pressable onPress={() => startWork(idx)} style={({ pressed }) => [s.skip, pressed && { opacity: 0.7 }]}>
                  <Text style={s.skipText}>Skip</Text>
                  <Ionicons name="play-forward" size={16} color={C.primaryDark} />
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.center}>
              <Text style={[s.huge, paused && { color: C.muted }]}>{timed ? fmtClock(left) : `x ${item.reps ?? 10}`}</Text>
              {nameRow}
              {timed && (
                <Pressable onPress={() => (tap(), setPaused((p) => !p))} style={({ pressed }) => [s.pause, paused && { backgroundColor: C.primary }, pressed && { opacity: 0.8 }]}>
                  <Ionicons name={paused ? 'play' : 'pause'} size={16} color={paused ? C.white : C.text} />
                  <Text style={[s.pauseText, paused && { color: C.white }]}>{paused ? 'RESUME' : 'PAUSE'}</Text>
                </Pressable>
              )}
            </View>
            <View style={s.controls}>
              <Pressable hitSlop={8} onPress={goPrev} style={({ pressed }) => [s.side, (pressed || idx === 0) && { opacity: 0.45 }]}>
                <Ionicons name="play-skip-back" size={26} color={C.text} />
                <Text style={s.sideText}>Previous</Text>
              </Pressable>
              <GradientButton icon="checkmark" iconSize={36} colors={PRIMARY_COLORS} height={70} onPress={complete} style={{ width: 150 }} />
              <Pressable hitSlop={8} onPress={() => (tap(), goNext())} style={({ pressed }) => [s.side, pressed && { opacity: 0.45 }]}>
                <Ionicons name="play-skip-forward" size={26} color={C.text} />
                <Text style={s.sideText}>{idx >= n - 1 ? 'Finish' : 'Skip'}</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
      {overlays}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  segments: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  name: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 0.3, textAlign: 'center', flexShrink: 1 },
  huge: { fontSize: 68, fontWeight: '900', color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  readyLabel: { fontSize: 26, fontWeight: '900', color: C.primary, letterSpacing: 0.5, marginBottom: 8 },
  readySub: { fontSize: 16, fontWeight: '700', color: C.textSoft, marginTop: 6 },
  ringNum: { fontSize: 42, fontWeight: '900', color: C.text },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, paddingHorizontal: 16, height: 42, borderRadius: R.pill },
  skipText: { fontSize: 15, fontWeight: '800', color: C.primaryDark },
  pause: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: C.bg, paddingHorizontal: 18, height: 40, borderRadius: R.pill },
  pauseText: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 0.6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4 },
  side: { width: 76, alignItems: 'center', gap: 4 },
  sideText: { fontSize: 12, fontWeight: '700', color: C.textSoft },
  nextLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14 },
  nextName: { flex: 1, color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: 0.3 },
  nextVal: { color: C.white, fontSize: 22, fontWeight: '900' },
  preview: { backgroundColor: C.white, borderRadius: 24, padding: 8 },
  previewInfo: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  restLabel: { color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: 6 },
  restClock: { color: C.white, fontSize: 84, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  restTrack: { width: 180, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 6 },
  restFill: { height: '100%', backgroundColor: C.white, borderRadius: 3 },
  restBtns: { flexDirection: 'row', gap: 12 },
  restBtn: { flex: 1, height: 56, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  restBtnGhost: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  restBtnText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
