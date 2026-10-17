import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tap, type IconName } from "@/components/ui";
import { needsProWelcome, useStore } from "@/lib/store";
import { C, MOTION } from "@/theme";

const TABS: Record<
  string,
  { label: string; icon: IconName; iconOn: IconName }
> = {
  index: { label: "Home", icon: "home-outline", iconOn: "home" },
  fitness: { label: "Workout", icon: "barbell-outline", iconOn: "barbell" },
  diet: { label: "Diet", icon: "nutrition-outline", iconOn: "nutrition" },
  progress: {
    label: "Analytics",
    icon: "stats-chart-outline",
    iconOn: "stats-chart",
  },
  me: { label: "Me", icon: "person-outline", iconOn: "person" },
};

function TabItem({
  focused,
  label,
  icon,
  iconOn,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: IconName;
  iconOn: IconName;
  onPress: () => void;
}) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(focused ? 1 : 0, MOTION.spring));
  }, [focused, p]);
  const pill = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ scaleX: 0.6 + p.get() * 0.4 }],
  }));
  const glyph = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.get() * 1 }, { scale: 1 + p.get() * 0.04 }],
  }));
  return (
    <Pressable
      style={st.item}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={st.iconWrap}>
        <Animated.View style={[st.activePill, pill]} />
        <Animated.View style={glyph}>
          <Ionicons
            name={focused ? iconOn : icon}
            size={22}
            color={focused ? C.onPrimary : C.muted}
          />
        </Animated.View>
      </View>
      <Text style={[st.label, focused && st.labelOn]}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route: any, i: number) => {
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
              const e = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !e.defaultPrevented)
                navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}

/** The five tab routes — the welcome only opens while one of them is on screen. */
const TAB_PATHS = ["/", "/fitness", "/diet", "/progress", "/me"];

export default function TabsLayout() {
  const { state } = useStore();
  const sent = useRef(false);
  const path = usePathname();
  // Activations that don't pass through the paywall's own success screen (onboarding,
  // a restore) still owe the member their welcome, so it is triggered from here. It
  // waits until the tabs are the visible route, so it never cuts into the success
  // celebration or stacks a second copy on top of the paywall.
  const show = needsProWelcome(state) && TAB_PATHS.includes(path);
  useEffect(() => {
    if (!show || sent.current) return;
    sent.current = true;
    router.push("/pro-welcome");
  }, [show]);

  return (
    <Tabs screenOptions={{ headerShown: false, animation: "none" }} tabBar={(p: any) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="fitness" />
      <Tabs.Screen name="diet" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}

const st = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: C.card,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  iconWrap: {
    width: 58,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 15,
    backgroundColor: C.primarySoft,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    letterSpacing: 0.1,
  },
  labelOn: { color: C.onPrimary, fontWeight: "700" },
});
