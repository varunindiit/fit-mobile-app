import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, IconButton, MacroBar, ProgressBar, Ring, Screen, SectionTitle, Sheet, T, tap, useToast } from '@/components/ui';
import { foodById, MEALS } from '@/data/foods';
import { NOTIFICATIONS } from '@/data/notifications';
import { PLAN_TIERS } from '@/data/plans';
import { programById, programDay, sessionStats } from '@/data/program';
import { Bolts } from '@/components/program/PlanAccordion';
import { fmtDate, kmFromSteps, todayKey } from '@/lib/calc';
import { burnedOn, dayTotals, useStore, weekProgress, workoutStreak } from '@/lib/store';
import { C, R, shadow } from '@/theme';

const TIPS = [
  { emoji: '🥜', title: 'Protein at every meal', short: 'Keeps you fuller for longer', body: 'Add a protein source to each meal: dal, paneer, curd, eggs, sprouts or chicken. Protein keeps you full, protects muscle while you lose fat and reduces evening cravings.' },
  { emoji: '🍚', title: 'The ½ plate rule', short: 'Veggies first, then roti/rice', body: 'Fill half your plate with sabzi and salad, a quarter with protein and a quarter with roti or rice. You eat the same volume of food with far fewer calories.' },
  { emoji: '🚶', title: '10-minute post-meal walk', short: 'Helps control blood sugar', body: 'A short walk after lunch and dinner improves digestion and blunts blood-sugar spikes. It also adds roughly 1,000 steps to your day.' },
  { emoji: '😴', title: 'Sleep 7–8 hours', short: 'Poor sleep increases hunger', body: 'Short sleep raises hunger hormones and makes you crave sugary, high-calorie food. A consistent bedtime is one of the easiest weight-loss wins.' },
];

export default function Home() {
  const { state, targets, setWater, addSteps } = useStore();
  const toast = useToast();
  const [tip, setTip] = useState<(typeof TIPS)[number] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const today = todayKey();
  const p = state.profile;
  const first = p.name.split(' ')[0] || 'there';

  const { total, byMeal } = useMemo(() => dayTotals(state.entries, today), [state.entries, today]);
  const burned = burnedOn(state, today);
  const eaten = Math.round(total.kcal);
  const left = targets.budget - eaten + burned.total;
  const over = left < 0;
  const water = state.water[today] ?? 0;
  const steps = state.steps[today] ?? 0;
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const tracksWeight = p.goal !== 'maintain' && p.goal !== 'healthy';
  const start = p.startWeightKg || p.weightKg;
  const weightProgress = tracksWeight ? Math.abs(start - p.weightKg) / Math.max(0.1, Math.abs(start - p.targetKg)) : 1;
  const proteinGap = Math.max(0, targets.protein - total.protein);
  const premiumTier = state.premium ? PLAN_TIERS.find((x) => x.id === state.premium!.tier) : null;
  const todaysWorkout = state.workouts.find((w) => w.date === today);
  const streak = workoutStreak(state);
  const program = programById(p.program);
  const doneDays = state.programProgress[program.id] ?? 0;
  const nextDay = Math.min(30, doneDays + 1);
  const nextSession = programDay(program.id, nextDay);
  const nextStats = sessionStats(nextSession, state.settings.restSeconds);
  const doneToday = state.workouts.some((w) => w.date === today && w.sessionKey?.startsWith(`program:${program.id}:`));
  const wk = weekProgress(state);
  const openDay = () => router.push({ pathname: '/program-day', params: { key: nextSession.key } });

  const sync = () => {
    setSyncing(true);
    setTimeout(() => {
      const n = 300 + Math.round(Math.random() * 600);
      addSteps(n);
      setSyncing(false);
      toast(`Synced ${n.toLocaleString('en-IN')} new steps`, 'footsteps');
    }, 1100);
  };

  const ria = proteinGap > 25
    ? `You're ${Math.round(proteinGap)} g short on protein today. A bowl of sprouts salad or 2 boiled eggs at your next meal would close the gap.`
    : left > 600
      ? `You have ${left.toLocaleString('en-IN')} kcal left. Plan a balanced dinner: 2 rotis, dal and a big bowl of sabzi fits perfectly.`
      : over
        ? `You're ${Math.abs(left)} kcal over budget. A 30-minute brisk walk burns about 140 kcal — want to try one?`
        : `Great balance today, ${first}! Keep your water up — ${Math.max(0, targets.water - water)} more glasses to go.`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.header}>
          <Pressable onPress={() => router.push('/profile')} style={st.avatar} hitSlop={6}>
            <Text style={st.avatarText}>{(first[0] ?? 'F').toUpperCase()}</Text>
            {premiumTier && (
              <View style={st.crown}>
                <Text style={{ fontSize: 10 }}>👑</Text>
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={T.small} numberOfLines={1}>
              {greet} · {fmtDate(today)}
            </Text>
            <Text style={st.hello} numberOfLines={1}>
              Hi, {first} 👋
            </Text>
          </View>
          <Pressable onPress={() => { tap(); router.push('/history'); }} style={st.streak} hitSlop={6}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={st.streakText}>{streak}</Text>
          </Pressable>
          <IconButton icon="notifications-outline" badge={unread} onPress={() => router.push('/notifications')} />
        </View>

        {/* Calorie budget */}
        <Card onPress={() => router.push('/diary')} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={T.h3}>Calorie budget</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Diary</Text>
              <Ionicons name="chevron-forward" size={16} color={C.primary} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
            <Ring size={136} stroke={13} value={eaten / (targets.budget + burned.total)} color={over ? C.danger : C.primary}>
              <Text style={[st.ringNum, over && { color: C.danger }]}>{Math.abs(left).toLocaleString('en-IN')}</Text>
              <Text style={T.tiny}>{over ? 'KCAL OVER' : 'KCAL LEFT'}</Text>
            </Ring>
            <View style={{ flex: 1, marginLeft: 20, gap: 12 }}>
              <Stat icon="restaurant" color={C.primary} label="Eaten" value={eaten} />
              <Stat icon="flame" color={C.accent} label="Burned" value={burned.total} />
              <Stat icon="flag" color={C.textSoft} label="Budget" value={targets.budget} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
            <MacroBar label="Carbs" value={total.carbs} target={targets.carbs} color={C.carbs} />
            <MacroBar label="Protein" value={total.protein} target={targets.protein} color={C.protein} />
            <MacroBar label="Fat" value={total.fat} target={targets.fat} color={C.fat} />
            <MacroBar label="Fiber" value={total.fiber} target={targets.fiber} color={C.fiber} />
          </View>
        </Card>

        {/* Snap CTA */}
        <Pressable onPress={() => { tap(); router.push('/snap'); }}>
          <LinearGradient colors={['#FF7A59', '#FF4D6D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.snap}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 17 }}>Snap your plate 📸</Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13 }}>Instant calories & macros with AI</Text>
            </View>
            <View style={st.snapBtn}>
              <Ionicons name="camera" size={24} color="#FF4D6D" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Daily challenge (30-day program) */}
        <SectionTitle title="Daily challenge" action="Change plan" onAction={() => router.push('/select-plan')} />
        <Pressable onPress={() => { tap(); openDay(); }}>
          <LinearGradient colors={program.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.challenge}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={st.challengeLabel}>{program.title}</Text>
                <Bolts n={program.bolts} />
              </View>
              <Text style={st.challengeDay}>{doneToday ? `Day ${doneDays} ✓` : `Day ${nextDay}`}</Text>
              <Text style={st.challengeMeta}>
                {doneToday ? 'Done for today — great work!' : nextSession.restDay ? 'Rest & recovery day' : `${nextStats.exercises} exercises · ${nextStats.minutes} min · ~${nextStats.kcal} kcal`}
              </Text>
              <View style={st.challengeTrack}>
                <View style={[st.challengeFill, { width: `${(doneDays / 30) * 100}%` }]} />
              </View>
              <Text style={st.challengeMeta}>
                {doneDays}/30 days · this week {wk.done}/{p.weeklyGoal} workouts
              </Text>
            </View>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 54 }}>{program.emoji}</Text>
              <View style={st.challengeBtn}>
                <Text style={[st.challengeBtnText, { color: program.colors[1] }]}>{doneToday ? 'VIEW' : 'START'}</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Meals */}
        <SectionTitle title="Today's meals" action="View diary" onAction={() => router.push('/diary')} />
        <Card style={{ paddingVertical: 4 }}>
          {MEALS.map((m, i) => {
            const kcal = Math.round(byMeal[m.key]?.kcal ?? 0);
            const rec = Math.round(targets.budget * m.share);
            const names = state.entries.filter((e) => e.date === today && e.meal === m.key).map((e) => foodById(e.foodId)?.name).filter(Boolean);
            return (
              <Pressable key={m.key} onPress={() => router.push('/diary')} style={[st.meal, i < MEALS.length - 1 && st.mealBorder]}>
                <View style={[st.mealIcon, kcal > 0 && { backgroundColor: C.primarySoft }]}>
                  <Ionicons name={m.icon as any} size={20} color={kcal > 0 ? C.primaryDark : C.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{m.label}</Text>
                  <Text style={[T.small, { marginTop: 2 }]} numberOfLines={1}>
                    {names.length ? names.join(', ') : `Recommended ${Math.round(rec * 0.9)}–${Math.round(rec * 1.1)} kcal`}
                  </Text>
                </View>
                {kcal > 0 && (
                  <Text style={{ fontWeight: '800', color: C.text, marginRight: 10 }}>
                    {kcal}
                    <Text style={{ color: C.muted, fontWeight: '500', fontSize: 12 }}> kcal</Text>
                  </Text>
                )}
                <IconButton icon="add" size={20} bg={C.primary} color={C.white} style={{ width: 34, height: 34 }} onPress={() => router.push({ pathname: '/food-search', params: { meal: m.key } })} />
              </Pressable>
            );
          })}
        </Card>

        {/* Water */}
        <SectionTitle title="Water" />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[T.h2, { color: C.water }]}>
                {water}
                <Text style={{ fontSize: 15, color: C.muted }}> / {targets.water} glasses</Text>
              </Text>
              <Text style={T.small}>{(water * 250).toLocaleString('en-IN')} ml of {targets.water * 250} ml</Text>
            </View>
            <IconButton icon="remove" bg={C.waterSoft} color={C.water} onPress={() => setWater(water - 1)} />
            <IconButton
              icon="add"
              bg={C.water}
              color={C.white}
              style={{ marginLeft: 10 }}
              onPress={() => {
                setWater(water + 1);
                if (water + 1 === targets.water) toast('Water goal reached! 💧', 'trophy');
              }}
            />
          </View>
          <View style={st.glasses}>
            {Array.from({ length: Math.max(targets.water, water) }).map((_, i) => (
              <Pressable key={i} hitSlop={4} onPress={() => { tap(); setWater(i + 1 === water ? i : i + 1); }}>
                <Ionicons name={i < water ? 'water' : 'water-outline'} size={28} color={i < water ? C.water : C.border} />
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Steps & workout */}
        <SectionTitle title="Activity" action="See all" onAction={() => router.push('/fitness')} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1 }} onPress={() => router.push('/fitness')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="footsteps" size={16} color={C.steps} />
              <Text style={st.tileLabel}>Steps</Text>
            </View>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <Ring size={92} stroke={9} value={steps / targets.stepGoal} color={C.steps} track={C.stepsSoft}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.text }}>{steps.toLocaleString('en-IN')}</Text>
                <Text style={T.tiny}>/ {(targets.stepGoal / 1000).toFixed(0)}k</Text>
              </Ring>
            </View>
            <Text style={[T.small, { textAlign: 'center', marginTop: 8 }]}>{kmFromSteps(steps)} km · {Math.round(steps * 0.04)} kcal</Text>
            <Button title="Sync" small variant="outline" icon="sync" loading={syncing} onPress={sync} style={{ marginTop: 10, height: 36 }} />
          </Card>
          <Card style={{ flex: 1 }} onPress={() => router.push('/fitness')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="barbell" size={16} color={C.workout} />
              <Text style={st.tileLabel}>Workout</Text>
            </View>
            <Text style={[T.h2, { marginTop: 12 }]}>
              {burned.workoutKcal}
              <Text style={{ fontSize: 14, color: C.muted }}> kcal</Text>
            </Text>
            <Text style={T.small}>burned in workouts</Text>
            <View style={st.workoutPill}>
              <Text style={{ fontSize: 20 }}>{todaysWorkout?.emoji ?? '🔥'}</Text>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: C.text }} numberOfLines={2}>
                {todaysWorkout ? todaysWorkout.title : `${program.title} · Day ${nextDay}`}
              </Text>
            </View>
            <Button title={todaysWorkout ? 'Log more' : 'Start'} small variant="secondary" onPress={() => (todaysWorkout ? router.push('/fitness') : openDay())} style={{ marginTop: 10, height: 36 }} />
          </Card>
        </View>

        {/* Weight */}
        <SectionTitle title="Weight" action="Progress" onAction={() => router.push('/progress')} />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={T.small}>Current</Text>
              <Text style={T.h2}>
                {p.weightKg.toFixed(1)}
                <Text style={{ fontSize: 14, color: C.muted }}> kg</Text>
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={T.small}>{tracksWeight ? 'Goal' : 'Maintain'}</Text>
              <Text style={[T.h3, { color: C.weight }]}>{(tracksWeight ? p.targetKg : p.weightKg).toFixed(1)} kg</Text>
            </View>
          </View>
          <ProgressBar value={weightProgress} color={C.weight} style={{ marginTop: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[T.small, { flex: 1 }]}>
              {tracksWeight
                ? `${Math.abs(start - p.weightKg).toFixed(1)} kg ${p.goal === 'lose' ? 'lost' : 'gained'} · ${Math.abs(p.weightKg - p.targetKg).toFixed(1)} kg to go`
                : 'Keep logging weekly to stay on track'}
            </Text>
            <Button title="Log weight" small icon="add" onPress={() => router.push({ pathname: '/progress', params: { log: String(Date.now()) } })} />
          </View>
        </Card>

        {/* Ria insight */}
        <Card onPress={() => router.push('/coach')} style={{ marginTop: 16, backgroundColor: '#FFFBEB' }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={st.ria}>
              <Ionicons name="sparkles" size={20} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: '#92400E' }}>Ria's insight</Text>
              <Text style={[T.small, { marginTop: 4, lineHeight: 19, color: '#78350F' }]}>{ria}</Text>
              <Text style={{ color: '#B45309', fontWeight: '700', marginTop: 8, fontSize: 13 }}>Chat with Ria →</Text>
            </View>
          </View>
        </Card>

        {/* Premium */}
        <Pressable onPress={() => { tap(); router.push(premiumTier ? '/coach' : '/plans'); }} style={{ marginTop: 16 }}>
          <LinearGradient colors={['#141B34', '#3B2A7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.premium}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.gold, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{premiumTier ? 'ACTIVE PLAN' : 'FITORA PRO'}</Text>
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 18, marginTop: 6 }}>
                {premiumTier ? `You're on ${premiumTier.name}` : 'Get a personal nutritionist & trainer'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 4, fontSize: 13 }}>
                {premiumTier ? 'Ask your coach anything, anytime' : 'Custom plans · weekly check-ins · up to 40% off'}
              </Text>
              <View style={st.premiumBtn}>
                <Text style={{ fontWeight: '800', color: C.navy }}>{premiumTier ? 'Talk to coach' : 'Explore plans'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 64 }}>{premiumTier ? '👑' : '🧑‍⚕️'}</Text>
          </LinearGradient>
        </Pressable>

        {/* Tips */}
        <SectionTitle title="Tips for you" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginHorizontal: -16, paddingLeft: 16 }}>
          {TIPS.map((x) => (
            <Card key={x.title} onPress={() => setTip(x)} style={st.tip}>
              <Text style={{ fontSize: 30 }}>{x.emoji}</Text>
              <Text style={[T.h3, { fontSize: 15, marginTop: 10 }]}>{x.title}</Text>
              <Text style={[T.small, { marginTop: 4 }]}>{x.short}</Text>
            </Card>
          ))}
        </ScrollView>
      </ScrollView>

      <Sheet visible={!!tip} onClose={() => setTip(null)} title={tip?.title}>
        <Text style={{ fontSize: 54, textAlign: 'center' }}>{tip?.emoji}</Text>
        <Text style={[T.body, { marginTop: 14 }]}>{tip?.body}</Text>
        <Button title="Ask Ria about this" variant="secondary" icon="sparkles" style={{ marginTop: 20 }} onPress={() => { setTip(null); setTimeout(() => router.push('/coach'), 250); }} />
      </Sheet>
    </Screen>
  );
}

function Stat({ icon, color, label, value }: { icon: any; color: string; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[st.statIcon, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View>
        <Text style={T.tiny}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>
          {Math.round(value).toLocaleString('en-IN')}
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500' }}> kcal</Text>
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 18 },
  crown: { position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  hello: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  ringNum: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  snap: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 18, marginTop: 16 },
  snapBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  mealBorder: { borderBottomWidth: 1, borderBottomColor: C.borderSoft },
  mealIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'space-between' },
  tileLabel: { fontWeight: '700', color: C.textSoft, fontSize: 13 },
  workoutPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.workoutSoft, borderRadius: 12, padding: 8, marginTop: 12 },
  ria: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  premium: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 18, ...shadow },
  premiumBtn: { backgroundColor: C.gold, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 12 },
  tip: { width: 170 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FFF1E6', paddingHorizontal: 10, height: 40, borderRadius: 20, marginRight: 8 },
  streakText: { fontWeight: '800', color: C.steps, fontSize: 15 },
  challenge: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 18, gap: 12 },
  challengeLabel: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 12 },
  challengeDay: { color: C.white, fontSize: 32, fontWeight: '900', marginTop: 2, letterSpacing: -0.5 },
  challengeMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600', marginTop: 4 },
  challengeTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 10, overflow: 'hidden' },
  challengeFill: { height: '100%', backgroundColor: C.white, borderRadius: 3 },
  challengeBtn: { backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 },
  challengeBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});
