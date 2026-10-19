import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Dialog, Header, PressableScale, Screen, T, tap, useToast } from '@/components/ui';
import { addDays, fmtDate, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { firstName, trainerById, weekdayOf } from '@/data/trainers';
import { C, R, fade } from '@/theme';

type CallKind = 'audio' | 'video';

const dayLabel = (date: string) => (date === todayKey() ? 'Today' : date === addDays(todayKey(), 1) ? 'Tomorrow' : weekdayOf(new Date(`${date}T12:00:00`)));

export default function RequestSessionScreen() {
  const { state, requestOneOnOneSession, addTrainerMsg } = useStore();
  const toast = useToast();
  const trainer = trainerById(state.trainerId);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(todayKey(), index)), []);
  const [date, setDate] = useState(dates[0]);
  const [time, setTime] = useState<string | null>(null);
  const [kind, setKind] = useState<CallKind>('video');
  const [topic, setTopic] = useState('One-to-one coaching session');
  const [confirming, setConfirming] = useState(false);
  const [openedAt] = useState(() => Date.now());

  const availableTimes = trainer.hours[weekdayOf(new Date(`${date}T12:00:00`))].filter((slot) => {
    const [hour, minute] = slot.split(':').map(Number);
    const slotAt = new Date(`${date}T12:00:00`);
    slotAt.setHours(hour, minute, 0, 0);
    return slotAt.getTime() > openedAt && !state.oneOnOneSessions.some((session) => session.trainerId === trainer.id && session.date === date && session.time === slot);
  });
  const canRequest = !!time && !!topic.trim();
  const selection = time ? `${dayLabel(date)}, ${fmtDate(date)} at ${time}` : '';

  const submit = () => {
    if (!time) return;
    requestOneOnOneSession({ trainerId: trainer.id, date, time, minutes: 30, kind, topic: topic.trim() });
    addTrainerMsg({ from: 'user', text: `Session request: ${topic.trim()} — ${selection} (${kind === 'video' ? 'video' : 'audio'}).`, status: 'sent' });
    addTrainerMsg({ from: 'trainer', text: `I received your request for ${selection}. I’ll confirm the one-to-one session here once I’ve checked my calendar.`, status: 'delivered' });
    setConfirming(false);
    toast('Request sent to your coach', 'calendar-outline');
    router.replace('/trainer');
  };

  return (
    <Screen>
      <Header title="Request a session" onBack={() => (router.canGoBack() ? router.back() : router.replace('/trainer'))} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.intro}>
            <View style={s.introIcon}><Ionicons name="calendar-outline" size={22} color={C.primaryDark} /></View>
            <View style={s.flex}>
              <Text style={T.h2}>Find time with {firstName(trainer)}</Text>
              <Text style={[T.small, s.introText]}>Choose a preferred available slot. Your coach confirms it before the session is booked.</Text>
            </View>
          </View>

          <Text style={s.label}>Preferred day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.days}>
            {dates.map((item) => {
              const selected = item === date;
              return (
                <PressableScale key={item} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${dayLabel(item)}, ${fmtDate(item)}`} onPress={() => { tap(); setDate(item); setTime(null); }} style={[s.day, selected && s.daySelected]}>
                  <Text style={[s.dayName, selected && s.dayTextSelected]}>{dayLabel(item)}</Text>
                  <Text style={[s.dayDate, selected && s.dayTextSelected]}>{fmtDate(item)}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>

          <Text style={s.label}>Available times</Text>
          <Card style={s.timesCard}>
            {availableTimes.length ? (
              <View style={s.timeGrid}>
                {availableTimes.map((slot) => {
                  const selected = slot === time;
                  return <PressableScale key={slot} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { tap(); setTime(slot); }} style={[s.time, selected && s.timeSelected]}><Text style={[s.timeText, selected && s.timeTextSelected]}>{slot}</Text></PressableScale>;
                })}
              </View>
            ) : <Text style={T.small}>No open slots for this day. Choose another available day.</Text>}
          </Card>

          <Text style={s.label}>Session format</Text>
          <View style={s.kindRow}>
            {(['video', 'audio'] as const).map((item) => {
              const selected = item === kind;
              return <PressableScale key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { tap(); setKind(item); }} style={[s.kind, selected && s.kindSelected]}><Ionicons name={item === 'video' ? 'videocam-outline' : 'call-outline'} size={19} color={selected ? C.primaryDark : C.muted} /><Text style={[s.kindText, selected && s.kindTextSelected]}>{item === 'video' ? 'Video call' : 'Audio call'}</Text></PressableScale>;
            })}
          </View>
          <Text style={s.help}>Your coach confirms the slot in your chat — and that is where the call starts at session time.</Text>

          <Text style={s.label}>What would you like to cover?</Text>
          <TextInput value={topic} onChangeText={setTopic} maxLength={100} placeholder="e.g. Form check and next-week plan" placeholderTextColor={C.muted} style={s.input} accessibilityLabel="Session topic" />
          <Button title="Request one-to-one session" icon="send-outline" disabled={!canRequest} onPress={() => setConfirming(true)} style={s.submit} />
        </ScrollView>
      </KeyboardAvoidingView>
      <Dialog visible={confirming} iconName="calendar-outline" title="Send this request?" text={`${selection} · 30 min ${kind} call\n\nYour coach will confirm before it is booked.`} confirm="Send request" cancel="Not yet" onConfirm={submit} onCancel={() => setConfirming(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: 16, paddingBottom: 36 }, intro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 8, marginBottom: 24 }, introIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }, introText: { marginTop: 4 }, label: { ...T.label, marginBottom: 9, marginTop: 20 }, days: { gap: 8, paddingRight: 16 }, day: { minWidth: 76, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center', borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border }, daySelected: { backgroundColor: C.primarySoft, borderColor: C.primary }, dayName: { fontSize: 12, fontWeight: '800', color: C.text }, dayDate: { fontSize: 11, color: C.muted, fontWeight: '700', marginTop: 3 }, dayTextSelected: { color: C.primaryDark }, timesCard: { padding: 12 }, timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, time: { minWidth: 76, height: 40, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card }, timeSelected: { backgroundColor: C.primaryDark, borderColor: C.primaryDark }, timeText: { fontSize: 13, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] }, timeTextSelected: { color: C.onPrimary }, kindRow: { flexDirection: 'row', gap: 10 }, kind: { flex: 1, minHeight: 54, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, kindSelected: { backgroundColor: fade(C.primary, 0.12), borderColor: C.primary }, kindText: { fontSize: 14, fontWeight: '700', color: C.textSoft }, kindTextSelected: { color: C.primaryDark }, help: { ...T.tiny, marginTop: 8, lineHeight: 16 }, input: { minHeight: 52, borderRadius: R.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, fontSize: 15, color: C.text }, submit: { marginTop: 26 },
});
