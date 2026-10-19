import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { TrainerAvatar } from '@/components/trainer/parts';
import { Card, IconTile, PressableScale, T, tap } from '@/components/ui';
import { availability, trainerById } from '@/data/trainers';
import { C, G, R, shadow } from '@/theme';

const openCoach = () => {
  tap();
  router.push('/trainer');
};

/**
 * Pro only: the coach the member has been assigned, and the way into their profile.
 *
 * `trainerId` comes straight from the store, so the card follows an assignment the
 * moment it lands (the purchase flow assigns one) and shows the pending state until
 * then. The screen decides whether to render this at all — Free and Smart never do.
 */
export function AssignedCoachCard({ trainerId }: { trainerId: string | null }) {
  if (!trainerId) return <PendingCard />;

  const coach = trainerById(trainerId);
  const avail = availability(coach);

  return (
    <View style={st.wrap}>
      <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <View style={st.badge}>
          <Ionicons name="checkmark-circle" size={11} color={C.gold} />
          <Text style={st.badgeText}>COACH ASSIGNED</Text>
        </View>
        <Text style={st.title}>Your Personal Coach Has Been Assigned!</Text>

        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`View ${coach.name}'s full profile`}
          onPress={openCoach}
          style={st.coachRow}>
          <TrainerAvatar trainer={coach} size={46} online={avail.online} />
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>
              {coach.name}
            </Text>
            <Text style={st.role} numberOfLines={1}>
              {coach.role}
            </Text>
            <View style={st.meta}>
              <Ionicons name="star" size={11} color={C.gold} />
              <Text style={st.metaStrong}>{coach.rating.toFixed(1)}</Text>
              <View style={st.metaDot} />
              <Text style={st.metaSoft}>{coach.years} yrs</Text>
              <View style={st.metaDot} />
              <Text style={st.metaSoft} numberOfLines={1}>
                {avail.label}
              </Text>
            </View>
          </View>
          <View style={st.profileBtn}>
            <Text style={st.profileBtnText}>Profile</Text>
            <Ionicons name="chevron-forward" size={12} color={C.gold} />
          </View>
        </PressableScale>
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
  wrap: { marginTop: 14, borderRadius: R.lg, ...shadow },
  card: { borderRadius: R.lg, padding: 14, overflow: 'hidden' },

  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(245,196,81,0.14)', borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { color: C.gold, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9 },
  title: { color: C.white, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3, lineHeight: 21, marginTop: 8 },

  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12 },
  name: { color: C.white, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2 },
  role: { color: 'rgba(255,255,255,0.64)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaStrong: { color: C.white, fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  metaSoft: { color: 'rgba(255,255,255,0.54)', fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 30, paddingLeft: 11, paddingRight: 7, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(245,196,81,0.45)' },
  profileBtnText: { color: C.gold, fontSize: 12, fontWeight: '800' },

  pending: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
});
