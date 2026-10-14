import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Card, Dialog, Divider, IconTile, ListRow, nativeOnly, PressableScale, ProgressBar, Sheet, T, tap, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { BRAND, C, MOTION, R, shadowLg, shadowSm } from '@/theme';
import { initials, shared, tint } from './shared';

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
export const fmtClock = (d = new Date()) => `${d.getHours() % 12 || 12}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.') || 'fitora.user';

const AVATAR_COLORS = [C.primary, C.protein, C.workout];

export function GBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={[st.g, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="logo-google" size={size * 0.62} color="#4285F4" />
    </View>
  );
}

function Initial({ name, color = C.primary, size = 44 }: { name: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint(color, '22'), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.4 }}>{initials(name).slice(0, 1)}</Text>
    </View>
  );
}

/** Refresh glyph that spins while a sync runs (static under reduced motion). */
function SpinIcon({ spinning }: { spinning: boolean }) {
  const reduce = useReducedMotion();
  const r = useSharedValue(0);
  useEffect(() => {
    if (spinning && !reduce) r.set(withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false));
    else {
      cancelAnimation(r);
      r.set(withTiming(0, { duration: MOTION.fast }));
    }
  }, [spinning, reduce, r]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get()}deg` }] }));
  if (spinning && reduce) return <ActivityIndicator size="small" color={C.primaryDark} />;
  return (
    <Animated.View style={spin}>
      <Ionicons name="refresh" size={19} color={C.primaryDark} />
    </Animated.View>
  );
}

/** "Backup & Restore" card with a simulated Google sign-in and sync. */
export function BackupCard() {
  const { state, setBackup } = useStore();
  const toast = useToast();
  const backup = state.backup;
  const [step, setStep] = useState<null | 'accounts' | 'consent' | 'loading' | 'manage' | 'signout'>(null);
  const [pick, setPick] = useState<{ name: string; email: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  const me = state.profile.name.trim() || 'Fitora User';
  const accounts = [
    { name: me, email: `${slug(me)}@gmail.com` },
    { name: 'Demo User', email: 'demo.fitora@gmail.com' },
    { name: 'Fitness Team', email: 'fitness.team.in@gmail.com' },
  ];

  const choose = (a: { name: string; email: string }) => {
    setPick(a);
    setStep(null);
    later(() => setStep('consent'), 400);
  };
  const agree = () => {
    setStep(null);
    later(() => setStep('loading'), 350);
    later(() => {
      if (pick) setBackup({ ...pick, lastSync: fmtClock() });
      setStep(null);
      toast('Backup complete', 'cloud-done');
    }, 350 + 1200);
  };
  const sync = () => {
    if (!backup || syncing) return;
    setSyncing(true);
    later(() => {
      setBackup({ ...backup, lastSync: fmtClock() });
      setSyncing(false);
      toast('Synced just now', 'cloud-done');
    }, 1000);
  };

  return (
    <>
      {backup ? (
        <Card onPress={() => setStep('manage')} style={st.card}>
          <View>
            <Initial name={backup.name} />
            <View style={st.gOnAvatar}>
              <GBadge size={18} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.title} numberOfLines={1}>
              {backup.name}
            </Text>
            {syncing ? (
              <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.fast))} style={st.statusRow}>
                <ProgressBar value={1} height={4} style={{ flex: 1, maxWidth: 120 }} />
                <Text style={[T.tiny, { color: C.primaryDark }]}>Syncing…</Text>
              </Animated.View>
            ) : (
              <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.fast))} style={st.statusRow}>
                <Ionicons name="cloud-done" size={14} color={C.primary} />
                <Text style={T.small} numberOfLines={1}>
                  Last sync: {backup.lastSync}
                </Text>
              </Animated.View>
            )}
          </View>
          <PressableScale
            hitSlop={10}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Sync now"
            onPress={() => {
              tap();
              sync();
            }}
            style={st.syncBtn}>
            <SpinIcon spinning={syncing} />
          </PressableScale>
        </Card>
      ) : (
        <Card onPress={() => setStep('accounts')} style={st.card}>
          <IconTile icon="cloud-upload-outline" color={C.water} bg={C.waterSoft} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Backup & Restore</Text>
            <Text style={T.small}>Sign in and synchronize your data</Text>
          </View>
          <View style={st.signIn}>
            <GBadge size={16} />
            <Text style={st.signInText}>Sign in</Text>
          </View>
        </Card>
      )}

      {/* Account chooser */}
      <Sheet visible={step === 'accounts'} onClose={() => setStep(null)} title="Choose an account">
        <View style={st.gHead}>
          <GBadge size={28} />
          <Text style={T.small}>to continue to {BRAND}</Text>
        </View>
        <View style={st.acctList}>
          {accounts.map((a, i) => (
            <View key={a.email}>
              <Pressable onPress={() => choose(a)} style={({ pressed }) => [st.acct, pressed && { backgroundColor: C.surfaceAlt }]}>
                <Initial name={a.name} color={AVATAR_COLORS[i]} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={st.acctName}>{a.name}</Text>
                  <Text style={T.small}>{a.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
              <Divider style={st.acctInset} />
            </View>
          ))}
          <Pressable onPress={() => toast('Demo only — pick one of the accounts above', 'information-circle')} style={({ pressed }) => [st.acct, pressed && { backgroundColor: C.surfaceAlt }]}>
            <View style={st.addIcon}>
              <Ionicons name="person-add-outline" size={18} color={C.textSoft} />
            </View>
            <Text style={st.acctName}>Add another account</Text>
          </Pressable>
        </View>
        <View style={st.demoNote}>
          <Ionicons name="lock-closed" size={12} color={C.muted} />
          <Text style={T.tiny}>Demo sign-in — no data leaves this device</Text>
        </View>
      </Sheet>

      <Dialog
        visible={step === 'consent'}
        icon="🔐"
        title={`Allow Google to sign you in to ${BRAND}`}
        text={`Google will share your name, email address${pick ? ` (${pick.email})` : ''} and profile picture with ${BRAND}.`}
        confirm="Agree"
        cancel="Cancel"
        onCancel={() => setStep(null)}
        onConfirm={agree}
      />

      <Modal visible={step === 'loading'} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={st.overlay}>
          <View style={st.loader}>
            <View style={st.loaderBadge}>
              <GBadge size={34} />
            </View>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={st.loaderText}>Loading…</Text>
          </View>
        </View>
      </Modal>

      {/* Manage */}
      <Sheet visible={step === 'manage'} onClose={() => setStep(null)} title="Backup & Restore">
        {backup && (
          <View style={st.manageHead}>
            <Initial name={backup.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={st.acctName}>{backup.name}</Text>
              <Text style={T.small} numberOfLines={1}>
                {backup.email}
              </Text>
              <View style={[st.statusRow, { marginTop: 4 }]}>
                <Ionicons name="cloud-done" size={13} color={C.primary} />
                <Text style={[T.tiny, { color: C.primaryDark }]}>Last sync {backup.lastSync}</Text>
              </View>
            </View>
            <GBadge size={24} />
          </View>
        )}
        <View style={shared.listCard}>
          <ListRow
            icon="sync"
            title="Sync now"
            subtitle="Upload meals, workouts & weights"
            onPress={() => {
              setStep(null);
              sync();
            }}
          />
          <Divider style={shared.inset} />
          <ListRow
            icon="cloud-download-outline"
            iconColor={C.protein}
            iconBg={tint(C.protein)}
            title="Restore data"
            subtitle="Bring back data from your last backup"
            onPress={() => {
              setStep(null);
              toast(`Data restored from backup · ${backup?.lastSync ?? ''}`, 'cloud-download');
            }}
          />
          <Divider style={shared.inset} />
          <ListRow
            icon="log-out-outline"
            iconColor={C.danger}
            iconBg={C.dangerSoft}
            title="Sign out"
            subtitle="Your data stays on this device"
            onPress={() => {
              setStep(null);
              later(() => setStep('signout'), 400);
            }}
          />
        </View>
      </Sheet>

      <Dialog
        visible={step === 'signout'}
        icon="☁️"
        title="Sign out of Google?"
        text="Automatic backups will stop. Your data stays on this device."
        confirm="Sign out"
        cancel="Cancel"
        danger
        onCancel={() => setStep(null)}
        onConfirm={() => {
          setStep(null);
          setBackup(null);
          toast('Signed out of Google', 'log-out');
        }}
      />
    </>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2, flexShrink: 1, marginBottom: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  gOnAvatar: { position: 'absolute', right: -3, bottom: -3, borderRadius: 11, borderWidth: 2, borderColor: C.card },
  syncBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  signIn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, ...shadowSm },
  signInText: { fontSize: 13, fontWeight: '700', color: C.text },
  g: { backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border },
  gHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  acctList: { borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, overflow: 'hidden' },
  acct: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  acctInset: { marginLeft: 66 },
  acctName: { fontSize: 15, fontWeight: '700', color: C.text },
  addIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  demoNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
  overlay: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' },
  loader: { backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 24, paddingHorizontal: 40, alignItems: 'center', gap: 12, ...shadowLg },
  loaderBadge: { marginBottom: 2 },
  loaderText: { fontSize: 15, fontWeight: '700', color: C.text },
  manageHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, backgroundColor: C.surfaceAlt, marginBottom: 8 },
});
