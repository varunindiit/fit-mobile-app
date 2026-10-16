import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Divider, Sheet, T, useToast } from '@/components/ui';
import { PLAN_TIERS, type PlanTier } from '@/data/plans';
import { initials, tint } from '@/components/profile/shared';
import { BRAND, C, R } from '@/theme';

export type Provider = 'google' | 'apple';
/** `plan` is the subscription the demo account already owns (null = Free). */
export type Account = { name: string; email: string; plan: PlanTier | null };

const AVATAR_COLORS = [C.primary, C.protein, C.workout];

const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.') || 'fitora.user';

/** Demo accounts offered by each provider; the first one is built from the user's own name. */
export function demoAccounts(provider: Provider, name: string): Account[] {
  const me = name.trim() || 'Fitora User';
  return provider === 'google'
    ? [
        { name: me, email: `${slug(me)}@gmail.com`, plan: null },
        { name: 'Demo User', email: 'demo.fitora@gmail.com', plan: 'smart' },
        { name: 'Fitness Team', email: 'fitness.team.in@gmail.com', plan: 'pro' },
      ]
    : [
        { name: me, email: `${slug(me)}@icloud.com`, plan: null },
        { name: 'Demo User', email: 'demo.fitora@icloud.com', plan: 'smart' },
        // Apple's "Hide My Email" hands the app a private relay address instead.
        { name: me, email: 'x7k2p9qd4m@privaterelay.appleid.com', plan: 'pro' },
      ];
}

export function GBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={[st.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Ionicons name="logo-google" size={size * 0.62} color="#4285F4" />
    </View>
  );
}

export function AppleBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={[st.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#000', borderColor: '#000' }]}>
      <Ionicons name="logo-apple" size={size * 0.62} color={C.white} />
    </View>
  );
}

export function MailBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={[st.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.primary, borderColor: C.primary }]}>
      <Ionicons name="mail" size={size * 0.56} color={C.white} />
    </View>
  );
}

export type AccountProvider = Provider | 'email';
export const PROVIDER_LABEL: Record<AccountProvider, string> = { google: 'Google', apple: 'Apple', email: BRAND };

/** Badge for whichever account the user signed in with. */
export function ProviderBadge({ provider, size = 18 }: { provider: AccountProvider; size?: number }) {
  return provider === 'apple' ? <AppleBadge size={size} /> : provider === 'email' ? <MailBadge size={size} /> : <GBadge size={size} />;
}

export function Initial({ name, color = C.primary, size = 44 }: { name: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint(color, '22'), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.4 }}>{initials(name).slice(0, 1)}</Text>
    </View>
  );
}

const COPY: Record<Provider, { title: string; add: string; note: string }> = {
  google: { title: 'Choose an account', add: 'Add another account', note: 'Demo sign-in — no data leaves this device' },
  apple: { title: 'Sign in with Apple', add: 'Use a different Apple Account', note: 'Demo sign-in — no data leaves this device' },
};

/** Free / Smart / Pro chip shown next to an account that brings its plan along. */
function PlanChip({ plan }: { plan: PlanTier | null }) {
  const tier = PLAN_TIERS.find((t) => t.id === plan);
  const color = tier?.color ?? C.textSoft;
  return (
    <View style={[st.chip, { backgroundColor: tier ? tint(color, '1F') : '#EEEDEB' }]}>
      {tier && <Ionicons name="diamond" size={10} color={color} />}
      <Text style={[st.chipText, { color }]}>{tier ? tier.name.replace(`${BRAND} `, '') : 'Free'}</Text>
    </View>
  );
}

/** Simulated Google / Apple account chooser (demo accounts only). `showPlans` tags each account with its plan. */
export function AccountSheet({ visible, provider, accounts, onClose, onPick, showPlans }: { visible: boolean; provider: Provider; accounts: Account[]; onClose: () => void; onPick: (a: Account) => void; showPlans?: boolean }) {
  const toast = useToast();
  const copy = COPY[provider];
  return (
    <Sheet visible={visible} onClose={onClose} title={copy.title}>
      <View style={st.head}>
        {provider === 'google' ? <GBadge size={28} /> : <AppleBadge size={28} />}
        <Text style={T.small}>to continue to {BRAND}</Text>
      </View>
      <View style={st.list}>
        {accounts.map((a, i) => {
          const hidden = a.email.endsWith('privaterelay.appleid.com');
          return (
            <View key={a.email}>
              <Pressable accessibilityRole="button" onPress={() => onPick(a)} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.surfaceAlt }]}>
                {hidden ? (
                  <View style={[st.hideIcon, { backgroundColor: tint(C.water, '22') }]}>
                    <Ionicons name="eye-off-outline" size={18} color={C.water} />
                  </View>
                ) : (
                  <Initial name={a.name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size={40} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={st.nameRow}>
                    <Text style={st.name} numberOfLines={1}>{hidden ? 'Hide My Email' : a.name}</Text>
                    {showPlans && <PlanChip plan={a.plan} />}
                  </View>
                  <Text style={T.small} numberOfLines={1}>
                    {hidden ? 'Forward to your inbox privately' : a.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
              <Divider style={st.inset} />
            </View>
          );
        })}
        <Pressable accessibilityRole="button" onPress={() => toast('Demo only — pick one of the accounts above', 'information-circle')} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.surfaceAlt }]}>
          <View style={st.addIcon}>
            <Ionicons name="person-add-outline" size={18} color={C.textSoft} />
          </View>
          <Text style={st.name}>{copy.add}</Text>
        </Pressable>
      </View>
      <View style={st.note}>
        <Ionicons name="lock-closed" size={12} color={C.muted} />
        <Text style={T.tiny}>{copy.note}</Text>
      </View>
    </Sheet>
  );
}

const st = StyleSheet.create({
  badge: { backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  list: { borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  inset: { marginLeft: 66 },
  name: { fontSize: 15, fontWeight: '700', color: C.text, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.pill },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  hideIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
});
