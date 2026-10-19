import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { TrainerAvatar } from '@/components/trainer/parts';
import { PressableScale, tap, type IconName } from '@/components/ui';
import { availability, trainerById } from '@/data/trainers';
import { C, G, R, shadow } from '@/theme';

const openCoach = () => {
  tap();
  router.push('/trainer');
};

/** Shortcuts into the coach features Pro already has: chat, calls and the trainer-built plan. */
const ACTIONS: { key: string; icon: IconName; label: string; go: () => void }[] = [
  { key: 'chat', icon: 'chatbubbles', label: 'Chat', go: () => router.push('/trainer/chat') },
  { key: 'audio', icon: 'call', label: 'Call', go: () => router.push({ pathname: '/trainer/call', params: { mode: 'audio' } }) },
  { key: 'video', icon: 'videocam', label: 'Video', go: () => router.push({ pathname: '/trainer/call', params: { mode: 'video' } }) },
  { key: 'plan', icon: 'barbell', label: 'Workouts', go: openCoach },
];

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
          <TrainerAvatar trainer={coach} size={52} online={avail.online} />
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
              <Text style={[st.metaSoft, { flexShrink: 1 }]} numberOfLines={1}>
                {avail.label}
              </Text>
            </View>
          </View>
          <View style={st.profileBtn}>
            <Text style={st.profileBtnText}>Profile</Text>
            <Ionicons name="chevron-forward" size={12} color={C.gold} />
          </View>
        </PressableScale>

        <View style={st.chips}>
          {coach.specialities.slice(0, 3).map((s) => (
            <View key={s} style={st.chip}>
              <Text style={st.chipText} numberOfLines={1}>
                {s}
              </Text>
            </View>
          ))}
        </View>

        <View style={st.actions}>
          {ACTIONS.map((a) => (
            <PressableScale
              key={a.key}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel={a.key === 'plan' ? `Open workouts from ${coach.name}` : `${a.label} ${coach.name}`}
              onPress={() => {
                tap();
                a.go();
              }}
              style={st.action}>
              <Ionicons name={a.icon} size={18} color={C.gold} />
              <Text style={st.actionText} numberOfLines={1}>
                {a.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

/** Pro is active but no coach has landed yet — never a dead end, just an honest wait. */
function PendingCard() {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const ring = useAnimatedStyle(() => ({ opacity: 0.55 - pulse.value * 0.45, transform: [{ scale: 1 + pulse.value * 0.22 }] }));

  return (
    <View style={st.wrap} accessible accessibilityLabel="Coach assignment in progress. We're matching you with a certified coach for your goal.">
      <LinearGradient colors={G.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.card}>
        <View style={st.badge}>
          <Ionicons name="diamond" size={10} color={C.gold} />
          <Text style={st.badgeText}>FITTELO PRO</Text>
        </View>
        <View style={st.pendingRow}>
          <View style={st.pendingArt}>
            <Animated.View style={[st.pendingRing, ring]} />
            <Ionicons name="hourglass-outline" size={22} color={C.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.pendingTitle}>Coach Assignment in Progress</Text>
            <Text style={st.pendingText}>We&apos;re matching you with a certified coach for your goal. You&apos;ll see them here as soon as they&apos;re assigned.</Text>
          </View>
        </View>
        <View style={st.steps}>
          <Step done label="Pro active" />
          <View style={st.stepLine} />
          <Step label="Matching coach" active />
          <View style={st.stepLine} />
          <Step label="Say hello" />
        </View>
      </LinearGradient>
    </View>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={st.step}>
      <View style={[st.stepDot, done && st.stepDotDone, active && st.stepDotActive]}>{done && <Ionicons name="checkmark" size={9} color={C.navy} />}</View>
      <Text style={[st.stepText, (done || active) && { color: C.white }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginTop: 26, borderRadius: R.lg, ...shadow },
  card: { borderRadius: R.lg, padding: 16, overflow: 'hidden' },

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

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  chipText: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56, borderRadius: R.sm, backgroundColor: 'rgba(245,196,81,0.1)', borderWidth: 1, borderColor: 'rgba(245,196,81,0.22)' },
  actionText: { color: C.white, fontSize: 11.5, fontWeight: '700' },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  pendingArt: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,196,81,0.12)', borderWidth: 1, borderColor: 'rgba(245,196,81,0.28)' },
  pendingRing: { position: 'absolute', width: 52, height: 52, borderRadius: 18, borderWidth: 1.5, borderColor: C.gold },
  pendingTitle: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  pendingText: { color: 'rgba(255,255,255,0.68)', fontSize: 12.5, lineHeight: 17, marginTop: 3 },

  steps: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  step: { alignItems: 'center', gap: 5, maxWidth: 88 },
  stepDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  stepDotDone: { backgroundColor: C.gold, borderColor: C.gold },
  stepDotActive: { borderColor: C.gold, backgroundColor: 'rgba(245,196,81,0.25)' },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: '700' },
  stepLine: { flex: 1, height: 1.5, marginHorizontal: 6, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.16)' },
});
