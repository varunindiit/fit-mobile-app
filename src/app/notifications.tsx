import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Header, IconButton, ListRow, Screen, T, tap, useToast } from '@/components/ui';
import { NOTIFICATIONS, type Notif } from '@/data/notifications';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

const isToday = (n: Notif) => /AM|PM/.test(n.time);

export default function NotificationsScreen() {
  const { state, markNotifsRead } = useStore();
  const toast = useToast();
  const read = new Set(state.readNotifs);
  const unread = NOTIFICATIONS.filter((n) => !read.has(n.id)).length;

  const markAll = () => {
    if (!unread) return toast("You're all caught up", 'checkmark-done');
    markNotifsRead(NOTIFICATIONS.map((n) => n.id));
    toast(`Marked ${unread} notification${unread > 1 ? 's' : ''} as read`, 'checkmark-done');
  };
  const open = (n: Notif) => {
    tap();
    markNotifsRead([n.id]);
    router.push(n.route);
  };

  const groups = [
    { title: 'Today', items: NOTIFICATIONS.filter(isToday) },
    { title: 'Earlier', items: NOTIFICATIONS.filter((n) => !isToday(n)) },
  ].filter((g) => g.items.length);

  return (
    <Screen>
      <Header title="Notifications" right={<IconButton icon="checkmark-done" color={unread ? C.primary : C.muted} onPress={markAll} />} />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <View style={st.summary}>
          <Text style={T.small}>{unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}` : 'No unread notifications'}</Text>
          {unread > 0 && (
            <Pressable hitSlop={8} onPress={markAll}>
              <Text style={st.markAll}>Mark all read</Text>
            </Pressable>
          )}
        </View>

        {groups.map((g) => (
          <View key={g.title}>
            <Text style={st.group}>{g.title.toUpperCase()}</Text>
            {g.items.map((n) => {
              const isNew = !read.has(n.id);
              return (
                <Pressable key={n.id} onPress={() => open(n)} style={({ pressed }) => [st.item, isNew && st.itemNew, pressed && { opacity: 0.85 }]}>
                  <View style={[st.icon, isNew && { backgroundColor: C.card }]}>
                    <Text style={{ fontSize: 22 }}>{n.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={st.titleRow}>
                      <Text style={[st.title, !isNew && { fontWeight: '600', color: C.textSoft }]} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <Text style={st.time}>{n.time}</Text>
                    </View>
                    <Text style={st.body}>{n.body}</Text>
                  </View>
                  {isNew ? <View style={st.dot} /> : <Ionicons name="chevron-forward" size={16} color={C.muted} />}
                </Pressable>
              );
            })}
          </View>
        ))}

        {unread === 0 ? (
          <EmptyState emoji="🎉" title="You're all caught up!" text="We'll nudge you when it's time to log a meal, drink water or weigh in." />
        ) : (
          <Text style={st.end}>That's everything from the last 7 days</Text>
        )}

        <Card style={{ paddingVertical: 4, paddingHorizontal: 12, marginTop: 4 }}>
          <ListRow icon="options-outline" title="Manage reminders" subtitle="Meals, water and weigh-ins" onPress={() => router.push('/settings')} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  markAll: { fontSize: 14, fontWeight: '800', color: C.primary },
  group: { ...T.tiny, letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: C.card },
  itemNew: { backgroundColor: C.primarySoft, borderColor: C.primary + '33' },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: C.text },
  time: { fontSize: 12, color: C.muted, fontWeight: '600' },
  body: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  end: { textAlign: 'center', color: C.muted, fontSize: 12, marginVertical: 16 },
});
