import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, type ViewStyle } from 'react-native';

import { impact, PressableScale, type IconName } from '@/components/ui';
import { C, G, glow, R } from '@/theme';

export const START_COLORS: [string, string] = G.warm;
/** The reference CTA fill, ready to spread: `<GradientButton {...PRIMARY} title="…" />`. */
export const PRIMARY = { colors: [C.primaryBright, C.primaryBright] as [string, string], fg: C.onPrimary };

/** Big gradient CTA (START / CONTINUE / ✓ / Cool!). Titled buttons are rounded rects; icon-only ones are pills. */
export function GradientButton({ title, onPress, colors = START_COLORS, icon, height = 54, style, iconSize = 20, fg = C.white }: { title?: string; onPress: () => void; colors?: [string, string]; icon?: IconName; height?: number; style?: ViewStyle; iconSize?: number; /** Ink for the label and icon — pass `C.onPrimary` on light fills like `PRIMARY`. */ fg?: string }) {
  const radius = title ? R.md : height / 2;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      scaleTo={0.97}
      onPress={() => {
        impact();
        onPress();
      }}
      style={[{ borderRadius: radius, backgroundColor: colors[1] }, glow(colors[1]), style]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.fill, { height, borderRadius: radius }]}>
        {icon && <Ionicons name={icon} size={iconSize} color={fg} style={title ? { marginRight: 8 } : undefined} />}
        {!!title && (
          <Text style={[s.text, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  fill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, overflow: 'hidden' },
  text: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
});
