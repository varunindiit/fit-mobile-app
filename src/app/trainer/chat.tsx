import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { firstName, useKeyboardShown } from '@/components/profile/shared';
import { AvailabilityLine, TrainerAction, TrainerAvatar, TrainerPlanCard } from '@/components/trainer/parts';
import { Dialog, EASE_OUT, IconButton, layoutTransition, nativeOnly, PressableScale, Screen, T, tap, useToast, type IconName } from '@/components/ui';
import { QUICK_ASKS, seedConversation, trainerReply, type ReplyBubble } from '@/data/trainerChat';
import { trainerPlanByKey } from '@/data/trainerPlans';
import { availability, firstName as coachFirstName, trainerById } from '@/data/trainers';
import { fmtDate, todayKey } from '@/lib/calc';
import { useStore, type MsgStatus, type OneOnOneSession } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C, fade, MOTION, onFill, R } from '@/theme';

/** Delivery ticks under the member's own last message, mirroring what a messaging backend reports. */
const TICK: Record<MsgStatus, { icon: IconName; label: string }> = {
  sending: { icon: 'time-outline', label: 'Sending' },
  sent: { icon: 'checkmark', label: 'Sent' },
  delivered: { icon: 'checkmark-done', label: 'Delivered' },
  read: { icon: 'checkmark-done', label: 'Read' },
};

const clock = (at: number) => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const dayOf = (at: number) => new Date(at).toDateString();
const dayLabel = (at: number) => {
  const d = dayOf(at);
  const now = new Date();
  if (d === now.toDateString()) return 'TODAY';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d === y.toDateString()) return 'YESTERDAY';
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase();
};

const BUBBLE_IN = nativeOnly(FadeInDown.duration(MOTION.base).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 10 }] }));
const LIST = layoutTransition;
// Hide the browser focus ring on react-native-web.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;
/** How long the coach "checks the calendar" before answering a session request. */
const CONFIRM_DELAY = 1800;
const sessionWhen = (x: OneOnOneSession) => `${x.date === todayKey() ? 'today' : fmtDate(x.date)} at ${x.time}`;

export default function TrainerChatScreen() {
  const { state, hydrated, addTrainerMsg, setMsgStatus, markTrainerChatRead, clearTrainerChat, confirmOneOnOneSession } = useStore();
  const access = useAccess();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardShown();

  const trainer = trainerById(state.trainerId);
  const coach = coachFirstName(trainer);
  const me = firstName(state.profile.name);
  // Actions follow the brand green like every other screen; the trainer's own colour only tints their bubble.
  const accent = C.primaryDark;
  const online = availability(trainer).online;
  // The only source of truth for photo demonstrations — never hard-coded true.
  const proDemos = access.can('trainer.demos');
  const rest = state.settings.restSeconds;

  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const scroll = useRef<ScrollView>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Bubbles the coach owes but has not sent yet, so leaving mid-reply never loses an answer. */
  const pending = useRef<ReplyBubble[]>([]);
  const seeded = useRef(false);
  const addRef = useRef(addTrainerMsg);
  useEffect(() => {
    addRef.current = addTrainerMsg;
  }, [addTrainerMsg]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      // Timers die with the screen; land the rest of the reply in the store instead of dropping it.
      for (const b of pending.current) addRef.current({ from: 'trainer', text: b.text, status: 'delivered', planKey: b.planKey });
      pending.current = [];
    },
    [],
  );

  const chatLen = state.trainerChat.length;
  useEffect(() => {
    if (!hydrated || seeded.current) return;
    // Once per visit: a thread the member deliberately cleared stays empty until they write.
    seeded.current = true;
    if (chatLen === 0) for (const m of seedConversation(trainer.id, me)) addTrainerMsg(m);
    markTrainerChatRead();
  }, [hydrated, chatLen, trainer.id, me, addTrainerMsg, markTrainerChatRead]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  // A requested one-to-one is answered where it belongs: the coach confirms it in the thread,
  // and the call for it later starts from this same screen.
  const awaiting = state.oneOnOneSessions.find((x) => x.trainerId === trainer.id && x.status === 'requested');
  const answered = useRef(new Set<string>());
  useEffect(() => {
    if (!hydrated || !awaiting || answered.current.has(awaiting.id)) return;
    answered.current.add(awaiting.id);
    setTyping(true);
    timers.current.push(
      setTimeout(() => {
        setTyping(false);
        confirmOneOnOneSession(awaiting.id);
        addRef.current({
          from: 'trainer',
          text: `Confirmed — ${sessionWhen(awaiting)} for ${awaiting.topic}. I'll start the ${awaiting.kind} call right here in the chat, so keep it open at that time.`,
          status: 'read',
        });
      }, CONFIRM_DELAY),
    );
  }, [hydrated, awaiting, confirmOneOnOneSession]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    tap();
    setInput('');

    const id = addTrainerMsg({ from: 'user', text, status: 'sending' });
    later(240, () => setMsgStatus(id, 'sent'));
    later(700, () => setMsgStatus(id, 'delivered'));

    const bubbles = trainerReply(text, trainer.id, me);
    pending.current = [...bubbles];
    setTyping(true);
    let acc = 0;
    bubbles.forEach((b, i) => {
      acc += b.delay;
      // Read happens just before the coach starts answering, as it would in a real thread.
      if (i === 0) later(Math.max(760, acc - 300), () => setMsgStatus(id, 'read'));
      later(acc, () => {
        pending.current = pending.current.filter((x) => x !== b);
        addTrainerMsg({ from: 'trainer', text: b.text, status: 'read', planKey: b.planKey });
        setTyping(i < bubbles.length - 1);
      });
    });
  };

  const newConversation = () => {
    setConfirmClear(false);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pending.current = [];
    setTyping(false);
    clearTrainerChat();
    toast('Started a new conversation', 'chatbubbles');
  };

  const call = (mode: 'audio' | 'video') => router.push({ pathname: '/trainer/call', params: { mode } });

  const msgs = state.trainerChat;
  const lastMine = useMemo(() => msgs.filter((m) => m.from === 'user').at(-1)?.id, [msgs]);
  const coachBubble = { backgroundColor: fade(trainer.color, 0.08), borderColor: fade(trainer.color, 0.22) };
  const canSend = !!input.trim() && !typing;

  return (
    <Screen>
      {/* Header */}
      <View style={st.header}>
        <IconButton icon="arrow-back" bordered onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <View style={st.headMid}>
          <TrainerAvatar trainer={trainer} size={40} online={online} />
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>
              {trainer.name}
            </Text>
            {typing ? <Text style={[st.status, { color: accent }]}>typing…</Text> : <AvailabilityLine trainer={trainer} style={{ marginTop: 1 }} />}
          </View>
        </View>
        <TrainerAction icon="call" label={`Audio call ${coach}`} color={accent} onPress={() => call('audio')} />
        <TrainerAction icon="videocam" label={`Video call ${coach}`} color={accent} onPress={() => call('video')} />
      </View>

      {/* The conversation is scripted: say so where it cannot be missed, but keep it quiet. */}
      <View style={st.notice}>
        <Ionicons name="information-circle-outline" size={13} color={C.muted} />
        <Text style={st.noticeText} numberOfLines={2}>
          Your chat with {trainer.name} stays on this device
        </Text>
        <IconButton icon="refresh" size={16} bg={C.surfaceAlt} style={st.noticeBtn} onPress={() => setConfirmClear(true)} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={st.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {msgs.length === 0 && !typing && (
            <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.enter))} style={st.empty}>
              <TrainerAvatar trainer={trainer} size={68} />
              <Text style={st.emptyTitle}>Say hello to {coach}</Text>
              <Text style={st.emptyText}>
                Ask for a workout, say how a session felt, or flag an ache before you train.
              </Text>
            </Animated.View>
          )}

          {msgs.map((m, i) => {
            const plan = m.planKey ? trainerPlanByKey(m.planKey) : undefined;
            const newDay = i === 0 || dayOf(msgs[i - 1].at) !== dayOf(m.at);
            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <View style={st.dayPill}>
                    <Text style={st.dayText}>{dayLabel(m.at)}</Text>
                  </View>
                )}
                {m.from === 'user' ? (
                  <Animated.View entering={BUBBLE_IN} layout={LIST} style={st.mineWrap}>
                    <View style={[st.bubble, st.mine]}>
                      <Text style={st.mineText}>{m.text}</Text>
                    </View>
                    <View style={st.metaRow}>
                      <Text style={st.time}>{clock(m.at)}</Text>
                      {m.id === lastMine && (
                        <>
                          <Ionicons name={TICK[m.status].icon} size={13} color={m.status === 'read' ? accent : C.muted} />
                          <Text style={[st.time, m.status === 'read' && { color: accent }]}>{TICK[m.status].label}</Text>
                        </>
                      )}
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View entering={BUBBLE_IN} layout={LIST} style={st.coachRow}>
                    <TrainerAvatar trainer={trainer} size={28} />
                    <View style={st.coachCol}>
                      <View style={[st.bubble, st.coachBubble, coachBubble]}>
                        <Text style={st.coachText}>{m.text}</Text>
                      </View>
                      {!!plan && <TrainerPlanCard plan={plan} pro={proDemos} restSeconds={rest} style={st.plan} />}
                      <Text style={st.time}>{clock(m.at)}</Text>
                    </View>
                  </Animated.View>
                )}
              </React.Fragment>
            );
          })}

          {typing && (
            <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} exiting={nativeOnly(FadeOut.duration(MOTION.fast))} layout={LIST} style={st.coachRow}>
              <TrainerAvatar trainer={trainer} size={28} />
              <View style={[st.bubble, st.coachBubble, coachBubble, st.typingBubble]}>
                <TypingDots color={accent} />
              </View>
            </Animated.View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.chipsBar} contentContainerStyle={st.chips} keyboardShouldPersistTaps="handled">
          {QUICK_ASKS.map((s) => (
            <PressableScale
              key={s}
              scaleTo={0.95}
              onPress={() => send(s)}
              disabled={typing}
              style={[st.chip, { borderColor: fade(accent, 0.28), backgroundColor: fade(accent, 0.07) }, typing && { opacity: 0.5 }]}
              accessibilityRole="button">
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={accent} />
              <Text style={[st.chipText, { color: accent }]}>{s}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <View style={[st.inputBar, { paddingBottom: kb ? 10 : Math.max(insets.bottom, 10) }]}>
          <View style={[st.inputWrap, focused && { borderColor: accent, backgroundColor: C.card }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={`Message ${coach}…`}
              placeholderTextColor={C.muted}
              style={[st.input, webNoOutline]}
              returnKeyType="send"
              onSubmitEditing={() => send(input)}
              submitBehavior="submit"
              selectionColor={accent}
            />
          </View>
          <SendButton enabled={canSend} accent={accent} onPress={() => send(input)} />
        </View>
      </KeyboardAvoidingView>

      <Dialog
        visible={confirmClear}
        iconName="chatbubbles"
        title="Start a new conversation?"
        text={`This clears your conversation with ${trainer.name}.`}
        confirm="New conversation"
        cancel="Cancel"
        onConfirm={newConversation}
        onCancel={() => setConfirmClear(false)}
      />
    </Screen>
  );
}

/** Send button that fills with the trainer's accent once there is something to send. */
function SendButton({ enabled, accent, onPress }: { enabled: boolean; accent: string; onPress: () => void }) {
  const p = useSharedValue(enabled ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(enabled ? 1 : 0, { duration: MOTION.base }));
  }, [enabled, p]);
  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [C.border, accent]),
    transform: [{ scale: interpolate(p.get(), [0, 1], [0.92, 1]) }],
  }));
  return (
    <PressableScale scaleTo={0.9} onPress={onPress} disabled={!enabled} accessibilityRole="button" accessibilityLabel="Send" accessibilityState={{ disabled: !enabled }}>
      <Animated.View style={[st.send, fill]}>
        <Ionicons name="arrow-up" size={22} color={enabled ? onFill(accent) : C.muted} />
      </Animated.View>
    </PressableScale>
  );
}

const DOT_CYCLE = 940;

function TypingDots({ color }: { color: string }) {
  const reduce = useReducedMotion();
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} still={reduce} color={color} />
      ))}
    </View>
  );
}

function Dot({ index, still, color }: { index: number; still: boolean; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) {
      v.set(0.5);
      return;
    }
    const lead = index * 150;
    v.set(
      withRepeat(
        withSequence(withTiming(0, { duration: lead }), withTiming(1, { duration: 260 }), withTiming(0, { duration: 260 }), withTiming(0, { duration: DOT_CYCLE - 520 - lead })),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(v);
  }, [index, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: interpolate(v.get(), [0, 1], [0.35, 1]), transform: [{ translateY: interpolate(v.get(), [0, 1], [0, -4]) }] }));
  return <Animated.View style={[st.dot, { backgroundColor: color }, style]} />;
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: C.borderSoft },
  headMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  noticeText: { flex: 1, fontSize: 11, color: C.muted, fontWeight: '600', lineHeight: 15 },
  noticeBtn: { width: 28, height: 28, borderRadius: 14 },
  list: { padding: 16, gap: 12 },
  dayPill: { alignSelf: 'center', backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  dayText: { ...T.tiny, textAlign: 'center', letterSpacing: 0.8 },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '86%' },
  mine: { backgroundColor: C.primaryDark, borderBottomRightRadius: 6 },
  mineText: { color: C.onPrimary, fontSize: 15, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingRight: 2 },
  time: { fontSize: 11, color: C.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  coachRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  coachCol: { flex: 1, alignItems: 'flex-start', gap: 4 },
  coachBubble: { borderBottomLeftRadius: 6, borderWidth: 1, maxWidth: '96%' },
  coachText: { color: C.text, fontSize: 15, lineHeight: 21 },
  typingBubble: { paddingVertical: 14 },
  plan: { alignSelf: 'stretch', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginTop: 2 },
  emptyText: { fontSize: 13, color: C.textSoft, lineHeight: 19, textAlign: 'center' },
  chipsBar: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft, backgroundColor: C.card },
  chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: R.pill, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, backgroundColor: C.card },
  inputWrap: { flex: 1, height: 48, borderRadius: 24, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  input: { flex: 1, paddingHorizontal: 18, fontSize: 15, color: C.text },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
