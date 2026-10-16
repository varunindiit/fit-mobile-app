import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card, EmptyState, enter, Header, IconButton, IconTile, ListRow, PressableScale, Screen, T, tap, useToast, type IconName } from '@/components/ui';
import { NOTIFICATIONS, type Notif } from '@/data/notifications';
import { useStore } from '@/lib/store';
import { C, R, shadowSm } from '@/theme';

const isToday = (n: Notif) => /AM|PM/.test(n.time);

/** Icon tile per notification type (data carries an emoji; the list shows a tinted Ionicon instead). */
const KIND: Record<string, { icon: IconName; color: string; bg: string; border?: string }> = {
  '🍳': { icon: 'restaurant', color: C.accent, bg: C.accentSoft },
  '💧': { icon: 'water', color: C.water, bg: C.waterSoft },
  '✨': { icon: 'sparkles', color: C.ai, bg: C.aiSoft, border: C.aiBorder },
  '🏆': { icon: 'trophy', color: C.warning, bg: C.warningSoft },
  '⚖️': { icon: 'scale', color: C.weight, bg: C.weightSoft },
  '👑': { icon: 'diamond', color: C.gold, bg: C.navy },
};
const FALLBACK = { icon: 'notifications' as IconName, color: C.primaryDark, bg: C.primarySoft };

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
  // Index of each group's first row, so rows stagger in visual order across groups.
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((a, g) => a + g.items.length, 0));

  return (
    <Screen>
      <Header title="Notifications" right={<IconButton icon="checkmark-done" color={unread ? C.primary : C.muted} onPress={markAll} />} />
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)} style={st.summary}>
          <View style={st.summaryLeft}>
            {unread > 0 && (
              <View style={st.countBadge}>
                <Text style={st.countText}>{unread}</Text>
              </View>
            )}
            <Text style={T.small}>{unread ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}` : 'No unread notifications'}</Text>
          </View>
          {unread > 0 && (
            <Pressable hitSlop={8} onPress={markAll} style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <Text style={st.markAll}>Mark all read</Text>
            </Pressable>
          )}
        </Animated.View>

        {groups.map((g, gi) => (
          <View key={g.title}>
            <Animated.Text entering={enter(starts[gi] + gi + 1)} style={st.group}>
              {g.title}
            </Animated.Text>
            {g.items.map((n, i) => {
              const isNew = !read.has(n.id);
              const k = KIND[n.icon] ?? FALLBACK;
              return (
                <Animated.View key={n.id} entering={enter(starts[gi] + gi + i + 2)}>
                  <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${isNew ? 'Unread: ' : ''}${n.title}`} onPress={() => open(n)} style={[st.item, isNew && st.itemNew]}>
                    <View style={k.border ? [st.tileBorder, { borderColor: k.border }] : undefined}>
                      <IconTile icon={k.icon} color={k.color} bg={k.bg} size={44} iconSize={21} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={st.titleRow}>
                        <Text style={[st.title, !isNew && st.titleRead]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={[st.time, isNew && { color: C.primaryDark }]}>{n.time}</Text>
                      </View>
                      <Text style={st.body}>{n.body}</Text>
                    </View>
                    {isNew ? <View style={st.dot} /> : <Ionicons name="chevron-forward" size={16} color={C.muted} />}
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        ))}

        {unread === 0 ? (
          <EmptyState icon="checkmark-done-circle-outline" title="You're all caught up!" text="We'll nudge you when it's time to log a meal, drink water or weigh in." />
        ) : (
          <Text style={st.end}>{"That's everything from the last 7 days"}</Text>
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
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  countText: { color: C.onPrimary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  markAll: { fontSize: 14, fontWeight: '700', color: C.primary },
  group: { ...T.label, marginTop: 22, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft, ...shadowSm },
  itemNew: { backgroundColor: C.primarySoft, borderColor: C.primaryTint },
  tileBorder: { borderWidth: 1, borderRadius: 15, overflow: 'hidden' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.1 },
  titleRead: { fontWeight: '600', color: C.textSoft },
  time: { fontSize: 12, color: C.muted, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  end: { textAlign: 'center', color: C.muted, fontSize: 12, marginVertical: 16 },
});
