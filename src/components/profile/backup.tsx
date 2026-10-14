import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Dialog, Divider, ListRow, Sheet, T, tap, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { BRAND, C, R, shadow } from '@/theme';
import { initials, shared } from './shared';

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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.white, fontWeight: '800', fontSize: size * 0.4 }}>{initials(name).slice(0, 1)}</Text>
    </View>
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
          <Initial name={backup.name} />
          <View style={{ flex: 1 }}>
            <View style={st.nameRow}>
              <Text style={st.title} numberOfLines={1}>
                {backup.name}
              </Text>
              <GBadge />
            </View>
            <Text style={T.small}>Last sync: {backup.lastSync}</Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tap();
              sync();
            }}
            style={st.syncBtn}>
            {syncing ? <ActivityIndicator size="small" color={C.primary} /> : <Ionicons name="refresh" size={20} color={C.primary} />}
          </Pressable>
        </Card>
      ) : (
        <Card onPress={() => setStep('accounts')} style={st.card}>
          <View style={st.cloud}>
            <Ionicons name="cloud-upload" size={22} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={st.nameRow}>
              <Text style={st.title}>Backup & Restore</Text>
              <GBadge />
            </View>
            <Text style={T.small}>Sign in and synchronize your data</Text>
          </View>
          <Ionicons name="sync" size={22} color={C.primary} />
        </Card>
      )}

      {/* Account chooser */}
      <Sheet visible={step === 'accounts'} onClose={() => setStep(null)} title="Choose an account">
        <View style={st.gHead}>
          <GBadge size={28} />
          <Text style={T.small}>to continue to {BRAND}</Text>
        </View>
        {accounts.map((a, i) => (
          <View key={a.email}>
            <Pressable onPress={() => choose(a)} style={({ pressed }) => [st.acct, pressed && { backgroundColor: C.borderSoft }]}>
              <Initial name={a.name} color={AVATAR_COLORS[i]} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={st.acctName}>{a.name}</Text>
                <Text style={T.small}>{a.email}</Text>
              </View>
            </Pressable>
            <Divider />
          </View>
        ))}
        <Pressable onPress={() => toast('Demo only — pick one of the accounts above', 'information-circle')} style={({ pressed }) => [st.acct, pressed && { backgroundColor: C.borderSoft }]}>
          <View style={st.addIcon}>
            <Ionicons name="person-add-outline" size={18} color={C.textSoft} />
          </View>
          <Text style={st.acctName}>Add another account</Text>
        </Pressable>
        <Text style={[T.tiny, { marginTop: 12, textAlign: 'center' }]}>Demo sign-in — no data leaves this device</Text>
      </Sheet>

      <Dialog
        visible={step === 'consent'}
        icon="🔐"
        title={`Allow Google to sign you in to ${BRAND}`}
        text={`Google will share your name, email address${pick ? ` (${pick.email})` : ''} and profile picture with ${BRAND}.`}
        confirm="Agree and share"
        cancel="Cancel"
        onCancel={() => setStep(null)}
        onConfirm={agree}
      />

      <Modal visible={step === 'loading'} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={st.overlay}>
          <View style={st.loader}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loaderText}>Loading…</Text>
          </View>
        </View>
      </Modal>

      {/* Manage */}
      <Sheet visible={step === 'manage'} onClose={() => setStep(null)} title="Backup & Restore">
        {backup && (
          <View style={st.gHead}>
            <Initial name={backup.name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={st.acctName}>{backup.name}</Text>
              <Text style={T.small}>
                {backup.email} · last sync {backup.lastSync}
              </Text>
            </View>
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
            iconBg="#E8F0FE"
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '800', color: C.text, flexShrink: 1 },
  cloud: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.protein, alignItems: 'center', justifyContent: 'center' },
  syncBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  g: { backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  gHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  acct: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12 },
  acctName: { fontSize: 15, fontWeight: '700', color: C.text },
  addIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center' },
  loader: { backgroundColor: C.card, borderRadius: R.lg, paddingVertical: 24, paddingHorizontal: 36, alignItems: 'center', gap: 12, ...shadow },
  loaderText: { fontSize: 15, fontWeight: '700', color: C.text },
});
