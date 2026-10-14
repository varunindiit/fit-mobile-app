import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet, tap, useToast, type IconName } from '@/components/ui';
import { currentMeal, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, shadow } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconOn: 'home' },
  fitness: { label: 'Training', icon: 'barbell-outline', iconOn: 'barbell' },
  progress: { label: 'Reports', icon: 'stats-chart-outline', iconOn: 'stats-chart' },
  me: { label: 'Me', icon: 'person-outline', iconOn: 'person' },
};

function TabBar({ state, navigation, onPlus }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route: any, i: number) => {
        if (route.name === 'log')
          return (
            <View key={route.key} style={st.item}>
              <Pressable
                onPress={() => {
                  tap();
                  onPlus();
                }}
                style={({ pressed }) => [st.plus, pressed && { transform: [{ scale: 0.94 }] }]}>
                <Ionicons name="add" size={32} color={C.white} />
              </Pressable>
            </View>
          );
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        return (
          <Pressable
            key={route.key}
            style={st.item}
            onPress={() => {
              tap();
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}>
            <Ionicons name={focused ? meta.iconOn : meta.icon} size={23} color={focused ? C.primary : C.muted} />
            <Text style={[st.label, focused && { color: C.primary }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const QUICK: { key: string; label: string; icon: IconName; color: string; bg: string }[] = [
  { key: 'snap', label: 'Snap a meal', icon: 'camera', color: C.accent, bg: C.accentSoft },
  { key: 'food', label: 'Log food', icon: 'restaurant', color: C.primaryDark, bg: C.primarySoft },
  { key: 'water', label: 'Add water', icon: 'water', color: C.water, bg: C.waterSoft },
  { key: 'challenge', label: 'Daily challenge', icon: 'flame', color: C.workout, bg: C.workoutSoft },
  { key: 'weight', label: 'Log weight', icon: 'scale', color: C.weight, bg: '#E3F8F5' },
  { key: 'ria', label: 'Ask Ria', icon: 'sparkles', color: '#B45309', bg: '#FEF3C7' },
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
      <Tabs screenOptions={{ headerShown: false }} tabBar={(p: any) => <TabBar {...p} onPlus={() => setOpen(true)} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="fitness" />
        <Tabs.Screen name="log" />
        <Tabs.Screen name="progress" />
        <Tabs.Screen name="me" />
      </Tabs>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Quick log">
        <View style={st.grid}>
          {QUICK.map((q) => (
            <Pressable key={q.key} onPress={() => pick(q.key)} style={({ pressed }) => [st.quick, pressed && { opacity: 0.7 }]}>
              <View style={[st.quickIcon, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon} size={26} color={q.color} />
              </View>
              <Text style={st.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.card, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.borderSoft, ...shadow },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '700', color: C.muted },
  plus: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 4, borderColor: C.card, ...shadow },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, paddingBottom: 8 },
  quick: { width: '33.33%', alignItems: 'center', gap: 8 },
  quickIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: C.text },
});
