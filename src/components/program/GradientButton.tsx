import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { tap, type IconName } from '@/components/ui';
import { C, R } from '@/theme';

export const START_COLORS: [string, string] = ['#FF8A5B', '#E5484D'];
export const PRIMARY_COLORS: [string, string] = [C.primary, C.primaryDark];

/** Big pill CTA with a gradient fill (START / CONTINUE / ✓ / Cool!). */
export function GradientButton({ title, onPress, colors = START_COLORS, icon, height = 56, style, iconSize = 20 }: { title?: string; onPress: () => void; colors?: [string, string]; icon?: IconName; height?: number; style?: ViewStyle; iconSize?: number }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ borderRadius: R.pill }, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }, style]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { height, borderRadius: height / 2 }]}>
        {icon && <Ionicons name={icon} size={iconSize} color={C.white} style={title ? { marginRight: 8 } : undefined} />}
        {!!title && (
          <Text style={s.text} numberOfLines={1}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  text: { color: C.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.8 },
});
