import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { AboutSheet, ConnectedAppsCard, HelpSheet, RemindersCard, shared, UnitsRow } from '@/components/profile/shared';
import { LanguageSheet, WorkoutSettingsSheet } from '@/components/profile/sheets';
import { Card, Divider, Header, ListRow, Screen, SectionTitle, Toggle, useToast } from '@/components/ui';
import { NOTIFICATIONS } from '@/data/notifications';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

export default function SettingsScreen() {
  const { state, updateProfile } = useStore();
  const toast = useToast();
  const [sheet, setSheet] = useState<null | 'help' | 'about' | 'workout' | 'language'>(null);
  const unread = NOTIFICATIONS.filter((n) => !state.readNotifs.includes(n.id)).length;
  const premium = state.premium;
  const push = state.profile.notifications;
  const setPush = (v: boolean) => {
    updateProfile({ notifications: v });
    toast(v ? 'Push notifications allowed' : 'Push notifications turned off', v ? 'notifications' : 'notifications-off');
  };

  return (
    <Screen>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="Reminders" style={{ marginTop: 6 }} />
        <RemindersCard />

        <SectionTitle title="Preferences" />
        <Card style={shared.listCard}>
          <UnitsRow />
          <Divider style={shared.inset} />
          <ListRow icon="language" iconColor={C.steps} iconBg={C.stepsSoft} title="Language" subtitle={state.settings.language} onPress={() => setSheet('language')} />
          <Divider style={shared.inset} />
          <ListRow
            icon="barbell-outline"
            iconColor={C.protein}
            iconBg="#E8F0FE"
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

        <SectionTitle title="Connected apps" />
        <ConnectedAppsCard />

        <SectionTitle title="Account" />
        <Card style={shared.listCard}>
          <ListRow icon="person-outline" title="Edit profile" subtitle="Name, age, height" onPress={() => router.push('/edit-profile')} />
          <Divider style={shared.inset} />
          <ListRow icon="flag-outline" title="Goals & activity" subtitle="Calorie budget, target weight" onPress={() => router.push('/edit-profile?section=goals')} />
          <Divider style={shared.inset} />
          <ListRow
            icon="diamond-outline"
            iconColor={C.workout}
            iconBg={C.workoutSoft}
            title="Subscription"
            subtitle={premium ? `Fitora ${premium.tier === 'pro' ? 'Pro' : 'Smart'} · active` : 'Free plan'}
            onPress={() => router.push('/plans')}
          />
          <Divider style={shared.inset} />
          <ListRow
            icon="mail-unread-outline"
            iconColor={C.accent}
            iconBg={C.accentSoft}
            title="Notifications inbox"
            subtitle={unread ? `${unread} unread` : 'All caught up'}
            onPress={() => router.push('/notifications')}
          />
        </Card>

        <SectionTitle title="Support" />
        <Card style={shared.listCard}>
          <ListRow icon="sparkles" iconColor="#B45309" iconBg="#FEF3C7" title="Ask Ria" subtitle="Instant answers, 24×7" onPress={() => router.push('/coach')} />
          <Divider style={shared.inset} />
          <ListRow icon="help-circle-outline" iconColor={C.protein} iconBg="#E8F0FE" title="Help & FAQ" onPress={() => setSheet('help')} />
          <Divider style={shared.inset} />
          <ListRow icon="shield-checkmark-outline" iconColor={C.textSoft} iconBg={C.borderSoft} title="About & Privacy" subtitle="Version 1.0.0" onPress={() => setSheet('about')} />
        </Card>
        <Text style={st.footer}>Fitora v1.0.0 · Demo build</Text>
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
  footer: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 20 },
});
