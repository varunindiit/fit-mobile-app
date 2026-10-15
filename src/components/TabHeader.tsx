import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { PressableScale, tap, type IconName } from '@/components/ui';
import { C, G, shadowSm } from '@/theme';

/**
 * Fixed tab-root header: eyebrow + big title at rest; once scrolled past `collapse`
 * it cross-fades to a compact row. A soft fade lets content slide under it.
 */
export function TabHeader({
  scrollY,
  eyebrow,
  title,
  compact,
  right,
  collapse = [40, 90],
}: {
  scrollY: SharedValue<number>;
  eyebrow: string;
  title: string;
  compact: React.ReactNode;
  right?: React.ReactNode;
  /** Scroll range over which the big title hands over to the compact row. */
  collapse?: [number, number];
}) {
  const [from, to] = collapse;
  const big = useAnimatedStyle(() => {
    const v = interpolate(scrollY.get(), [from - 30, to - 30], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - v, transform: [{ translateY: -8 * v }] };
  });
  const small = useAnimatedStyle(() => {
    const v = interpolate(scrollY.get(), [from, to], [0, 1], Extrapolation.CLAMP);
    return { opacity: v, transform: [{ translateY: 8 * (1 - v) }] };
  });
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, 20], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={s.head}>
      <View style={s.row}>
        <View style={s.titleBox}>
          <Animated.View style={big}>
            <View style={s.eyebrow}>
              <LinearGradient colors={G.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.dot} />
              <Text style={s.eyebrowText} numberOfLines={1}>
                {eyebrow}
              </Text>
            </View>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.compact, small]}>
            {compact}
          </Animated.View>
        </View>
        {right}
      </View>
      <Animated.View pointerEvents="none" style={[s.edge, edge]}>
        <View style={s.hair} />
        <LinearGradient colors={[C.bg, C.bg + '00']} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

/** Compact-row text pair (title + one-line meta). */
export function TabHeaderText({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.compactTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={s.compactSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

/** White capsule grouping the header's actions, with hairline separators between them. */
export function HeaderActions({ children }: { children: React.ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <View style={s.actions}>
      {items.map((child, i) => (
        <View key={i} style={s.actionSlot}>
          {i > 0 && <View style={s.sep} />}
          {child}
        </View>
      ))}
    </View>
  );
}

/** One capsule action: an icon (optionally with a count beside it or a badge on it) that routes on press. */
export function HeaderAction({
  icon,
  label,
  href,
  color = C.text,
  count,
  badge,
}: {
  icon: IconName;
  label: string;
  href: string;
  color?: string;
  /** Number shown beside the icon (e.g. streak). */
  count?: number;
  /** Red badge on the icon (e.g. unread). */
  badge?: number;
}) {
  return (
    <PressableScale
      scaleTo={0.88}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        router.push(href);
      }}
      style={[s.action, count != null && s.actionWide]}>
      <Ionicons name={icon} size={20} color={color} />
      {count != null && <Text style={s.count}>{count}</Text>}
      {!!badge && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: C.bg, zIndex: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  titleBox: { flex: 1, height: 56, justifyContent: 'center' },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, overflow: 'hidden' },
  eyebrowText: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1, marginTop: 1 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  compactSub: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 3,
    borderRadius: 23,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.border,
    ...shadowSm,
  },
  actionSlot: { flexDirection: 'row', alignItems: 'center' },
  action: { minWidth: 40, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionWide: { paddingHorizontal: 10 },
  count: { fontSize: 15, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  sep: { width: 1, height: 18, backgroundColor: C.border },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: C.white, fontSize: 9, fontWeight: '800' },
  edge: { position: 'absolute', left: 0, right: 0, top: '100%', height: 18 },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
});
