import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Dialog, Divider, Header, IconButton, ListRow, OptionCard, Pill, ProgressBar, Screen, SectionTitle, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { NOTIFICATIONS } from '@/data/notifications';
import { PLAN_TIERS } from '@/data/plans';
import { PROGRAM_DAYS, programById } from '@/data/program';
import { bmiLabel, cmToFtIn } from '@/lib/calc';
import { useStore, workoutStreak } from '@/lib/store';
import { C, R } from '@/theme';
import { BackupCard } from './backup';
import {
  AboutSheet,
  Avatar,
  CONDITIONS,
  DIETS,
  fmtFull,
  fmtNum,
  fmtPhone,
  fmtWeight,
  goalMeta,
  goalSummary,
  HelpSheet,
  planEnd,
  PlanBadge,
  realConditions,
  realRestrictions,
  shared,
} from './shared';
import { LanguageSheet, RateSheet, WorkoutSettingsSheet } from './sheets';

type SheetKind = null | 'diet' | 'medical' | 'help' | 'about' | 'workout' | 'language' | 'rate';
type DialogKind = null | 'restart' | 'reset' | 'logout';

const DIALOGS = {
  restart: { icon: '🔁', title: 'Restart onboarding?', text: 'Walk through the onboarding flow again from the start. Great for showing the full journey.', confirm: 'Restart', danger: false },
  reset: { icon: '🧹', title: 'Reset all demo data?', text: 'This clears your profile, logs and subscription on this device and starts completely fresh.', confirm: 'Reset everything', danger: true },
  logout: { icon: '👋', title: 'Log out of Fitora?', text: 'You can log back in anytime with your phone number. Your data stays on this device.', confirm: 'Log out', danger: true },
};

/** Square, solid-colour settings icon row (reference app style). */
function Row({ icon, color, title, subtitle, onPress, right }: { icon: IconName; color: string; title: string; subtitle?: string; onPress: () => void; right?: ReactNode }) {
  return <ListRow icon={icon} iconColor={C.white} iconBg={color} title={title} subtitle={subtitle} onPress={onPress} right={right} />;
}

/** The profile / "Me" content. `tab` = Me tab (large title), `stack` = pushed /profile screen (back arrow). */
export function ProfileBody({ mode }: { mode: 'tab' | 'stack' }) {
  const { state, targets: t, updateProfile, restartOnboarding, resetAll } = useStore();
  const toast = useToast();
  const p = state.profile;
  const units = state.settings.units;
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [conds, setConds] = useState<string[]>([]);

  const close = () => setSheet(null);
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;
  const b = bmiLabel(t.bmi);
  const goal = goalSummary(p, t, units);
  const restrictions = realRestrictions(p.restrictions);
  const conditions = realConditions(p.conditions);
  const premium = state.premium;
  const tier = premium ? PLAN_TIERS.find((x) => x.id === premium.tier) : null;
  const condOptions = Array.from(new Set([...CONDITIONS, ...conditions]));
  const program = programById(p.program);
  const done = Math.min(PROGRAM_DAYS, state.programProgress[program.id] ?? 0);
  const nextDay = Math.min(PROGRAM_DAYS, done + 1);
  const streak = workoutStreak(state);

  const openMedical = () => {
    setConds(conditions);
    setSheet('medical');
  };
  const go = (href: string) => {
    close();
    setTimeout(() => router.push(href), 250);
  };
  const confirmDialog = () => {
    const kind = dialog;
    setDialog(null);
    setTimeout(() => {
      if (kind === 'reset') resetAll();
      else restartOnboarding();
      router.replace('/onboarding');
    }, 220);
  };

  return (
    <Screen>
      {mode === 'stack' ? (
        <Header title="Profile" right={<IconButton icon="settings-outline" onPress={() => router.push('/settings')} />} />
      ) : (
        <View style={st.tabHead}>
          <Text style={T.h1}>Me</Text>
          <IconButton icon="notifications-outline" badge={unread || undefined} onPress={() => router.push('/notifications')} />
        </View>
      )}
      <ScrollView contentContainerStyle={[st.content, mode === 'tab' && { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        {/* Backup & Restore */}
        <BackupCard />

        {/* Profile summary */}
        <Card style={st.hero}>
          <View style={st.heroTop}>
            <Avatar name={p.name} premium={!!premium} size={60} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.name} numberOfLines={1}>
                {p.name || 'Fitora member'}
              </Text>
              {!!p.phone && <Text style={T.small}>{fmtPhone(p.phone)}</Text>}
              <PlanBadge tier={premium?.tier} />
            </View>
            <Button title="Edit" icon="create-outline" variant="outline" small onPress={() => router.push('/edit-profile')} />
          </View>
          <View style={st.stats}>
            <Stat label="Height" value={`${p.heightCm} cm`} sub={cmToFtIn(p.heightCm)} />
            <View style={st.vDiv} />
            <Stat label="Weight" value={fmtWeight(p.weightKg, units)} sub={`Goal ${fmtWeight(p.targetKg, units)}`} />
            <View style={st.vDiv} />
            <Stat label="Age" value={`${p.age}`} sub="years" />
            <View style={st.vDiv} />
            <Stat label="BMI" value={t.bmi.toFixed(1)} sub={b.label} subColor={b.color} />
          </View>
        </Card>

        {/* My plan */}
        <SectionTitle title="My plan" action="Edit goals" onAction={() => router.push('/edit-profile?section=goals')} />
        <Card>
          <View style={st.goalRow}>
            <View style={st.goalEmoji}>
              <Text style={{ fontSize: 22 }}>{goalMeta(p.goal).emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={T.h3}>{goal.title}</Text>
              <Text style={[T.small, { marginTop: 2 }]}>{goal.sub}</Text>
            </View>
          </View>
          <Divider style={{ marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={st.budget}>{fmtNum(t.budget)}</Text>
            <Text style={[T.small, { marginBottom: 5 }]}>kcal / day</Text>
          </View>
          <Text style={T.tiny}>DAILY CALORIE BUDGET</Text>
          <View style={st.macros}>
            <Macro label="Protein" value={t.protein} color={C.protein} />
            <Macro label="Carbs" value={t.carbs} color={C.carbs} />
            <Macro label="Fat" value={t.fat} color={C.fat} />
            <Macro label="Fibre" value={t.fiber} color={C.fiber} />
          </View>
          <View style={st.goalsLine}>
            <Pill icon="walk" text={`${fmtNum(t.stepGoal)} steps`} color={C.steps} bg={C.stepsSoft} />
            <Pill icon="water" text={`${t.water} glasses water`} color={C.water} bg={C.waterSoft} />
            <Pill icon="calendar" text={`${p.weeklyGoal} workout days / week`} color={C.workout} bg={C.workoutSoft} />
          </View>

          {/* Current 30-day program */}
          <Pressable
            onPress={() => {
              tap();
              router.push('/fitness');
            }}
            style={({ pressed }) => [st.program, pressed && { opacity: 0.9 }]}>
            <LinearGradient colors={program.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.progIcon}>
              <Text style={{ fontSize: 22 }}>{program.emoji}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={st.progTitle}>{program.title}</Text>
              <Text style={T.small}>
                {program.level} · {done}/{PROGRAM_DAYS} days{streak ? ` · 🔥 ${streak}-day streak` : ''}
              </Text>
              <ProgressBar value={done / PROGRAM_DAYS} color={program.colors[1]} height={6} style={{ marginTop: 8 }} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title="Edit goals" icon="options-outline" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/edit-profile?section=goals')} />
            {done < PROGRAM_DAYS && (
              <Button
                title={`Start Day ${nextDay}`}
                icon="play"
                small
                style={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/program-day', params: { key: `program:${program.id}:${nextDay}` } })}
              />
            )}
          </View>
        </Card>

        {/* Premium */}
        <Pressable
          onPress={() => {
            tap();
            router.push('/plans');
          }}
          style={({ pressed }) => [{ marginTop: 16 }, pressed && { transform: [{ scale: 0.985 }] }]}>
          <LinearGradient colors={['#4F8BFF', '#6D28D9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.premium}>
            <View style={{ flex: 1 }}>
              {premium && tier ? (
                <>
                  <Text style={st.premTitle}>{tier.name.replace('Fitora ', '')} · Active</Text>
                  <Text style={st.premSub}>Valid till {fmtFull(planEnd(premium.since, premium.months))}</Text>
                  <View style={st.premCta}>
                    <Text style={st.premCtaText}>Manage plan</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={st.premTitle}>Premium</Text>
                  <Text style={st.premSub}>Get unlimited access to all</Text>
                  <View style={st.premCta}>
                    <Text style={st.premCtaText}>Up to 62% off</Text>
                  </View>
                </>
              )}
            </View>
            <Text style={st.mascot}>{premium ? '👑' : '🏋️‍♂️'}</Text>
          </LinearGradient>
        </Pressable>

        {/* Settings */}
        <Text style={st.group}>SETTINGS</Text>
        <Card style={shared.listCard}>
          <Row icon="barbell" color={C.protein} title="Workout Settings" subtitle="Rest, countdown, coach voice & music" onPress={() => setSheet('workout')} />
          <Divider style={shared.inset} />
          <Row icon="settings" color={C.primary} title="General Settings" subtitle="Units, reminders, connected apps" onPress={() => router.push('/settings')} />
          <Divider style={shared.inset} />
          <Row icon="language" color={C.steps} title="Language Options" subtitle={state.settings.language} onPress={() => setSheet('language')} />
          <Divider style={shared.inset} />
          <Row icon="leaf" color={C.weight} title="Diet preference" subtitle={p.diet || 'Not set — tap to choose'} onPress={() => setSheet('diet')} />
          {(p.cuisines.length > 0 || restrictions.length > 0) && (
            <View style={st.chips}>
              {p.cuisines.slice(0, 4).map((c) => (
                <Pill key={c} text={c} />
              ))}
              {p.cuisines.length > 4 && <Pill text={`+${p.cuisines.length - 4}`} />}
              {restrictions.map((r) => (
                <Pill key={r} text={r} color={C.accent} bg={C.accentSoft} />
              ))}
            </View>
          )}
          <Divider style={shared.inset} />
          <Row icon="medkit" color={C.danger} title="Medical conditions" subtitle={conditions.length ? conditions.join(', ') : 'None reported'} onPress={openMedical} />
          <Divider style={shared.inset} />
          <Row
            icon="notifications"
            color={C.accent}
            title="Notifications inbox"
            subtitle={unread ? `${unread} unread` : 'All caught up'}
            right={unread ? <Pill text={`${unread} NEW`} color={C.white} bg={C.accent} /> : undefined}
            onPress={() => router.push('/notifications')}
          />
          <Divider style={shared.inset} />
          <Row icon="sparkles" color="#D97706" title="Ask Ria" subtitle="Your AI nutrition coach" onPress={() => router.push('/coach')} />
          <Divider style={shared.inset} />
          <Row icon="diamond" color={C.workout} title="Plans" subtitle={premium ? `${tier?.name ?? 'Premium'} · active` : 'Smart & Pro · up to 62% off'} onPress={() => router.push('/plans')} />
        </Card>

        {/* Support us */}
        <Text style={st.group}>SUPPORT US</Text>
        <Card style={shared.listCard}>
          <Row icon="star" color={C.gold} title="Rate us" onPress={() => setSheet('rate')} />
          <Divider style={shared.inset} />
          <Row icon="share-social" color={C.water} title="Share with friends" onPress={() => toast('Invite link copied to clipboard', 'share-social')} />
          <Divider style={shared.inset} />
          <Row icon="help-circle" color={C.fiber} title="Help & FAQ" onPress={() => setSheet('help')} />
          <Divider style={shared.inset} />
          <Row icon="shield-checkmark" color={C.textSoft} title="About & Privacy" subtitle="Version 1.0.0" onPress={() => setSheet('about')} />
        </Card>

        {/* Demo controls */}
        <View style={st.demoHead}>
          <Text style={st.groupInline}>DEMO CONTROLS</Text>
          <Pill text="PRESENTER ONLY" color={C.workout} bg={C.workoutSoft} />
        </View>
        <Card style={[shared.listCard, st.demoCard]}>
          <ListRow icon="refresh" iconColor={C.workout} iconBg={C.workoutSoft} title="Restart onboarding" subtitle="Replay the sign-up journey" onPress={() => setDialog('restart')} />
          <Divider style={shared.inset} />
          <ListRow icon="trash-outline" iconColor={C.danger} iconBg={C.dangerSoft} title="Reset all demo data" subtitle="Start fresh on this device" onPress={() => setDialog('reset')} />
          <Divider style={shared.inset} />
          <ListRow icon="log-out-outline" iconColor={C.danger} iconBg={C.dangerSoft} title="Log out" onPress={() => setDialog('logout')} />
        </Card>
        <Text style={st.footer}>Fitora v1.0.0 · Demo build · data stored on this device</Text>
      </ScrollView>

      {/* Diet sheet */}
      <Sheet visible={sheet === 'diet'} onClose={close} title="Diet preference" scroll>
        <Text style={[T.small, { marginBottom: 12 }]}>Ria and your meal suggestions will follow this.</Text>
        {DIETS.map((d) => (
          <OptionCard
            key={d.value}
            emoji={d.emoji}
            title={d.value}
            subtitle={d.sub}
            selected={p.diet === d.value}
            onPress={() => {
              updateProfile({ diet: d.value });
              toast(`Diet set to ${d.value}`, 'leaf');
              setTimeout(close, 250);
            }}
          />
        ))}
      </Sheet>

      {/* Medical sheet */}
      <Sheet visible={sheet === 'medical'} onClose={close} title="Medical conditions" scroll>
        <Text style={[T.small, { marginBottom: 12 }]}>Your plan avoids foods that may worsen these, and your Pro coach sees them before your first call.</Text>
        <View style={st.condWrap}>
          {condOptions.map((c) => (
            <Chip key={c} label={c} selected={conds.includes(c)} color={C.danger} onPress={() => setConds((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} />
          ))}
        </View>
        <Card style={st.proHint} onPress={() => go('/plans?tier=pro')}>
          <Text style={{ fontSize: 24 }}>👩‍⚕️</Text>
          <View style={{ flex: 1 }}>
            <Text style={st.proHintTitle}>Managing diabetes, PCOS or thyroid?</Text>
            <Text style={T.small}>Get a certified specialist with Fitora Pro</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.workout} />
        </Card>
        <Button
          title="Save"
          style={{ marginTop: 16 }}
          onPress={() => {
            updateProfile({ conditions: conds.length ? conds : ['None'] });
            toast('Medical conditions updated', 'medkit');
            close();
          }}
        />
      </Sheet>

      <WorkoutSettingsSheet visible={sheet === 'workout'} onClose={close} />
      <LanguageSheet visible={sheet === 'language'} onClose={close} />
      <RateSheet visible={sheet === 'rate'} onClose={close} />
      <HelpSheet visible={sheet === 'help'} onClose={close} />
      <AboutSheet visible={sheet === 'about'} onClose={close} />

      {dialog && (
        <Dialog
          visible
          icon={DIALOGS[dialog].icon}
          title={DIALOGS[dialog].title}
          text={DIALOGS[dialog].text}
          confirm={DIALOGS[dialog].confirm}
          danger={DIALOGS[dialog].danger}
          cancel="Cancel"
          onCancel={() => setDialog(null)}
          onConfirm={confirmDialog}
        />
      )}
    </Screen>
  );
}

function Stat({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor?: string }) {
  return (
    <View style={st.stat}>
      <Text style={T.tiny}>{label.toUpperCase()}</Text>
      <Text style={st.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[st.statSub, subColor ? { color: subColor, fontWeight: '700' } : null]} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={st.macro}>
      <View style={[st.macroBar, { backgroundColor: color }]} />
      <Text style={st.macroVal}>{value}g</Text>
      <Text style={T.tiny}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tabHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  hero: { marginTop: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  stats: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderSoft },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 17, fontWeight: '800', color: C.text },
  statSub: { fontSize: 12, color: C.muted },
  vDiv: { width: 1, backgroundColor: C.borderSoft, marginVertical: 4 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalEmoji: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  budget: { fontSize: 34, fontWeight: '800', color: C.primaryDark, letterSpacing: -1 },
  macros: { flexDirection: 'row', gap: 8, marginTop: 14 },
  macro: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10, gap: 2 },
  macroBar: { width: 18, height: 4, borderRadius: 2, marginBottom: 4 },
  macroVal: { fontSize: 16, fontWeight: '800', color: C.text },
  goalsLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  program: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: R.md, backgroundColor: C.bg },
  progIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progTitle: { fontSize: 15, fontWeight: '800', color: C.text },
  premium: { borderRadius: R.lg, paddingVertical: 20, paddingLeft: 20, paddingRight: 12, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  premTitle: { color: C.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  premSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  premCta: { alignSelf: 'flex-start', backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  premCtaText: { color: '#5B3FD9', fontWeight: '800', fontSize: 12 },
  mascot: { fontSize: 64, marginLeft: 8 },
  group: { fontSize: 13, fontWeight: '800', color: C.muted, letterSpacing: 0.8, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  groupInline: { fontSize: 13, fontWeight: '800', color: C.muted, letterSpacing: 0.8, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 52, paddingBottom: 12, marginTop: -4 },
  condWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  proHint: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, backgroundColor: C.workoutSoft, shadowOpacity: 0, elevation: 0 },
  proHintTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  demoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  demoCard: { borderWidth: 1.5, borderColor: C.workoutSoft, borderStyle: 'dashed' },
  footer: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 20 },
});
