import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, type StyleProp, type ViewStyle } from 'react-native';

import { GLYPHS } from './glyphs';

/** Variation selectors and skin-tone/ZWJ noise differ between sources; lookups ignore them. */
const keyOf = (emoji: string) => emoji.replace(/️/g, '');

/**
 * Renders an emoji token from the data layer as artwork that never depends on the device's emoji font:
 * a generated illustration when one exists, otherwise a matching vector icon, otherwise the raw emoji.
 */
export function Glyph({ emoji, size = 24, color, style }: { emoji?: string; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  if (!emoji) return null;
  const g = GLYPHS[keyOf(emoji)];
  if (g && 'img' in g) return <Image source={g.img} style={[{ width: size, height: size }, style as object]} contentFit="contain" />;
  if (g) return <Ionicons name={g.icon} size={Math.round(size * 0.9)} color={color ?? g.color} style={style as object} />;
  return <Text style={{ fontSize: Math.round(size * 0.8), lineHeight: Math.round(size * 1.05) }}>{emoji}</Text>;
}
