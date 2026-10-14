import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enter, impact, PressableScale, Sheet, tap, useToast, type IconName } from '@/components/ui';
import { currentMeal, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, glow, MOTION } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconOn: 'home' },
  fitness: { label: 'Training', icon: 'barbell-outline', iconOn: 'barbell' },
  progress: { label: 'Reports', icon: 'stats-chart-outline', iconOn: 'stats-chart' },
  me: { label: 'Me', icon: 'person-outline', iconOn: 'person' },
};

function TabItem({ focused, label, icon, iconOn, onPress }: { focused: boolean; label: string; icon: IconName; iconOn: IconName; onPress: () => void }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(focused ? 1 : 0, MOTION.spring));
  }, [focused, p]);
  const pill = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scaleX: 0.6 + p.get() * 0.4 }] }));
  const glyph = useAnimatedStyle(() => ({ transform: [{ translateY: -p.get() * 1 }, { scale: 1 + p.get() * 0.04 }] }));
  return (
    <Pressable style={st.item} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <View style={st.iconWrap}>
        <Animated.View style={[st.activePill, pill]} />
        <Animated.View style={glyph}>
          <Ionicons name={focused ? iconOn : icon} size={22} color={focused ? C.primaryDark : C.muted} />
        </Animated.View>
      </View>
      <Text style={[st.label, focused && st.labelOn]}>{label}</Text>
    </Pressable>
  );
}

function PlusButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withSpring(open ? 1 : 0, MOTION.spring));
  }, [open, r]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get() * 45}deg` }] }));
  return (
    <PressableScale scaleTo={0.9} onPress={onPress} style={st.plus} accessibilityRole="button" accessibilityLabel="Quick log">
      <Animated.View style={spin}>
        <Ionicons name="add" size={30} color={C.white} />
      </Animated.View>
    </PressableScale>
  );
}

function TabBar({ state, navigation, onPlus, open }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route: any, i: number) => {
        if (route.name === 'log')
          return (
            <View key={route.key} style={st.item}>
              <PlusButton
                open={open}
                onPress={() => {
                  impact();
                  onPlus();
                }}
              />
            </View>
          );
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        return (
          <TabItem
            key={route.key}
            focused={focused}
            label={meta.label}
            icon={meta.icon}
            iconOn={meta.iconOn}
            onPress={() => {
              tap();
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

const QUICK: { key: string; label: string; hint: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'snap', label: 'Snap a meal', hint: 'AI calories', icon: 'camera', color: C.accent, bg: C.accentSoft },
  { key: 'food', label: 'Log food', hint: 'Search 1000s', icon: 'restaurant', color: C.primaryDark, bg: C.primarySoft },
  { key: 'water', label: 'Add water', hint: '+1 glass', icon: 'water', color: C.water, bg: C.waterSoft },
  { key: 'challenge', label: 'Daily challenge', hint: "Today's plan", icon: 'flame', color: C.workout, bg: C.workoutSoft },
  { key: 'weight', label: 'Log weight', hint: 'Weigh-in', icon: 'scale', color: C.weight, bg: C.weightSoft },
  { key: 'ria', label: 'Ask Ria', hint: 'AI coach', icon: 'sparkles', color: C.ai, bg: C.aiSoft },
];

export default function TabsLayout() {
  const [open, setOpen] = useState(false);
  const { state, setWater } = useStore();
  const toast = useToast();

  const pick = (key: string) => {
    setOpen(false);
    setTimeout(() => {
      if (key === 'snap') router.push('/snap');
      if (key === 'food') router.push({ pathname: '/food-search', params: { meal: currentMeal() } });
      if (key === 'challenge') {
        const pid = state.profile.program;
        const day = Math.min(30, (state.programProgress[pid] ?? 0) + 1);
        router.push({ pathname: '/program-day', params: { key: `program:${pid}:${day}` } });
      }
      if (key === 'weight') router.push({ pathname: '/progress', params: { log: String(Date.now()) } });
      if (key === 'ria') router.push('/coach');
      if (key === 'water') {
        const n = (state.water[todayKey()] ?? 0) + 1;
        setWater(n);
        toast(`Added a glass of water · ${n} of 8 today`, 'water');
      }
    }, 250);
  };

  return (
    <>
      <Tabs screenOptions={{ headerShown: false, animation: 'fade' }} tabBar={(p: any) => <TabBar {...p} open={open} onPlus={() => setOpen(true)} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="fitness" />
        <Tabs.Screen name="log" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="me" />
      </Tabs>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Quick log">
        <View style={st.grid}>
          {QUICK.map((q, i) => (
            <Animated.View key={q.key} entering={enter(i)} style={st.quickCell}>
              <PressableScale scaleTo={0.95} onPress={() => pick(q.key)} style={st.quick} accessibilityRole="button" accessibilityLabel={q.label}>
                <View style={[st.quickIcon, { backgroundColor: q.bg }]}>
                  <Ionicons name={q.icon} size={24} color={q.color} />
                </View>
                <Text style={st.quickLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {q.label}
                </Text>
                <Text style={st.quickHint} numberOfLines={1}>
                  {q.hint}
                </Text>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.card, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { width: 58, height: 30, alignItems: 'center', justifyContent: 'center' },
  activePill: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 15, backgroundColor: C.primarySoft },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 0.1 },
  labelOn: { color: C.primaryDark, fontWeight: '700' },
  plus: { width: 54, height: 54, borderRadius: 18, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center', marginTop: -22, borderWidth: 3, borderColor: C.card, ...glow(C.primaryDark) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, marginHorizontal: -5, paddingBottom: 4 },
  quickCell: { width: '33.33%', paddingHorizontal: 5 },
  quick: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderRadius: 18, backgroundColor: C.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft },
  quickIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickLabel: { fontSize: 12.5, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  quickHint: { fontSize: 11, color: C.muted, marginTop: 2, fontWeight: '500' },
});
