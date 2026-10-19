import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { WeekStrip } from '@/components/charts/Calendar';
import { LockBadge, LockedCard } from '@/components/premium/locked';
import { TrainerAvatar, AvailabilityLine } from '@/components/trainer/parts';
import { trainerById, weekdayOf, firstName as trainerFirstName } from '@/data/trainers';
import { planOnDay, planSummary } from '@/data/trainerPlans';
import { fmtNum } from '@/components/charts/Charts';
import { ChallengeCard } from '@/components/program/ChallengeCard';
import { HeaderAction, HeaderActions, TabHeader, TabHeaderText } from '@/components/TabHeader';
import { Button, Card, Chip, CountUp, Dialog, EmptyState, enter, IconButton, IconTile, layoutTransition, nativeOnly, PressableScale, Ring, Screen, SectionTitle, Sheet, Stepper, T, tap, useToast, type IconName } from '@/components/ui';
import { NOTIFICATIONS } from '@/data/notifications';
import { ACTIVITIES, WORKOUT_CATEGORIES, WORKOUTS } from '@/data/fitness';
import { BODY_PARTS, FOCUS_SESSIONS, programById, programDay, PROGRAM_DAYS, sessionStats, type Session } from '@/data/program';
import { proSession } from '@/data/proDemos';
import { kcalFromSteps, kmFromSteps } from '@/lib/calc';
import { burnedOn, useStore, weekProgress, workoutStreak, type WorkoutLog } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { useToday } from '@/lib/useToday';
import { C, G, ink, INK, MOTION, R, shadowSm } from '@/theme';
import { Glyph } from '@/components/Glyph';
import { FOCUS_PHOTO, logArt, sessionArt, WORKOUT_ART, WORKOUT_PHOTO } from '@/components/glyphs';

const SOURCE = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
type Focus = (typeof FOCUS_SESSIONS)[number];
type Cat = (typeof WORKOUT_CATEGORIES)[number];

/** Minutes shown on cards. Pro drops the exercises it has no real-athlete demonstration for,
 *  so its cards are measured from the filtered session rather than the authored subtitle. */
const focusMinutes = (s: Session, pro: boolean) => (pro ? sessionStats(proSession(s, true)).minutes : Number(/(\d+)\s*min/i.exec(s.subtitle)?.[1] ?? sessionStats(s).minutes));
const openSession = (key: string) => router.push({ pathname: '/program-day', params: { key } });
const PUSH = FOCUS_SESSIONS.filter((s) => s.equipment || s.level === 'Advanced' || s.level === 'Intermediate');

const listLayout = layoutTransition;
const rowIn = nativeOnly(FadeIn.duration(MOTION.base));
const rowOut = nativeOnly(FadeOut.duration(MOTION.fast));

export default function TrainingScreen() {
  const { state, targets, addSteps, logWorkout, removeWorkout, updateProfile, updateSettings, resetProgram } = useStore();
  const access = useAccess();
  const toast = useToast();
  const today = useToday();

  // Program / daily challenge
  const program = programById(state.profile.program);
  const done = state.programProgress[program.id] ?? 0;
  const finished = done >= PROGRAM_DAYS;
  const day = Math.min(PROGRAM_DAYS, done + 1);
  const session = programDay(program.id, day);
  const proDemos = access.can('trainer.demos');
  const stats = sessionStats(proSession(session, proDemos));
  const [askRestart, setAskRestart] = useState(false);
  const openChallenge = () => {
    if (finished) setAskRestart(true);
    else openSession(session.key);
  };

  // Header: collapses to a compact day row on scroll
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;

  // Weekly goal
  const streak = workoutStreak(state);
  const wp = weekProgress(state);
  const goal = state.profile.weeklyGoal || 3;
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(goal);
  const nudge = wp.done >= goal ? 'Goal crushed this week! Every extra session is a bonus.' : wp.done === 0 ? 'Fresh week, fresh start. One session gets the ball rolling.' : `Just ${goal - wp.done} more session${goal - wp.done === 1 ? '' : 's'} to close out your week.`;

  // Steps + today
  const steps = state.steps[today] ?? 0;
  const stepGoal = targets.stepGoal;
  const burned = burnedOn(state, today);
  const todays = state.workouts.filter((w) => w.date === today);
  const activeMin = todays.reduce((a, w) => a + w.minutes, 0);
  const [syncing, setSyncing] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
  }, []);
  const sync = () => {
    if (syncTimer.current) return; // a sync is already running
    setSyncing(true);
    syncTimer.current = setTimeout(() => {
      syncTimer.current = null;
      const n = 250 + Math.floor(Math.random() * 651);
      addSteps(n);
      setSyncing(false);
      toast(`Synced ${fmtNum(n)} steps from ${SOURCE}`, 'sync');
    }, 1200);
  };

  // Manual activity sheet
  const [logOpen, setLogOpen] = useState(false);
  const [actId, setActId] = useState(ACTIVITIES[0].id);
  const [mins, setMins] = useState(30);
  const act = ACTIVITIES.find((a) => a.id === actId) ?? ACTIVITIES[0];
  const actKcal = Math.round(act.kcalPerMin * mins);
  const adding = useRef(false);
  const openLog = () => {
    const last = state.settings.lastActivity;
    setActId(ACTIVITIES.some((a) => a.id === last.id) ? last.id : ACTIVITIES[0].id);
    setMins(last.mins > 0 ? last.mins : 30);
    adding.current = false;
    setLogOpen(true);
  };
  const addActivity = () => {
    if (adding.current) return;
    adding.current = true;
    logWorkout({ title: act.label, emoji: act.emoji, minutes: mins, kcal: actKcal });
    updateSettings({ lastActivity: { id: act.id, mins } });
    setLogOpen(false);
    toast(`${act.label} added · ${mins} min · ${actKcal} kcal`, 'flame');
  };
  const [del, setDel] = useState<WorkoutLog | null>(null);
  const openLogged = (w: WorkoutLog) => {
    if (w.sessionKey) openSession(w.sessionKey);
    else if (w.workoutId) router.push('/workout/' + w.workoutId);
  };

  // Body focus + guided classes
  const part = BODY_PARTS.includes(state.settings.trainingPart) ? state.settings.trainingPart : BODY_PARTS[0];
  const setPart = (p: string) => updateSettings({ trainingPart: p });
  const partList = FOCUS_SESSIONS.filter((s) => s.part === part);
  const cat: Cat = WORKOUT_CATEGORIES.find((c) => c === state.settings.trainingCat) ?? 'All';
  const setCat = (c: Cat) => updateSettings({ trainingCat: c });
  const classes = WORKOUTS.filter((w) => cat === 'All' || w.category === cat);
  const doneToday = new Set(todays.map((w) => w.workoutId).filter(Boolean));
  const goalHint: { icon: IconName; color: string; text: string } =
    goalDraft <= 2
      ? { icon: 'leaf', color: C.primary, text: 'An easy start — great for building the habit' }
      : goalDraft <= 4
        ? { icon: 'checkmark-circle', color: C.primary, text: 'Recommended for steady, sustainable progress' }
        : { icon: 'flame', color: C.accent, text: 'Ambitious! Remember to include rest days' };

  return (
    <Screen>
      <TabHeader
        scrollY={scrollY}
        eyebrow={finished ? `${program.title} · all 30 days done` : `${program.title} · day ${day} of 30`}
        title="Workout"
        compact={
          <>
            <LinearGradient colors={G.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.dayBadge}>
              {finished ? <Ionicons name="checkmark" size={20} color={C.white} /> : <Text style={st.dayBadgeText}>{day}</Text>}
            </LinearGradient>
            <TabHeaderText title={finished ? 'Program complete' : `Day ${day} of ${PROGRAM_DAYS}`} sub={`${program.title} · ${wp.done}/${goal} this week`} />
          </>
        }
        right={
          <HeaderActions>
            <HeaderAction icon="flame" color={C.accent} label={`Workout streak: ${streak}`} href="/history" count={streak} />
            <HeaderAction icon="notifications-outline" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} href="/notifications" badge={unread} />
          </HeaderActions>
        }
      />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Weekly goal */}
        <Animated.View entering={enter(0)} style={{ marginTop: 6 }}>
          <Card>
            <View style={st.goalHead}>
              <Ring size={62} stroke={7} value={wp.done / goal} color={C.primary} track={C.primarySoft}>
                <Text style={st.ringNum}>
                  {wp.done}
                  <Text style={st.ringOf}>/{goal}</Text>
                </Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={st.goalKicker}>THIS WEEK</Text>
                <Text style={st.goalTitle}>
                  {wp.done >= goal ? 'Goal reached' : `${goal - wp.done} to go`}
                </Text>
                <Text style={[T.small, { marginTop: 1 }]}>
                  <Text style={{ color: C.primary, fontWeight: '800' }}>{wp.done}</Text> of {goal} sessions done
                </Text>
              </View>
              <IconButton
                icon="pencil"
                size={16}
                bg={C.surfaceAlt}
                style={{ width: 36, height: 36 }}
                onPress={() => {
                  setGoalDraft(goal);
                  setGoalOpen(true);
                }}
              />
            </View>
            <View style={{ marginTop: 16 }}>
              <WeekStrip week={wp.week} days={wp.days} onPress={(k) => router.push({ pathname: '/history', params: { date: k } })} />
            </View>
            <View style={st.nudge}>
              <View style={st.nudgeIcon}>
                <Ionicons name={wp.done >= goal ? 'trophy' : wp.done === 0 ? 'sunny' : 'trending-up'} size={16} color={C.primaryDark} />
              </View>
              <View style={st.bubble}>
                <Text style={st.bubbleText}>{nudge}</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Daily challenge */}
        <Animated.View entering={enter(2)}>
          <SectionTitle title="Today's workout" action="Switch plan" onAction={() => router.push('/select-plan')} />
          <ChallengeCard
            title={program.title}
            bolts={program.bolts}
            colors={program.colors}
            day={finished ? PROGRAM_DAYS : day}
            done={done}
            stats={finished || session.restDay ? undefined : stats}
            note={finished ? 'All 30 days done. Legend!' : 'Rest day · stretch & recover'}
            emoji={finished ? '🏆' : session.emoji}
            art={finished ? undefined : sessionArt(session.key)}
            cta={finished ? 'Go again' : session.restDay ? 'Open rest day' : `Start Day ${day}`}
            ctaIcon={finished ? 'refresh' : session.restDay ? 'moon' : 'play'}
            onPress={openChallenge}
          />
        </Animated.View>

        {/* Your coach — the Pro surface, an upsell for everyone else */}
        <Animated.View entering={enter(3)}>
          <SectionTitle title="Your coach" />
          {access.can('trainer') ? <CoachCard trainerId={state.trainerId} restSeconds={state.settings.restSeconds} /> : <LockedCard lock={access.lock('trainer')!} />}
        </Animated.View>

        {/* Today */}
        <Animated.View entering={enter(3)}>
          <SectionTitle title="Your activity" action="Add activity" onAction={openLog} />
          <Card style={{ paddingVertical: 14 }}>
          <View style={st.stepsCard}>
            <Ring size={58} stroke={7} value={steps / stepGoal} color={C.steps} track={C.stepsSoft}>
              <Ionicons name="footsteps" size={20} color={C.steps} />
            </Ring>
            <View style={{ flex: 1 }}>
              <CountUp value={steps} format={fmtNum} style={st.stepsBig}>
                <Text style={st.stepsOf}> / {fmtNum(stepGoal)}</Text>
              </CountUp>
              <Text style={[T.small, { marginTop: 1 }]}>
                {kmFromSteps(steps)} km · {kcalFromSteps(steps)} kcal{steps >= stepGoal ? ' · Goal reached' : ''}
              </Text>
            </View>
            <Button title="Sync" icon="sync" small variant="secondary" loading={syncing} onPress={sync} style={{ minWidth: 86 }} />
          </View>
          <View style={st.summary}>
            <SumCol icon="flame" color={C.accent} bg={C.accentSoft} value={burned.total} format={fmtNum} label="kcal burned" />
            <View style={st.vDivider} />
            <SumCol icon="time" color={C.water} bg={C.waterSoft} value={activeMin} label="active min" />
            <View style={st.vDivider} />
            <SumCol icon="trophy" color={C.workout} bg={C.workoutSoft} value={todays.length} label="sessions" />
          </View>
          </Card>
          <Card style={{ marginTop: 10, paddingVertical: todays.length ? 6 : 0 }}>
            {todays.length === 0 ? (
              <EmptyState icon="walk" title="Nothing logged yet today" text="Did a walk, a badminton match or a gym session? Add it and we'll count the calories." action="Add activity" onAction={openLog} />
            ) : (
              todays.map((w, i) => {
                const linked = !!(w.sessionKey || w.workoutId);
                return (
                  <Animated.View key={w.id} entering={rowIn} exiting={rowOut} layout={listLayout}>
                    <Pressable onPress={() => linked && openLogged(w)} style={({ pressed }) => [st.actRow, i > 0 && st.actBorder, pressed && linked && st.rowPressed]}>
                      <View style={st.actEmoji}>
                        <Glyph emoji={w.emoji} src={logArt(w)} size={30} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.actTitle} numberOfLines={1}>
                          {w.title}
                        </Text>
                        <View style={st.metaRow}>
                          <Ionicons name="time-outline" size={13} color={C.muted} />
                          <Text style={st.metaText}>{w.minutes} min</Text>
                          <Ionicons name="flame" size={13} color={C.accent} style={{ marginLeft: 6 }} />
                          <Text style={[st.metaText, { color: C.accent }]}>{w.kcal} kcal</Text>
                        </View>
                      </View>
                      <IconButton icon="trash-outline" size={17} color={C.danger} bg={C.dangerSoft} style={{ width: 34, height: 34 }} onPress={() => setDel(w)} />
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </Card>
        </Animated.View>

        {/* Push your limits */}
        <Animated.View entering={enter(4)}>
          <SectionTitle title="Level up" />
          <Carousel items={PUSH} lockOf={access.lockFor} pro={proDemos} />
        </Animated.View>

        {/* Body focus */}
        <Animated.View entering={enter(5)}>
          <SectionTitle title="Target an area" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={st.chips}>
            {BODY_PARTS.map((p) => (
              <Chip key={p} label={p} selected={p === part} onPress={() => setPart(p)} />
            ))}
          </ScrollView>
          <Card style={{ paddingVertical: 6 }}>
            {partList.map((s, i) => {
              const lock = access.lockFor(s.key);
              return (
              <Animated.View key={s.key} entering={rowIn}>
                <Pressable
                  onPress={() => {
                    tap();
                    openSession(s.key);
                  }}
                  style={({ pressed }) => [st.focusRow, i > 0 && st.actBorder, pressed && st.rowPressed]}>
                  <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.focusTile}>
                    <Glyph emoji={s.emoji} src={sessionArt(s.key)} size={34} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={st.actTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    <View style={st.metaRow}>
                      <Text style={st.metaText}>
                        {s.level} · {focusMinutes(s, proDemos)} min
                      </Text>
                      {s.equipment && (
                        <>
                          <Ionicons name="barbell-outline" size={13} color={C.muted} style={{ marginLeft: 6 }} />
                          <Text style={st.metaText}>Equipment</Text>
                        </>
                      )}
                    </View>
                  </View>
                  {lock ? <LockBadge need={lock.need} /> : <Ionicons name="chevron-forward" size={18} color={C.muted} />}
                </Pressable>
              </Animated.View>
              );
            })}
          </Card>
        </Animated.View>

        {/* Guided classes */}
        <Animated.View entering={enter(6)}>
          <SectionTitle title="Train with a coach" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips} style={{ marginHorizontal: -16 }}>
            {WORKOUT_CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
          <View style={st.grid}>
            {classes.map((w) => {
              const lock = access.lockClass(w.level);
              const photo = WORKOUT_PHOTO[w.id];
              return (
              <Animated.View key={w.id} entering={rowIn} layout={listLayout} style={st.wCell}>
                <PressableScale
                  scaleTo={0.97}
                  accessibilityRole="button"
                  onPress={() => {
                    tap();
                    router.push('/workout/' + w.id);
                  }}
                  style={st.wCard}>
                  <View style={st.wHead}>
                    {photo ? (
                      <Image source={photo} style={st.wPhoto} contentFit="cover" transition={180} />
                    ) : (
                      <View style={[st.wPhoto, st.wArt, { backgroundColor: w.color + '17' }]}>
                        <Glyph emoji={w.emoji} src={WORKOUT_ART[w.id]} size={72} />
                      </View>
                    )}
                    <View style={st.wTime}>
                      <Ionicons name="time-outline" size={12} color={C.text} />
                      <Text style={st.wTimeText}>{w.minutes} min</Text>
                    </View>
                    {lock ? <LockBadge need={lock.need} style={st.wLock} /> : doneToday.has(w.id) ? (
                      <View style={st.wDone}>
                        <Ionicons name="checkmark" size={13} color={C.onPrimary} />
                      </View>
                    ) : null}
                  </View>
                  <View style={st.wBody}>
                    <Text style={st.wTitle} numberOfLines={2}>
                      {w.title}
                    </Text>
                    <View style={st.wFoot}>
                      <Ionicons name="flame" size={12} color={C.accent} />
                      <Text style={st.wMeta} numberOfLines={1}>
                        {w.kcal} kcal<Text style={st.wLevelText}> · {w.level}</Text>
                      </Text>
                    </View>
                    <Text style={st.wCoach} numberOfLines={1}>
                      {w.coach}
                    </Text>
                  </View>
                </PressableScale>
              </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Weekly goal sheet */}
      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Weekly goal">
        <Text style={T.body}>How many days a week do you want to work out?</Text>
        <View style={st.goalPick}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const on = n === goalDraft;
            return (
              <PressableScale
                key={n}
                scaleTo={0.9}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  setGoalDraft(n);
                }}
                style={[st.goalOpt, on && st.goalOptOn]}>
                <Text style={[st.goalOptText, on && { color: C.onPrimary }]}>{n}</Text>
              </PressableScale>
            );
          })}
        </View>
        <View style={st.goalHint}>
          <Ionicons name={goalHint.icon} size={16} color={goalHint.color} />
          <Text style={[T.small, { flex: 1, color: C.text }]}>{goalHint.text}</Text>
        </View>
        <Button
          title={`Set ${goalDraft} day${goalDraft === 1 ? '' : 's'} a week`}
          onPress={() => {
            updateProfile({ weeklyGoal: goalDraft });
            setGoalOpen(false);
            toast(`Weekly goal set to ${goalDraft} day${goalDraft === 1 ? '' : 's'} a week`, 'flag');
          }}
          style={{ marginTop: 18, marginBottom: 4 }}
        />
      </Sheet>

      {/* Log activity sheet */}
      <Sheet visible={logOpen} onClose={() => setLogOpen(false)} title="Log activity" scroll>
        <View style={st.actGrid}>
          {ACTIVITIES.map((a) => {
            const on = a.id === actId;
            return (
              <PressableScale
                key={a.id}
                scaleTo={0.92}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  setActId(a.id);
                }}
                style={st.actItem}>
                <View style={[st.actTile, on && st.actTileOn]}>
                  <Glyph emoji={a.emoji} size={34} />
                </View>
                <Text style={[st.actLabel, on && { color: C.primaryDark }]} numberOfLines={1}>
                  {a.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <View style={st.durRow}>
          <View>
            <Text style={T.label}>Duration</Text>
            <Text style={[T.small, { marginTop: 4 }]}>~{act.kcalPerMin} kcal / min</Text>
          </View>
          <Stepper value={mins} onChange={setMins} step={5} min={5} max={180} format={(v) => `${v} min`} />
        </View>
        <View style={st.kcalBox}>
          <View style={st.kcalEmoji}>
            <Glyph emoji={act.emoji} size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <CountUp value={actKcal} style={st.kcalBig}>
              <Text style={st.kcalUnit}> kcal</Text>
            </CountUp>
            <Text style={T.small}>
              {act.label} for {mins} minutes
            </Text>
          </View>
          <Ionicons name="flame" size={24} color={C.accent} />
        </View>
        <Button title="Add activity" icon="checkmark" onPress={addActivity} style={{ marginTop: 16, marginBottom: 4 }} />
      </Sheet>

      <Dialog
        visible={!!del}
        icon={del?.emoji}
        title="Remove this activity?"
        text={del ? `${del.title} · ${del.minutes} min · ${del.kcal} kcal will be removed from today's log.` : undefined}
        confirm="Remove"
        cancel="Cancel"
        danger
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (del) {
            removeWorkout(del.id);
            toast(`${del.title} removed`, 'trash');
          }
          setDel(null);
        }}
      />
      <Dialog
        visible={askRestart}
        icon="🔁"
        title={`Restart ${program.title}?`}
        text="Your 30-day progress for this plan resets to Day 1. Your workout history is kept."
        confirm="Restart"
        cancel="Cancel"
        onCancel={() => setAskRestart(false)}
        onConfirm={() => {
          resetProgram(program.id);
          setAskRestart(false);
          toast(`${program.title} restarted · Day 1 is ready`, 'refresh');
        }}
      />
    </Screen>
  );
}

/** Low-opacity concentric circles for gradient hero cards. */
function Deco({ size, style }: { size: number; style: ViewStyle }) {
  const c = size / 2;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={c} fill={C.white} opacity={0.08} />
        <Circle cx={c} cy={c} r={c * 0.62} fill="none" stroke={C.white} strokeOpacity={0.16} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={c * 0.3} fill={C.white} opacity={0.07} />
      </Svg>
    </View>
  );
}

/** Pro only: today's coach-written session, or a way into the coaching dashboard. */
function CoachCard({ trainerId, restSeconds }: { trainerId: string | null; restSeconds: number }) {
  const coach = trainerById(trainerId);
  const pro = useAccess().can('trainer.demos');
  const today = planOnDay(coach.id, weekdayOf());
  const stats = today ? planSummary(proSession(today, pro), restSeconds) : null;
  return (
    <Card onPress={() => router.push('/trainer')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TrainerAvatar trainer={coach} size={48} online />
      <View style={{ flex: 1 }}>
        <Text style={st.actTitle} numberOfLines={1}>
          {coach.name}
        </Text>
        <AvailabilityLine trainer={coach} style={{ marginTop: 2 }} />
        <Text style={[T.small, { marginTop: 4 }]} numberOfLines={1}>
          {today && stats ? `Today: ${today.title} · ${stats.minutes} min` : `No session today — ${trainerFirstName(coach)} scheduled a rest day`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Card>
  );
}

function Carousel({ items, lockOf, pro }: { items: Focus[]; lockOf: (key: string) => { need: 'smart' | 'pro' } | null; pro: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={st.carousel} decelerationRate="fast" snapToInterval={252}>
      {items.map((s) => {
        const lock = lockOf(s.key);
        const photo = FOCUS_PHOTO[s.key];
        return (
        <PressableScale
          key={s.key}
          scaleTo={0.97}
          accessibilityRole="button"
          onPress={() => {
            tap();
            openSession(s.key);
          }}
          style={[st.cShell, { backgroundColor: photo ? INK : s.colors[1] }]}>
          <LinearGradient colors={photo ? G.photo : s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cCard}>
            {photo ? (
              <>
                <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
                {/* Neutral black scrim behind the title, clearing to the athlete on the right */}
                <LinearGradient colors={[ink(0.78), ink(0.5), ink(0)]} locations={[0, 0.42, 0.78]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
              </>
            ) : (
              <>
                <Deco size={180} style={{ right: -50, bottom: -70 }} />
                <Glyph emoji={s.emoji} src={sessionArt(s.key)} size={72} style={st.cEmoji} />
              </>
            )}
            <Text style={st.cTitle} numberOfLines={2}>
              {s.title}
            </Text>
            <Text style={st.cSub}>
              {s.level} · {focusMinutes(s, pro)} min
            </Text>
            <View style={st.cStart}>
              <Ionicons name={lock ? 'lock-closed' : 'play'} size={11} color={s.colors[1]} />
              <Text style={[st.cStartText, { color: s.colors[1] }]}>{lock ? 'Unlock' : 'Start'}</Text>
            </View>
            {lock && <LockBadge need={lock.need} style={st.cLock} />}
          </LinearGradient>
        </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function SumCol({ icon, color, bg, value, label, format }: { icon: IconName; color: string; bg: string; value: number; label: string; format?: (n: number) => string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <IconTile icon={icon} color={color} bg={bg} size={32} />
      <View style={{ alignItems: 'center' }}>
        <CountUp value={value} format={format} style={st.sumValue} />
        <Text style={T.tiny}>{label}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  cLock: { position: 'absolute', top: 12, right: 12 },
  wLock: { position: 'absolute', top: 8, right: 8 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  dayBadge: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { color: C.white, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringNum: { fontSize: 17, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  ringOf: { fontSize: 12, fontWeight: '600', color: C.muted },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 10, borderRadius: R.md, backgroundColor: C.primarySoft },
  nudgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  goalKicker: { fontSize: 10.5, fontWeight: '800', color: C.muted, letterSpacing: 1.2 },
  goalTitle: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.4, marginTop: 1 },
  bubble: { flex: 1 },
  bubbleText: { fontSize: 13, fontWeight: '600', color: C.primaryDark, lineHeight: 18 },
  stepsCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepsBig: { fontSize: 20, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  stepsOf: { fontSize: 13, fontWeight: '600', color: C.muted, letterSpacing: 0 },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  sumValue: { fontSize: 18, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  vDivider: { width: StyleSheet.hairlineWidth * 2, height: 40, backgroundColor: C.borderSoft },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: R.sm },
  actBorder: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  rowPressed: { backgroundColor: C.surfaceAlt },
  actEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3, letterSpacing: -0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: C.textSoft, fontWeight: '500' },
  carousel: { gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
  cShell: { borderRadius: R.lg, overflow: 'hidden' },
  cCard: { width: 240, height: 150, borderRadius: R.lg, padding: 16, overflow: 'hidden' },
  cEmoji: { position: 'absolute', right: 12, bottom: 8 },
  cTitle: { color: C.white, fontSize: 18, fontWeight: '700', maxWidth: 160, lineHeight: 22, letterSpacing: -0.3 },
  cSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 4 },
  cStart: { position: 'absolute', left: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, height: 28 },
  cStartText: { fontSize: 12, fontWeight: '800' },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: R.sm },
  focusTile: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  wCell: { width: '48.3%' },
  wCard: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, overflow: 'hidden', ...shadowSm },
  // Photo header: a 1.14:1 crop so the card keeps the reference's portrait-leaning hero on every screen width.
  wHead: { width: '100%', aspectRatio: 1.14, backgroundColor: C.surfaceAlt },
  wPhoto: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  wArt: { alignItems: 'center', justifyContent: 'center' },
  wLevelText: { color: C.textSoft, fontWeight: '600' },
  wFoot: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },
  wBody: { paddingHorizontal: 12, paddingTop: 11, paddingBottom: 13 },
  wTime: { position: 'absolute', left: 9, bottom: 9, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: 9, height: 24, ...shadowSm },
  wTimeText: { fontSize: 11.5, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  wDone: { position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  wTitle: { fontSize: 15, fontWeight: '800', color: C.text, minHeight: 38, lineHeight: 19, letterSpacing: -0.2 },
  wMeta: { flex: 1, fontSize: 12, color: C.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  wCoach: { fontSize: 11.5, color: C.muted, fontWeight: '600', marginTop: 4 },
  goalPick: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  goalOpt: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  goalOptOn: { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
  goalOptText: { fontSize: 16, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  goalHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: C.surfaceAlt, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10 },
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  actItem: { width: '25%', alignItems: 'center', gap: 6 },
  actTile: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.borderSoft },
  actTileOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  actLabel: { fontSize: 12, fontWeight: '600', color: C.textSoft },
  durRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  kcalBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.accentSoft, borderRadius: R.md, padding: 14, marginTop: 18 },
  kcalEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  kcalBig: { fontSize: 22, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  kcalUnit: { fontSize: 14, fontWeight: '600', color: C.textSoft, letterSpacing: 0 },
});
