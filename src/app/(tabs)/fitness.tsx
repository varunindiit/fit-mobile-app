import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WeekStrip } from '@/components/charts/Calendar';
import { fmtNum } from '@/components/charts/Charts';
import { Bolts } from '@/components/program/PlanAccordion';
import { Button, Card, Chip, Dialog, EmptyState, Ring, Screen, Sheet, Stepper, T, tap, useToast } from '@/components/ui';
import { ACTIVITIES, WORKOUT_CATEGORIES, WORKOUTS } from '@/data/fitness';
import { BODY_PARTS, FOCUS_SESSIONS, programById, programDay, PROGRAM_DAYS, sessionStats, type Session } from '@/data/program';
import { kcalFromSteps, kmFromSteps, todayKey } from '@/lib/calc';
import { burnedOn, useStore, weekProgress, workoutStreak, type WorkoutLog } from '@/lib/store';
import { C, R, shadow } from '@/theme';

const SOURCE = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
type Focus = (typeof FOCUS_SESSIONS)[number];
type Cat = (typeof WORKOUT_CATEGORIES)[number];

/** Minutes shown on cards: the authored subtitle when it has one, else the estimate. */
const focusMinutes = (s: Session) => Number(/(\d+)\s*min/i.exec(s.subtitle)?.[1] ?? sessionStats(s).minutes);
const openSession = (key: string) => router.push({ pathname: '/program-day', params: { key } });
const PUSH = FOCUS_SESSIONS.filter((s) => !s.equipment && (s.level === 'Advanced' || s.level === 'Intermediate'));
const EQUIP = FOCUS_SESSIONS.filter((s) => s.equipment);

export default function TrainingScreen() {
  const { state, targets, addSteps, logWorkout, removeWorkout, updateProfile, resetProgram } = useStore();
  const toast = useToast();
  const today = todayKey();

  // Program / daily challenge
  const program = programById(state.profile.program);
  const done = state.programProgress[program.id] ?? 0;
  const finished = done >= PROGRAM_DAYS;
  const day = Math.min(PROGRAM_DAYS, done + 1);
  const session = programDay(program.id, day);
  const stats = sessionStats(session);
  const [askRestart, setAskRestart] = useState(false);

  // Weekly goal
  const streak = workoutStreak(state);
  const wp = weekProgress(state);
  const goal = state.profile.weeklyGoal || 3;
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(goal);
  const nudge = wp.done >= goal ? 'Weekly goal smashed! 🎉 Keep the momentum going.' : wp.done === 0 ? "Haven't exercised yet this week? Let's wake up those muscles!" : `${goal - wp.done} more workout${goal - wp.done === 1 ? '' : 's'} to hit your weekly goal 💪`;

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
    setSyncing(true);
    syncTimer.current = setTimeout(() => {
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
  const openLog = () => {
    setActId(ACTIVITIES[0].id);
    setMins(30);
    setLogOpen(true);
  };
  const addActivity = () => {
    logWorkout({ title: act.label, emoji: act.emoji, minutes: mins, kcal: actKcal, date: today });
    setLogOpen(false);
    toast(`${act.label} added · ${mins} min · ${actKcal} kcal`, 'flame');
  };
  const [del, setDel] = useState<WorkoutLog | null>(null);
  const openLogged = (w: WorkoutLog) => {
    if (w.sessionKey) openSession(w.sessionKey);
    else if (w.workoutId) router.push('/workout/' + w.workoutId);
  };

  // Body focus + guided classes
  const [part, setPart] = useState(BODY_PARTS[0]);
  const partList = FOCUS_SESSIONS.filter((s) => s.part === part);
  const [cat, setCat] = useState<Cat>('All');
  const classes = WORKOUTS.filter((w) => cat === 'All' || w.category === cat);
  const doneToday = new Set(todays.map((w) => w.workoutId).filter(Boolean));

  return (
    <Screen>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.top}>
          <Text style={st.title}>{`${program.title} in 30 Days`.toUpperCase()}</Text>
          <Pressable
            onPress={() => {
              tap();
              router.push('/history');
            }}
            style={({ pressed }) => [st.streak, pressed && { opacity: 0.8 }]}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={st.streakText}>{streak}</Text>
          </Pressable>
        </View>

        {/* Weekly goal */}
        <Card>
          <View style={st.rowBetween}>
            <Pressable
              hitSlop={8}
              onPress={() => {
                tap();
                setGoalDraft(goal);
                setGoalOpen(true);
              }}
              style={st.goalTitleRow}>
              <Text style={T.h3}>Weekly Goal</Text>
              <Ionicons name="pencil" size={15} color={C.textSoft} />
            </Pressable>
            <Text style={st.goalCount}>
              <Text style={{ color: C.primary }}>{wp.done}</Text>/{goal}
              <Text style={st.goalCountUnit}> workouts</Text>
            </Text>
          </View>
          <View style={{ marginTop: 14 }}>
            <WeekStrip week={wp.week} days={wp.days} onPress={(k) => router.push({ pathname: '/history', params: { date: k } })} />
          </View>
          <View style={st.nudge}>
            <View style={st.avatar}>
              <Text style={{ fontSize: 22 }}>🧔</Text>
            </View>
            <View style={st.bubble}>
              <Text style={st.bubbleText}>{nudge}</Text>
            </View>
          </View>
        </Card>

        {/* Daily challenge */}
        <View style={st.sectionRow}>
          <Text style={st.sectionTitle}>Daily Challenge</Text>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tap();
              router.push('/select-plan');
            }}
            style={st.optBtn}>
            <Ionicons name="options-outline" size={18} color={C.text} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            tap();
            if (finished) setAskRestart(true);
            else openSession(session.key);
          }}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.985 }] }]}>
          <LinearGradient colors={program.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.challenge}>
            <View style={st.deco1} />
            <View style={st.deco2} />
            <View style={{ flex: 1 }}>
              <View style={st.kickerRow}>
                <Text style={st.kicker}>{program.title}</Text>
                <Bolts n={program.bolts} />
              </View>
              <Text style={st.dayBig}>{finished ? 'Completed 🏆' : `Day ${day}`}</Text>
              <Text style={st.dayMeta}>{finished ? 'You finished all 30 days!' : session.restDay ? 'Rest day · recover & stretch' : `${stats.exercises} exercises · ${stats.minutes} min · ${stats.kcal} kcal`}</Text>
              <View style={st.daysRow}>
                <Text style={st.daysText}>
                  {done}/{PROGRAM_DAYS} Days
                </Text>
                <Text style={st.daysText}>{Math.round((done / PROGRAM_DAYS) * 100)}%</Text>
              </View>
              <View style={st.thinTrack}>
                <View style={[st.thinFill, { width: `${(done / PROGRAM_DAYS) * 100}%` }]} />
              </View>
              <View style={st.startPill}>
                <Text style={[st.startText, { color: program.colors[1] }]}>{finished ? 'RESTART' : 'START'}</Text>
              </View>
            </View>
            <Text style={st.challengeEmoji}>{finished ? '🏆' : session.emoji}</Text>
          </LinearGradient>
        </Pressable>

        {/* Today */}
        <View style={st.sectionRow}>
          <Text style={st.sectionTitle}>Today</Text>
          <Pressable hitSlop={10} onPress={openLog}>
            <Text style={st.sectionAction}>+ Log activity</Text>
          </Pressable>
        </View>
        <Card style={st.stepsCard}>
          <Ring size={60} stroke={7} value={steps / stepGoal} color={C.steps} track={C.stepsSoft}>
            <Ionicons name="footsteps" size={20} color={C.steps} />
          </Ring>
          <View style={{ flex: 1 }}>
            <Text style={st.stepsBig}>
              {fmtNum(steps)}
              <Text style={st.stepsOf}> / {fmtNum(stepGoal)} steps</Text>
            </Text>
            <Text style={T.small}>
              {kmFromSteps(steps)} km · {kcalFromSteps(steps)} kcal{steps >= stepGoal ? ' · Goal reached 🎉' : ''}
            </Text>
          </View>
          <Button title="Sync" icon="sync" small variant="secondary" loading={syncing} onPress={sync} style={{ minWidth: 86 }} />
        </Card>
        <Card style={st.summary}>
          <SumCol emoji="🔥" value={fmtNum(burned.total)} label="kcal burned" />
          <View style={st.vDivider} />
          <SumCol emoji="⏱️" value={String(activeMin)} label="active min" />
          <View style={st.vDivider} />
          <SumCol emoji="🏆" value={String(todays.length)} label="workouts" />
        </Card>
        <Card style={{ marginTop: 10, paddingVertical: todays.length ? 6 : 0 }}>
          {todays.length === 0 ? (
            <EmptyState emoji="🏃" title="No activity logged yet" text="Start today's challenge or log a walk, a badminton game or a gym session." action="Log activity" onAction={openLog} />
          ) : (
            todays.map((w, i) => {
              const linked = !!(w.sessionKey || w.workoutId);
              return (
                <Pressable key={w.id} onPress={() => linked && openLogged(w)} style={({ pressed }) => [st.actRow, i > 0 && st.actBorder, pressed && linked && { opacity: 0.7 }]}>
                  <View style={st.actEmoji}>
                    <Text style={{ fontSize: 22 }}>{w.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.actTitle} numberOfLines={1}>
                      {w.title}
                    </Text>
                    <Text style={T.small}>
                      {w.minutes} min · <Text style={{ color: C.accent, fontWeight: '700' }}>{w.kcal} kcal</Text>
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      tap();
                      setDel(w);
                    }}
                    style={st.trash}>
                    <Ionicons name="trash-outline" size={17} color={C.danger} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </Card>

        {/* Push your limits */}
        <Text style={[st.sectionTitle, st.sectionGap]}>Push Your Limits</Text>
        <Carousel items={PUSH} />

        {/* With equipment */}
        <Text style={[st.sectionTitle, st.sectionGap]}>With Equipment</Text>
        <Carousel items={EQUIP} />

        {/* Body focus */}
        <Text style={[st.sectionTitle, st.sectionGap]}>Body Focus</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={st.tabs}>
          {BODY_PARTS.map((p) => {
            const on = p === part;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  tap();
                  setPart(p);
                }}
                style={st.tab}>
                <Text style={[st.tabText, on && st.tabTextOn]}>{p}</Text>
                <View style={[st.tabLine, on && { backgroundColor: C.primary }]} />
              </Pressable>
            );
          })}
        </ScrollView>
        <Card style={{ paddingVertical: 4, marginTop: 10 }}>
          {partList.map((s, i) => (
            <Pressable
              key={s.key}
              onPress={() => {
                tap();
                openSession(s.key);
              }}
              style={({ pressed }) => [st.focusRow, i > 0 && st.actBorder, pressed && { opacity: 0.7 }]}>
              <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.focusTile}>
                <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={st.actTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={T.small}>
                  {s.level} · {focusMinutes(s)} min{s.equipment ? ' · 🏋️ Equipment' : ''}
                </Text>
              </View>
              <View style={st.roundArrow}>
                <Ionicons name="arrow-forward" size={16} color={C.primaryDark} />
              </View>
            </Pressable>
          ))}
        </Card>

        {/* Guided classes */}
        <Text style={[st.sectionTitle, st.sectionGap]}>Guided Classes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips} style={{ marginHorizontal: -16 }}>
          {WORKOUT_CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </ScrollView>
        <View style={st.grid}>
          {classes.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => {
                tap();
                router.push('/workout/' + w.id);
              }}
              style={({ pressed }) => [st.wCard, pressed && { transform: [{ scale: 0.97 }] }]}>
              <LinearGradient colors={[w.color + '38', w.color + '12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.wHead}>
                <Text style={{ fontSize: 42 }}>{w.emoji}</Text>
                <View style={st.wTime}>
                  <Ionicons name="time-outline" size={11} color={C.text} />
                  <Text style={st.wTimeText}>{w.minutes} min</Text>
                </View>
                {doneToday.has(w.id) && (
                  <View style={st.wDone}>
                    <Ionicons name="checkmark" size={13} color={C.white} />
                  </View>
                )}
              </LinearGradient>
              <View style={{ padding: 12, paddingTop: 10 }}>
                <Text style={st.wTitle} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={st.wMeta}>
                  🔥 {w.kcal} kcal · {w.level}
                </Text>
                <Text style={st.wCoach} numberOfLines={1}>
                  {w.coach}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Weekly goal sheet */}
      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title="Weekly goal">
        <Text style={T.body}>How many days a week do you want to work out?</Text>
        <View style={st.goalPick}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const on = n === goalDraft;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  tap();
                  setGoalDraft(n);
                }}
                style={[st.goalOpt, on && st.goalOptOn]}>
                <Text style={[st.goalOptText, on && { color: C.white }]}>{n}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[T.small, { textAlign: 'center', marginTop: 12 }]}>
          {goalDraft <= 2 ? '🌱 An easy start — great for building the habit' : goalDraft <= 4 ? '✅ Recommended for steady, sustainable progress' : '🔥 Ambitious! Remember to include rest days'}
        </Text>
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
              <Pressable
                key={a.id}
                onPress={() => {
                  tap();
                  setActId(a.id);
                }}
                style={st.actItem}>
                <View style={[st.actCircle, on && st.actCircleOn]}>
                  <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                </View>
                <Text style={[st.actLabel, on && { color: C.primaryDark }]} numberOfLines={1}>
                  {a.label}
                </Text>
              </Pressable>
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
          <Text style={{ fontSize: 26 }}>{act.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.kcalBig}>{actKcal} kcal</Text>
            <Text style={T.small}>
              {act.label} for {mins} minutes
            </Text>
          </View>
          <Ionicons name="flame" size={26} color={C.accent} />
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

function Carousel({ items }: { items: Focus[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={st.carousel} decelerationRate="fast" snapToInterval={252}>
      {items.map((s) => (
        <Pressable
          key={s.key}
          onPress={() => {
            tap();
            openSession(s.key);
          }}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
          <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cCard}>
            <View style={st.cDeco} />
            <Text style={st.cEmoji}>{s.emoji}</Text>
            <Text style={st.cTitle} numberOfLines={2}>
              {s.title}
            </Text>
            <Text style={st.cSub}>
              {s.level} · {focusMinutes(s)} Min
            </Text>
            <View style={st.cStart}>
              <Ionicons name="play" size={11} color={s.colors[1]} />
              <Text style={[st.cStartText, { color: s.colors[1] }]}>Start</Text>
            </View>
          </LinearGradient>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SumCol({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={st.sumValue}>
        <Text style={{ fontSize: 15 }}>{emoji} </Text>
        {value}
      </Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.2, lineHeight: 27 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, paddingHorizontal: 12, height: 38, borderRadius: R.pill, ...shadow },
  streakText: { fontSize: 16, fontWeight: '900', color: C.accent },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalCount: { fontSize: 18, fontWeight: '900', color: C.text },
  goalCountUnit: { fontSize: 12, fontWeight: '600', color: C.muted },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { flex: 1, backgroundColor: C.bg, borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleText: { fontSize: 13, fontWeight: '600', color: C.text, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: C.text, letterSpacing: -0.2 },
  sectionGap: { marginTop: 26, marginBottom: 12 },
  sectionAction: { fontSize: 14, fontWeight: '700', color: C.primary },
  optBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  challenge: { borderRadius: R.lg, padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', minHeight: 200 },
  deco1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.10)', right: -70, top: -60 },
  deco2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', right: 60, bottom: -60 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '800' },
  dayBig: { color: C.white, fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  dayMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginRight: 8 },
  daysText: { color: C.white, fontSize: 12, fontWeight: '800' },
  thinTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 6, marginRight: 8, overflow: 'hidden' },
  thinFill: { height: '100%', backgroundColor: C.white, borderRadius: 2 },
  startPill: { alignSelf: 'flex-start', backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 26, height: 40, justifyContent: 'center', marginTop: 16 },
  startText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  challengeEmoji: { fontSize: 76, marginLeft: 4 },
  stepsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  stepsBig: { fontSize: 18, fontWeight: '900', color: C.text },
  stepsOf: { fontSize: 13, fontWeight: '600', color: C.muted },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 12 },
  sumValue: { fontSize: 17, fontWeight: '900', color: C.text },
  vDivider: { width: 1, height: 28, backgroundColor: C.borderSoft },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  actBorder: { borderTopWidth: 1, borderTopColor: C.borderSoft },
  actEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  actTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  trash: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  carousel: { gap: 12, paddingHorizontal: 16 },
  cCard: { width: 240, height: 150, borderRadius: R.lg, padding: 16, overflow: 'hidden' },
  cDeco: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)', right: -40, bottom: -60 },
  cEmoji: { position: 'absolute', right: 12, bottom: 8, fontSize: 64 },
  cTitle: { color: C.white, fontSize: 18, fontWeight: '900', maxWidth: 160, lineHeight: 22 },
  cSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  cStart: { position: 'absolute', left: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, height: 28 },
  cStartText: { fontSize: 12, fontWeight: '900' },
  tabs: { paddingHorizontal: 16, gap: 22 },
  tab: { alignItems: 'center', paddingTop: 2 },
  tabText: { fontSize: 15, fontWeight: '700', color: C.muted },
  tabTextOn: { color: C.text, fontWeight: '900' },
  tabLine: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 6, backgroundColor: 'transparent' },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  focusTile: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roundArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  wCard: { width: '48.3%', backgroundColor: C.card, borderRadius: R.lg, ...shadow },
  wHead: { height: 96, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg },
  wTime: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 3 },
  wTimeText: { fontSize: 11, fontWeight: '800', color: C.text },
  wDone: { position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  wTitle: { fontSize: 14, fontWeight: '800', color: C.text, minHeight: 36, lineHeight: 18 },
  wMeta: { fontSize: 12, color: C.textSoft, fontWeight: '600', marginTop: 4 },
  wCoach: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 3 },
  goalPick: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  goalOpt: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  goalOptOn: { backgroundColor: C.primary, borderColor: C.primary },
  goalOptText: { fontSize: 16, fontWeight: '800', color: C.text },
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  actItem: { width: '25%', alignItems: 'center', gap: 6 },
  actCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  actCircleOn: { backgroundColor: C.primarySoft, borderColor: C.primary },
  actLabel: { fontSize: 12, fontWeight: '700', color: C.textSoft },
  durRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  kcalBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.accentSoft, borderRadius: R.md, padding: 14, marginTop: 18 },
  kcalBig: { fontSize: 22, fontWeight: '800', color: C.text },
});
