import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrainerAvatar } from '@/components/trainer/parts';
import { EASE_OUT, PressableScale, enter, fadeEnter, impact, tap, useToast, type IconName } from '@/components/ui';
import { availability, firstName, trainerById } from '@/data/trainers';
import { useStore } from '@/lib/store';
import { C, G, MOTION, R, S, fade, glow, shadowLg } from '@/theme';

/**
 * One-to-one call with the member's Pro trainer.
 *
 * Nothing here touches the camera, the microphone or the network: no media or WebRTC
 * package is imported and no permission is requested. The "video" is a placeholder
 * surface and the lifecycle below is driven by timers, so the screen says so plainly,
 * on a pill that stays visible for the whole call.
 */

type CallKind = 'audio' | 'video';
type CallPhase = 'calling' | 'ringing' | 'connected' | 'ended';
type CallOutcome = 'ended' | 'missed' | 'declined';

/** Demo lifecycle, in ms. */
const CALLING_MS = 1200;
const RINGING_MS = 2500;
/** How long the "Call ended" state stays on screen before the modal closes. */
const LINGER_MS = 1500;

const DISCLOSURE = 'Demo call — no audio or video is transmitted';

/** "02:41" for the running duration. */
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
/** "2:41" for prose ("Call ended · 2:41"). */
const spoken = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const leaveCall = () => (router.canGoBack() ? router.back() : router.replace('/trainer'));

/**
 * The whole call lifecycle, kept in one unit so it can be swapped for a real
 * provider later: an Agora/Twilio/WebRTC integration would replace the three timers
 * below with its client's join / remote-joined / disconnected callbacks and the
 * toggles with its mute, speaker and camera calls. Everything else — the phases,
 * the duration ticker and the `logCall` write — stays as it is.
 */
function useCallSession(kind: CallKind) {
  const { state, logCall } = useStore();
  const toast = useToast();
  const trainer = useMemo(() => trainerById(state.trainerId), [state.trainerId]);

  const [phase, setPhase] = useState<CallPhase>('calling');
  const [seconds, setSeconds] = useState(0);

  // Mirrors `seconds` so `end()` can log the duration without depending on render state.
  const elapsed = useRef(0);
  const closed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  }, []);

  // Provider swap point: replace with connection events, not timeouts.
  useEffect(() => {
    timers.current.push(setTimeout(() => setPhase('ringing'), CALLING_MS));
    timers.current.push(
      setTimeout(() => {
        setPhase('connected');
        impact();
      }, CALLING_MS + RINGING_MS),
    );
    return clearTimers;
  }, [clearTimers]);

  useEffect(() => {
    if (phase !== 'connected') return;
    ticker.current = setInterval(() => {
      elapsed.current += 1;
      setSeconds(elapsed.current);
    }, 1000);
    return () => {
      if (ticker.current) clearInterval(ticker.current);
      ticker.current = null;
    };
  }, [phase]);

  const connected = phase === 'connected';

  /**
   * Hang up: log the call, hold the "Call ended" state briefly, then close the modal.
   * `outcome` is explicit so a real provider can report a remote `'declined'`; the
   * demo only distinguishes a connected call from one closed before it picked up.
   */
  const end = useCallback(
    (outcome?: CallOutcome) => {
      if (closed.current) return;
      closed.current = true;
      const taken = elapsed.current;
      clearTimers();
      logCall({ trainerId: trainer.id, kind, seconds: taken, outcome: outcome ?? (taken > 0 ? 'ended' : 'missed') });
      setPhase('ended');
      toast(taken > 0 ? `Demo call logged · ${spoken(taken)}` : 'Demo call logged', 'call-outline');
      timers.current.push(setTimeout(leaveCall, LINGER_MS));
    },
    [clearTimers, kind, logCall, toast, trainer.id],
  );

  // Android hardware back hangs up rather than dropping out of a live call.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      end();
      return true;
    });
    return () => sub.remove();
  }, [end]);

  const endedLabel = seconds > 0 ? `Call ended · ${spoken(seconds)}` : 'Call ended';
  const status = phase === 'calling' ? 'Calling…' : phase === 'ringing' ? 'Ringing…' : connected ? clock(seconds) : endedLabel;

  return { trainer, phase, connected, seconds, status, end };
}

export default function TrainerCallScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const kind: CallKind = mode === 'video' ? 'video' : 'audio';
  // Remount on mode change so the lifecycle restarts cleanly instead of half-switching.
  return kind === 'video' ? <VideoCall key="video" /> : <AudioCall key="audio" />;
}

/* ---------- Audio ---------- */

function AudioCall() {
  const { trainer, phase, connected, status, end } = useCallSession('audio');
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const avail = useMemo(() => availability(trainer), [trainer]);
  const ringing = phase === 'calling' || phase === 'ringing';

  const fadeIn = useSharedValue(0);
  useEffect(() => {
    fadeIn.set(withTiming(connected ? 1 : 0, { duration: MOTION.enter, easing: EASE_OUT }));
  }, [connected, fadeIn]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.1 + fadeIn.get() * 0.22 }));

  return (
    <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.flex}>
      <StatusBar style="light" />
      <View style={[st.flex, { paddingTop: insets.top + S.sm, paddingBottom: Math.max(insets.bottom, S.xl) }]}>
        <View style={st.topBar}>
          <Text style={st.kindLabel}>AUDIO CALL</Text>
          <DemoPill />
        </View>

        <View style={st.stage}>
          <View style={st.avatarWrap}>
            <Animated.View style={[st.avatarGlow, { backgroundColor: trainer.color }, glowStyle]} />
            <Pulse size={210} color={fade(trainer.color, 0.5)} active={ringing} />
            <Pulse size={210} color={fade(C.white, 0.22)} active={ringing} delay={900} />
            <TrainerAvatar trainer={trainer} size={132} />
          </View>

          <Animated.Text entering={enter(1)} style={st.name} numberOfLines={1}>
            {trainer.name}
          </Animated.Text>
          <Animated.Text entering={enter(2)} style={st.role} numberOfLines={2}>
            {trainer.role}
          </Animated.Text>

          <Animated.Text key={phase} entering={fadeEnter()} style={[st.status, connected && st.statusLive]} numberOfLines={1}>
            {status}
          </Animated.Text>
          {ringing && (
            <Animated.Text entering={fadeEnter(120)} style={st.hint} numberOfLines={1}>
              {firstName(trainer)} · {avail.label}
            </Animated.Text>
          )}
        </View>

        <Animated.View entering={enter(3)} style={st.controls}>
          <CallControl
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? 'Unmute' : 'Mute'}
            on={muted}
            onPress={() => setMuted((m) => !m)}
          />
          <CallControl
            icon={speaker ? 'volume-high' : 'volume-medium'}
            label={speaker ? 'Speaker on' : 'Speaker off'}
            on={speaker}
            onPress={() => setSpeaker((v) => !v)}
          />
          <CallControl icon="call" label="End call" danger onPress={() => end()} />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

/* ---------- Video ---------- */

function VideoCall() {
  const { trainer, phase, connected, status, end } = useCallSession('video');
  const insets = useSafeAreaInsets();
  const [camera, setCamera] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [front, setFront] = useState(true);
  const ringing = phase === 'calling' || phase === 'ringing';

  const stageIn = useSharedValue(0);
  useEffect(() => {
    stageIn.set(withTiming(connected ? 1 : 0, { duration: MOTION.enter, easing: EASE_OUT }));
  }, [connected, stageIn]);
  const stageStyle = useAnimatedStyle(() => ({ opacity: 0.5 + stageIn.get() * 0.5 }));

  return (
    <View style={[st.flex, { backgroundColor: C.navy }]}>
      <StatusBar style="light" />

      {/* Stands in for the trainer's video feed — no camera is used anywhere on this screen. */}
      <Animated.View style={[st.videoStage, stageStyle]}>
        <LinearGradient colors={G.photo} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={st.flex}>
          <View style={st.stageCenter}>
            <Pulse size={220} color={fade(trainer.color, 0.35)} active={ringing} />
            <TrainerAvatar trainer={trainer} size={116} />
            <Text style={st.stagePlaceholder} numberOfLines={2}>
              Video placeholder — no camera is used
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={[st.flex, { paddingTop: insets.top + S.sm, paddingBottom: Math.max(insets.bottom, S.xl) }]}>
        <View style={st.videoTop}>
          <View style={st.videoTopRow}>
            <View style={st.connPill}>
              <View style={[st.connDot, { backgroundColor: connected ? C.primary : C.warning }]} />
              <Text style={st.connText} numberOfLines={1}>
                {phase === 'ended' ? 'Disconnected' : connected ? 'Connected' : 'Connecting…'}
              </Text>
            </View>
            <View style={st.durPill}>
              <Text style={st.durText} numberOfLines={1}>
                {status}
              </Text>
            </View>
          </View>
          <Text style={st.videoName} numberOfLines={1}>
            {trainer.name}
          </Text>
          <DemoPill style={{ marginTop: S.xs }} />
        </View>

        <View style={st.flex} />

        {/* Self-preview. Positioned like a draggable tile, but it is a static placeholder. */}
        <Animated.View entering={enter(2)} style={st.selfTile}>
          <View style={st.selfGrip} />
          {camera ? (
            <>
              <Ionicons name="person" size={26} color={fade(C.white, 0.5)} />
              <Text style={st.selfLabel}>You</Text>
            </>
          ) : (
            <>
              <Ionicons name="videocam-off" size={22} color={fade(C.white, 0.6)} />
              <Text style={st.selfLabel}>Camera off</Text>
            </>
          )}
        </Animated.View>

        <Animated.View entering={enter(3)} style={st.controls}>
          <CallControl
            icon={camera ? 'videocam' : 'videocam-off'}
            label={camera ? 'Camera on' : 'Camera off'}
            on={!camera}
            size={54}
            onPress={() => setCamera((v) => !v)}
          />
          <CallControl icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Unmute' : 'Mute'} on={muted} size={54} onPress={() => setMuted((m) => !m)} />
          <CallControl icon="camera-reverse" label={front ? 'Front' : 'Back'} on={!front} size={54} onPress={() => setFront((f) => !f)} />
          <CallControl
            icon={speaker ? 'volume-high' : 'volume-medium'}
            label={speaker ? 'Speaker on' : 'Speaker off'}
            on={speaker}
            size={54}
            onPress={() => setSpeaker((v) => !v)}
          />
          <CallControl icon="call" label="End call" danger size={54} onPress={() => end()} />
        </Animated.View>
      </View>
    </View>
  );
}

/* ---------- Pieces ---------- */

/** The disclosure that stays on screen for the whole call. */
function DemoPill({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[st.demoPill, style]}>
      <Ionicons name="information-circle-outline" size={13} color={fade(C.white, 0.8)} />
      <Text style={st.demoText} numberOfLines={2}>
        {DISCLOSURE}
      </Text>
    </View>
  );
}

/** Ring that breathes outward while the call is being placed. */
function Pulse({ size, color, active, delay = 0 }: { size: number; color: string; active: boolean; delay?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    if (active) {
      p.set(0);
      p.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)));
    } else {
      p.set(withTiming(0, { duration: MOTION.base }));
    }
    return () => cancelAnimation(p);
  }, [active, delay, p]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.get()) * 0.55,
    transform: [{ scale: 0.68 + p.get() * 0.42 }],
  }));

  return <Animated.View pointerEvents="none" style={[st.pulse, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]} />;
}

/**
 * One circular control. `on` is the real toggled state, so the fill and the label
 * both change — never only the animation.
 */
function CallControl({
  icon,
  label,
  on,
  danger,
  size = 62,
  onPress,
}: {
  icon: IconName;
  label: string;
  on?: boolean;
  danger?: boolean;
  size?: number;
  onPress: () => void;
}) {
  const filled = danger || !!on;
  const bg = danger ? C.danger : on ? C.white : fade(C.white, 0.12);
  const tint = danger ? C.white : on ? C.navy : C.white;
  return (
    <View style={st.controlCell}>
      <PressableScale
        scaleTo={0.92}
        accessibilityRole="button"
        accessibilityState={{ selected: !!on }}
        accessibilityLabel={label}
        onPress={() => {
          if (danger) impact();
          else tap();
          onPress();
        }}
        style={[
          st.control,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
          !filled && st.controlOutline,
          danger && glow(C.danger),
        ]}>
        <Ionicons name={icon} size={Math.round(size * 0.4)} color={tint} style={danger ? st.hangUp : undefined} />
      </PressableScale>
      <Text style={st.controlLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { paddingHorizontal: S.xl, alignItems: 'center', gap: S.xs },
  kindLabel: { color: fade(C.white, 0.5), fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    maxWidth: 320,
    paddingHorizontal: S.sm,
    paddingVertical: 7,
    borderRadius: R.pill,
    backgroundColor: fade(C.white, 0.1),
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: fade(C.white, 0.18),
  },
  demoText: { flex: 1, color: fade(C.white, 0.82), fontSize: 11.5, fontWeight: '700' },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl, gap: S.xxs },
  avatarWrap: { width: 210, height: 210, alignItems: 'center', justifyContent: 'center', marginBottom: S.xl },
  avatarGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85 },
  pulse: { position: 'absolute', borderWidth: 2 },
  name: { color: C.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  role: { color: fade(C.white, 0.6), fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  status: { color: fade(C.white, 0.74), fontSize: 20, fontWeight: '800', marginTop: S.xl, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  statusLive: { color: C.white, fontSize: 30, letterSpacing: -0.5 },
  hint: { color: fade(C.white, 0.42), fontSize: 12.5, fontWeight: '600', marginTop: S.xxs },

  controls: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.lg },
  controlCell: { alignItems: 'center', gap: 7, minWidth: 62 },
  control: { alignItems: 'center', justifyContent: 'center' },
  controlOutline: { borderWidth: 1.5, borderColor: fade(C.white, 0.24) },
  controlLabel: { color: fade(C.white, 0.66), fontSize: 11, fontWeight: '700', textAlign: 'center' },
  hangUp: { transform: [{ rotate: '135deg' }] },

  videoStage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  stageCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stagePlaceholder: { color: fade(C.white, 0.3), fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginTop: S.md, textAlign: 'center' },
  videoTop: { paddingHorizontal: S.lg },
  videoTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.xs },
  connPill: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.sm, height: 30, borderRadius: R.pill, backgroundColor: fade(C.navy, 0.55) },
  connDot: { width: 7, height: 7, borderRadius: 3.5 },
  connText: { color: fade(C.white, 0.85), fontSize: 12, fontWeight: '700' },
  durPill: { flexShrink: 1, paddingHorizontal: S.sm, height: 30, borderRadius: R.pill, backgroundColor: fade(C.navy, 0.55), alignItems: 'center', justifyContent: 'center' },
  durText: { color: C.white, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  videoName: { color: C.white, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: S.sm },

  selfTile: {
    alignSelf: 'flex-end',
    width: 96,
    height: 132,
    marginRight: S.lg,
    marginBottom: S.sm,
    borderRadius: R.md,
    backgroundColor: fade(C.navy, 0.82),
    borderWidth: 1,
    borderColor: fade(C.white, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadowLg,
  },
  selfGrip: { position: 'absolute', top: 7, width: 26, height: 3.5, borderRadius: 2, backgroundColor: fade(C.white, 0.3) },
  selfLabel: { color: fade(C.white, 0.7), fontSize: 11, fontWeight: '700' },
});
