import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Glyph } from '@/components/Glyph';
import { sessionArt } from '@/components/glyphs';
import { AvailabilityLine, TrainerAction, TrainerAvatar, TrainerPlanCard, openPlan } from '@/components/trainer/parts';
import { Card, CountUp, Divider, Header, IconTile, Pill, PressableScale, ProgressBar, Screen, SectionTitle, T, enter, tap, type IconName } from '@/components/ui';
import { planOnDay, weekPlan, type TrainerPlan } from '@/data/trainerPlans';
import { WEEKDAYS, availability, bookedFor, firstName, trainerById, weekdayOf, type BookedSession, type Trainer } from '@/data/trainers';
import { useStore } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C, G, R, fade, shadow, shadowSm } from '@/theme';

const openChat = () => {
  tap();
  router.push('/trainer/chat');
};
const openCall = (mode: 'audio' | 'video') => router.push({ pathname: '/trainer/call', params: { mode } });

/** "Today" / "Tomorrow" / the weekday a booking lands on. */
const whenLabel = (inDays: number) => {
  if (inDays <= 0) return 'Today';
  if (inDays === 1) return 'Tomorrow';
  const d = new Date();
  d.setDate(d.getDate() + inDays);
  return weekdayOf(d);
};

export default function TrainerDashboardScreen() {
  const { state } = useStore();
  const access = useAccess();
  // The entitlement layer owns this decision; the cards below only receive the answer.
  const proDemos = access.can('trainer.demos');

  const trainer = trainerById(state.trainerId);
  const avail = availability(trainer);
  const today = weekdayOf();
  const todayPlan = planOnDay(trainer.id, today);
  const plans = weekPlan(trainer.id);
  const bookings = bookedFor(trainer.id);

  // A coach workout counts as done once any log carries its session key.
  const doneKeys = useMemo(() => new Set(state.workouts.flatMap((w) => (w.sessionKey ? [w.sessionKey] : []))), [state.workouts]);
  const coachLogs = useMemo(() => state.workouts.filter((w) => w.sessionKey?.startsWith('trainer:')), [state.workouts]);
  const coachMinutes = coachLogs.reduce((a, w) => a + w.minutes, 0);
  const coachKcal = coachLogs.reduce((a, w) => a + w.kcal, 0);
  const weekDone = plans.filter((p) => doneKeys.has(p.key)).length;

  const recent = state.trainerChat.slice(-2);
  const unread = state.trainerChat.filter((m) => m.from === 'trainer' && m.status !== 'read').length;

  return (
    <Screen>
      <Header title="Your coach" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <Animated.View entering={enter(0)}>
          <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.hero}>
            <View style={st.heroTop}>
              <TrainerAvatar trainer={trainer} size={68} online={avail.online} />
              <View style={{ flex: 1 }}>
                <Text style={st.heroEyebrow}>MY PERSONAL TRAINER</Text>
                <Text style={st.heroName} numberOfLines={1}>
                  {trainer.name}
                </Text>
                <Text style={st.heroRole} numberOfLines={2}>
                  {trainer.role}
                </Text>
              </View>
            </View>

            <View style={st.heroMeta}>
              <Ionicons name="star" size={13} color={C.gold} />
              <Text style={st.metaStrong}>{trainer.rating.toFixed(1)}</Text>
              <Text style={st.metaSoft}>({trainer.reviews})</Text>
              <View style={st.metaDot} />
              <Text style={st.metaSoft}>{trainer.years} yrs coaching</Text>
              <View style={st.metaDot} />
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.58)" />
              <Text style={st.metaSoft}>{trainer.city}</Text>
            </View>

            <View style={st.specs}>
              {trainer.specialities.map((sp) => (
                <Text key={sp} style={st.spec}>
                  {sp}
                </Text>
              ))}
            </View>

            <View style={st.heroFoot}>
              <AvailabilityLine trainer={trainer} style={st.availPill} />
              <View style={{ flex: 1 }} />
              <TrainerAction icon="chatbubble-ellipses" label="Message your trainer" color={trainer.color} onPress={openChat} />
              <TrainerAction icon="call" label="Audio session" color="rgba(255,255,255,0.16)" onPress={() => openCall('audio')} />
              <TrainerAction icon="videocam" label="Video session" color="rgba(255,255,255,0.16)" onPress={() => openCall('video')} />
            </View>
          </LinearGradient>
        </Animated.View>

        <SectionTitle title="Today's session" />
        <Animated.View entering={enter(1)}>
          {todayPlan ? (
            <TrainerPlanCard plan={todayPlan} pro={proDemos} trainer={trainer} restSeconds={state.settings.restSeconds} />
          ) : (
            <RestCard trainer={trainer} next={plans.find((p) => WEEKDAYS.indexOf(p.day) > WEEKDAYS.indexOf(today)) ?? plans[0]} />
          )}
        </Animated.View>

        <SectionTitle title="Your training week" />
        <Animated.View entering={enter(2)}>
          <Card style={st.weekCard}>
            {WEEKDAYS.map((d) => {
              const plan = plans.find((p) => p.day === d);
              return (
                <PressableScale
                  key={d}
                  scaleTo={0.94}
                  disabled={!plan}
                  accessibilityRole={plan ? 'button' : 'text'}
                  accessibilityLabel={plan ? `${d}: ${plan.title}` : `${d}: rest day`}
                  onPress={() => plan && openPlan(plan.key)}
                  style={[st.day, d === today && st.dayToday]}>
                  <Text style={[st.dayName, d === today && st.dayNameToday]}>{d}</Text>
                  <View style={[st.dayDisc, { backgroundColor: plan ? fade(plan.colors[1], 0.14) : C.surfaceAlt }]}>
                    {plan ? <Glyph emoji={plan.emoji} src={sessionArt(plan.key)} size={18} /> : <Ionicons name="moon-outline" size={14} color={C.muted} />}
                  </View>
                  <Text style={[st.dayFocus, !plan && { color: C.muted }]} numberOfLines={1}>
                    {plan ? plan.focus.split(' ')[0] : 'Rest'}
                  </Text>
                  {!!plan && doneKeys.has(plan.key) && (
                    <View style={st.dayCheck}>
                      <Ionicons name="checkmark" size={10} color={C.onPrimary} />
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </Card>
        </Animated.View>

        <SectionTitle title="Upcoming sessions" />
        <Animated.View entering={enter(3)}>
          <Card>
            {bookings.map((b, i) => (
              <Booking key={b.id} booking={b} first={i === 0} />
            ))}
            <Text style={st.demoNote}>Demo bookings for the Pro preview — nothing here is on a real calendar.</Text>
          </Card>
        </Animated.View>

        <SectionTitle title="Training progress" />
        <Animated.View entering={enter(4)}>
          <Card>
            <View style={st.stats}>
              <Stat icon="barbell" color={C.workout} bg={C.workoutSoft} value={coachLogs.length} label="Coach workouts" />
              <View style={st.vDivider} />
              <Stat icon="time" color={C.water} bg={C.waterSoft} value={coachMinutes} label="Minutes" />
              <View style={st.vDivider} />
              <Stat icon="flame" color={C.warning} bg={C.warningSoft} value={coachKcal} label="Kcal" />
            </View>
            <View style={st.weekWrap}>
              <View style={st.weekHead}>
                <Text style={st.weekLabel}>Plans {firstName(trainer)} scheduled</Text>
                <Text style={st.weekCount}>
                  {weekDone}/{plans.length}
                </Text>
              </View>
              <ProgressBar value={plans.length ? weekDone / plans.length : 0} color={trainer.color} />
            </View>
          </Card>
        </Animated.View>

        <SectionTitle title="Conversation" action="Open chat" onAction={openChat} />
        <Animated.View entering={enter(5)}>
          <Card onPress={openChat}>
            {recent.length ? (
              <>
                {recent.map((m, i) => (
                  <View key={m.id} style={[st.msgRow, i > 0 && st.rowBorder]}>
                    {m.from === 'trainer' ? <TrainerAvatar trainer={trainer} size={30} /> : <IconTile icon="person" size={30} radius={15} color={C.textSoft} bg={C.surfaceAlt} />}
                    <View style={{ flex: 1 }}>
                      <Text style={st.msgWho}>{m.from === 'trainer' ? firstName(trainer) : 'You'}</Text>
                      <Text style={st.msgText} numberOfLines={2}>
                        {m.text}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={st.msgFoot}>
                  {unread > 0 ? <Pill text={`${unread} unread`} /> : <Text style={st.msgHint}>Usually answers in about {trainer.replyMins} min</Text>}
                  <View style={{ flex: 1 }} />
                  <Text style={st.msgOpen}>Open chat</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.primary} />
                </View>
              </>
            ) : (
              <View style={st.msgRow}>
                <TrainerAvatar trainer={trainer} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={T.h3}>Say hello to {firstName(trainer)}</Text>
                  <Text style={[T.small, { marginTop: 3 }]}>Ask for a workout, flag a niggle, or tell them how much time you have today.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </View>
            )}
          </Card>
        </Animated.View>

        <SectionTitle title={`About ${firstName(trainer)}`} />
        <Animated.View entering={enter(6)}>
          <Card>
            <Text style={T.body}>{trainer.intro}</Text>
            <View style={st.langRow}>
              <Ionicons name="language-outline" size={14} color={C.muted} />
              <Text style={st.langText}>{trainer.languages.join(' · ')}</Text>
            </View>
            <Divider style={{ marginVertical: 14 }} />
            <Text style={T.label}>Certifications</Text>
            {trainer.certifications.map((c, i) => (
              <View key={c.title} style={[st.cert, i > 0 && st.rowBorder]}>
                <IconTile icon="ribbon" size={34} radius={12} color={trainer.color} bg={fade(trainer.color, 0.12)} />
                <View style={{ flex: 1 }}>
                  <Text style={st.certTitle}>{c.title}</Text>
                  <Text style={st.certBody}>
                    {c.body} · {c.year}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        <Text style={st.footNote}>Coach profiles, calls and messages in this preview are simulated, not a real person.</Text>
      </ScrollView>
    </Screen>
  );
}

function RestCard({ trainer, next }: { trainer: Trainer; next?: TrainerPlan }) {
  return (
    <Card style={st.restCard}>
      <IconTile icon="moon" size={44} radius={16} color={C.weight} bg={C.weightSoft} />
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>Rest day</Text>
        <Text style={[T.small, { marginTop: 3 }]}>
          {firstName(trainer)} hasn&apos;t scheduled a workout for today. Recovery is part of the plan{next ? ` — ${next.title} is next, on ${next.day}.` : '.'}
        </Text>
      </View>
    </Card>
  );
}

function Booking({ booking, first }: { booking: BookedSession; first: boolean }) {
  const video = booking.kind === 'video';
  return (
    <View style={[st.bookRow, !first && st.rowBorder]}>
      <View style={st.bookWhen}>
        <Text style={st.bookDay}>{whenLabel(booking.inDays)}</Text>
        <Text style={st.bookTime}>{booking.time}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.bookTopic} numberOfLines={2}>
          {booking.topic}
        </Text>
        <View style={st.bookMeta}>
          <Ionicons name={video ? 'videocam' : 'call'} size={12} color={C.muted} />
          <Text style={st.bookMetaText}>
            {video ? 'Video' : 'Audio'} · {booking.minutes} min
          </Text>
        </View>
      </View>
      <PressableScale
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={`Join ${booking.topic}`}
        onPress={() => {
          tap();
          openCall(booking.kind);
        }}
        style={st.join}>
        <Text style={st.joinText}>Join</Text>
      </PressableScale>
    </View>
  );
}

function Stat({ icon, color, bg, value, label }: { icon: IconName; color: string; bg: string; value: number; label: string }) {
  return (
    <View style={st.stat}>
      <IconTile icon={icon} color={color} bg={bg} size={32} radius={11} />
      <CountUp value={value} style={st.statValue} />
      <Text style={T.tiny} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  hero: { borderRadius: R.lg, padding: 16, overflow: 'hidden', ...shadow },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroEyebrow: { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heroName: { color: C.white, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  heroRole: { color: 'rgba(255,255,255,0.68)', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' },
  metaStrong: { color: C.white, fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metaSoft: { color: 'rgba(255,255,255,0.58)', fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  spec: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  availPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 11, height: 30, maxWidth: 150 },

  restCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  weekCard: { flexDirection: 'row', gap: 4, padding: 10 },
  day: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: 'transparent' },
  dayToday: { backgroundColor: C.primarySoft, borderColor: C.primaryTint },
  dayName: { fontSize: 10.5, fontWeight: '800', color: C.muted, letterSpacing: 0.3 },
  dayNameToday: { color: C.primaryDark },
  dayDisc: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayFocus: { fontSize: 10, fontWeight: '700', color: C.text },
  dayCheck: { position: 'absolute', top: 4, right: 3, width: 15, height: 15, borderRadius: 8, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  bookWhen: { width: 68 },
  bookDay: { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: -0.1 },
  bookTime: { fontSize: 12, fontWeight: '700', color: C.muted, fontVariant: ['tabular-nums'], marginTop: 1 },
  bookTopic: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 18 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  bookMetaText: { fontSize: 11.5, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  join: { height: 32, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: C.primaryBright, alignItems: 'center', justifyContent: 'center', ...shadowSm },
  joinText: { fontSize: 13, fontWeight: '800', color: C.onPrimary, letterSpacing: 0.2 },
  demoNote: { fontSize: 11, fontWeight: '600', color: C.muted, lineHeight: 16, marginTop: 10 },

  stats: { flexDirection: 'row', alignItems: 'flex-start' },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  vDivider: { width: StyleSheet.hairlineWidth * 2, height: 46, backgroundColor: C.borderSoft },
  weekWrap: { marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  weekHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  weekLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: C.text },
  weekCount: { fontSize: 13, fontWeight: '800', color: C.muted, fontVariant: ['tabular-nums'] },

  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  msgWho: { fontSize: 12, fontWeight: '800', color: C.text },
  msgText: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 2 },
  msgFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  msgHint: { fontSize: 12, fontWeight: '600', color: C.muted },
  msgOpen: { fontSize: 13, fontWeight: '800', color: C.primary },

  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  langText: { fontSize: 12, fontWeight: '700', color: C.muted },
  cert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, marginTop: 1 },
  certTitle: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 18 },
  certBody: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 2, fontVariant: ['tabular-nums'] },

  footNote: { fontSize: 11, fontWeight: '600', color: C.muted, lineHeight: 16, textAlign: 'center', marginTop: 22, paddingHorizontal: 12 },
});
