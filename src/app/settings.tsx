import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AboutSheet, ConnectedAppsCard, fmtFull, GroupLabel, HelpSheet, planEnd, RemindersCard, shared, tint, UnitsRow } from '@/components/profile/shared';
import { LanguageSheet, WorkoutSettingsSheet } from '@/components/profile/sheets';
import { Card, Divider, enter, Header, ListRow, Pill, Screen, Toggle, useToast } from '@/components/ui';
import { NOTIFICATIONS } from '@/data/notifications';
import { isPremiumActive, useStore } from '@/lib/store';
import { C } from '@/theme';

const LOGO = require('@/assets/images/logo-mark.png');

export default function SettingsScreen() {
  const { state, updateProfile } = useStore();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | 'help' | 'about' | 'workout' | 'language'>(null);
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;
  const premium = isPremiumActive(state.premium) ? state.premium : null;
  const planName = premium ? `Fittelo ${premium.tier === 'pro' ? 'Pro' : 'Smart'}` : '';
  const push = state.profile.notifications;
  const setPush = (v: boolean) => {
    updateProfile({ notifications: v });
    toast(v ? 'Push notifications allowed' : 'Push notifications turned off', v ? 'notifications' : 'notifications-off');
  };

  return (
    <Screen>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)}>
          <GroupLabel title="Reminders" style={{ marginTop: 8 }} />
          <RemindersCard />
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <GroupLabel title="Preferences" />
          <Card style={shared.listCard}>
            <UnitsRow />
            <Divider style={shared.inset} />
            <ListRow icon="language" iconColor={C.steps} iconBg={C.stepsSoft} title="Language" subtitle={state.settings.language} onPress={() => setSheet('language')} />
            <Divider style={shared.inset} />
            <ListRow
              icon="barbell-outline"
              iconColor={C.workout}
              iconBg={C.workoutSoft}
              title="Workout settings"
              subtitle={`${state.settings.restSeconds}s rest · ${state.settings.countdown}s countdown · voice ${state.settings.coachVoice ? 'on' : 'off'}`}
              onPress={() => setSheet('workout')}
            />
            <Divider style={shared.inset} />
            <ListRow
              icon="notifications-outline"
              iconColor={C.accent}
              iconBg={C.accentSoft}
              title="Push notifications"
              subtitle={push ? 'Allowed on this device' : 'Off — reminders will not alert you'}
              chevron={false}
              onPress={() => setPush(!push)}
              right={<Toggle value={push} onChange={setPush} />}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <GroupLabel title="Connected apps" />
          <ConnectedAppsCard />
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <GroupLabel title="Account" />
          <Card style={shared.listCard}>
            <ListRow icon="person-outline" title="Edit profile" subtitle="Name, age, height" onPress={() => router.push('/edit-profile')} />
            <Divider style={shared.inset} />
            <ListRow icon="flag-outline" iconColor={C.weight} iconBg={C.weightSoft} title="Goals & activity" subtitle="Calorie budget, target weight" onPress={() => router.push('/edit-profile?section=goals')} />
            <Divider style={shared.inset} />
            <ListRow
              icon="diamond-outline"
              iconColor={C.warning}
              iconBg={C.warningSoft}
              title="Subscription"
              subtitle={
                !premium ? 'Free plan' : premium.cancelledAt ? `${planName} · Cancelled · active till ${fmtFull(planEnd(premium.since, premium.months))}` : `${planName} · active`
              }
              right={premium && !premium.cancelledAt ? <Pill text="ACTIVE" icon="checkmark" color={C.primaryDark} bg={C.primarySoft} /> : undefined}
              onPress={() => router.push('/plans')}
            />
            <Divider style={shared.inset} />
            <ListRow
              icon="mail-unread-outline"
              iconColor={C.accent}
              iconBg={C.accentSoft}
              title="Notifications inbox"
              subtitle={unread ? `${unread} unread` : 'All caught up'}
              right={unread ? <Pill text={`${unread} NEW`} color={C.white} bg={C.accent} /> : undefined}
              onPress={() => router.push('/notifications')}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(4)}>
          <GroupLabel title="Support" />
          <Card style={shared.listCard}>
            <ListRow icon="sparkles" iconColor={C.ai} iconBg={C.aiSoft} title="Ask Saathi" subtitle="Instant answers, 24×7" onPress={() => router.push('/coach')} />
            <Divider style={shared.inset} />
            <ListRow icon="help-circle-outline" iconColor={C.fiber} iconBg={tint(C.fiber)} title="Help & FAQ" onPress={() => setSheet('help')} />
            <Divider style={shared.inset} />
            <ListRow icon="shield-checkmark-outline" iconColor={C.textSoft} iconBg="#EEEDEB" title="About & Privacy" subtitle="Version 1.0.0" onPress={() => setSheet('about')} />
          </Card>
          <View style={st.footer}>
            <View style={st.footerLogo}>
              <Image source={LOGO} style={{ width: 13, height: 13 }} contentFit="contain" />
            </View>
            <Text style={st.footerText}>Fittelo v1.0.0 · Demo build</Text>
          </View>
        </Animated.View>
      </ScrollView>
      <HelpSheet visible={sheet === 'help'} onClose={() => setSheet(null)} />
      <AboutSheet visible={sheet === 'about'} onClose={() => setSheet(null)} />
      <WorkoutSettingsSheet visible={sheet === 'workout'} onClose={() => setSheet(null)} />
      <LanguageSheet visible={sheet === 'language'} onClose={() => setSheet(null)} />
    </Screen>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  footerLogo: { width: 20, height: 20, borderRadius: 6, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  footerText: { color: C.muted, fontSize: 12 },
});
