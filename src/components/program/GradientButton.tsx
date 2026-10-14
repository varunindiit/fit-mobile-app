import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, type ViewStyle } from 'react-native';

import { impact, PressableScale, type IconName } from '@/components/ui';
import { C, G, glow, R } from '@/theme';

export const START_COLORS: [string, string] = G.warm;
export const PRIMARY_COLORS: [string, string] = G.brand;

/** Big gradient CTA (START / CONTINUE / ✓ / Cool!). Titled buttons are rounded rects; icon-only ones are pills. */
export function GradientButton({ title, onPress, colors = START_COLORS, icon, height = 54, style, iconSize = 20 }: { title?: string; onPress: () => void; colors?: [string, string]; icon?: IconName; height?: number; style?: ViewStyle; iconSize?: number }) {
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
        {icon && <Ionicons name={icon} size={iconSize} color={C.white} style={title ? { marginRight: 8 } : undefined} />}
        {!!title && (
          <Text style={s.text} numberOfLines={1}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  fill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
});
