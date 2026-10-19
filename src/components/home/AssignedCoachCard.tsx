import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AvailabilityLine, TrainerAvatar } from '@/components/trainer/parts';
import { Card, IconTile, PressableScale, T, tap, type IconName } from '@/components/ui';
import { availability, firstName, trainerById } from '@/data/trainers';
import { C, G, R, shadow } from '@/theme';

/** The four ways a Pro member reaches their coach, in the order the dashboard shows them. */
const ACTIONS: { icon: IconName; label: string; href: Href; a11y: string }[] = [
  { icon: 'chatbubble-ellipses', label: 'Chat', href: '/trainer/chat', a11y: 'Chat with your coach' },
  { icon: 'call', label: 'Audio', href: { pathname: '/trainer/call', params: { mode: 'audio' } }, a11y: 'Audio call your coach' },
  { icon: 'videocam', label: 'Video', href: { pathname: '/trainer/call', params: { mode: 'video' } }, a11y: 'Video call your coach' },
  { icon: 'calendar', label: 'Book', href: '/trainer/request-session', a11y: 'Book a session with your coach' },
];

const open = (href: Href) => {
  tap();
  router.push(href);
};

/**
 * Pro only: the coach the member has been assigned, with the ways to reach them.
 *
 * `trainerId` comes straight from the store, so the card follows an assignment the
 * moment it lands (the purchase flow assigns one) and shows the pending state until
 * then. The screen decides whether to render this at all — Free and Smart never do.
 */
export function AssignedCoachCard({ trainerId, unread = 0 }: { trainerId: string | null; unread?: number }) {
  if (!trainerId) return <PendingCard />;

  const coach = trainerById(trainerId);
  const avail = availability(coach);

  return (
    <View style={st.wrap}>
      <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <View style={st.badge}>
          <Ionicons name="checkmark-circle" size={12} color={C.gold} />
          <Text style={st.badgeText}>COACH ASSIGNED</Text>
        </View>
        <Text style={st.title}>Your Personal Coach Has Been Assigned!</Text>

        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`View ${coach.name}'s full profile`}
          onPress={() => open('/trainer')}
          style={st.coachRow}>
          <TrainerAvatar trainer={coach} size={58} online={avail.online} />
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>
              {coach.name}
            </Text>
            <Text style={st.role} numberOfLines={2}>
              {coach.role}
            </Text>
            <AvailabilityLine trainer={coach} style={st.avail} />
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </PressableScale>

        <View style={st.meta}>
          <Ionicons name="star" size={12} color={C.gold} />
          <Text style={st.metaStrong}>{coach.rating.toFixed(1)}</Text>
          <Text style={st.metaSoft}>({coach.reviews})</Text>
          <View style={st.metaDot} />
          <Text style={st.metaSoft}>{coach.years} yrs experience</Text>
          <View style={st.metaDot} />
          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.58)" />
          <Text style={st.metaSoft}>{coach.city}</Text>
        </View>

        <View style={st.specs}>
          {coach.specialities.slice(0, 3).map((sp) => (
            <Text key={sp} style={st.spec}>
              {sp}
            </Text>
          ))}
        </View>

        <PressableScale scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`View ${coach.name}'s full profile`} onPress={() => open('/trainer')} style={st.profileBtn}>
          <Ionicons name="person-circle-outline" size={16} color={C.navy} />
          <Text style={st.profileBtnText}>View coach profile</Text>
        </PressableScale>

        <View style={st.actions}>
          {ACTIONS.map((a) => (
            <PressableScale key={a.label} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={a.a11y} onPress={() => open(a.href)} style={st.action}>
              <Ionicons name={a.icon} size={18} color={C.white} />
              <Text style={st.actionText}>{a.label}</Text>
              {a.label === 'Chat' && unread > 0 && (
                <View style={st.dot}>
                  <Text style={st.dotText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </PressableScale>
          ))}
        </View>

        <Text style={st.foot} numberOfLines={2}>
          {firstName(coach)} usually answers in about {coach.replyMins} min.
        </Text>
      </LinearGradient>
    </View>
  );
}

/** Pro is active but no coach has landed yet — never a dead end, just an honest wait. */
function PendingCard() {
  return (
    <Card style={st.pending}>
      <IconTile icon="hourglass-outline" size={46} radius={16} color={C.warning} bg={C.warningSoft} />
      <View style={{ flex: 1 }}>
        <Text style={T.h3}>Coach Assignment Pending</Text>
        <Text style={[T.small, { marginTop: 3 }]}>We&apos;re matching you with a certified coach for your goal. You&apos;ll see them here as soon as they&apos;re assigned.</Text>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 14, borderRadius: R.xl, ...shadow },
  card: { borderRadius: R.xl, padding: 16, overflow: 'hidden' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(245,196,81,0.14)', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: C.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: C.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.4, lineHeight: 25, marginTop: 10 },

  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: R.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 12 },
  name: { color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  role: { color: 'rgba(255,255,255,0.68)', fontSize: 12.5, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  avail: { marginTop: 5 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, flexWrap: 'wrap' },
  metaStrong: { color: C.white, fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metaSoft: { color: 'rgba(255,255,255,0.58)', fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },

  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  spec: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },

  profileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: R.sm, backgroundColor: C.gold, marginTop: 16 },
  profileBtnText: { color: C.navy, fontSize: 14, fontWeight: '800', letterSpacing: 0.1 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, height: 60, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionText: { color: C.white, fontSize: 11, fontWeight: '700' },
  dot: { position: 'absolute', top: 6, right: 8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: C.white, fontSize: 9.5, fontWeight: '800', fontVariant: ['tabular-nums'] },

  foot: { color: 'rgba(255,255,255,0.5)', fontSize: 11.5, fontWeight: '600', lineHeight: 16, marginTop: 12 },

  pending: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
});
