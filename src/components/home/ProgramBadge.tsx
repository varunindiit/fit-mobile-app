import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Ring } from '@/components/ui';
import { C } from '@/theme';

const SIZE = 84;
const GLOW = 112;

/** Program emoji in a glowing disc, wrapped by a white progress ring (for gradient heroes). */
export function ProgramBadge({ emoji, progress }: { emoji: string; progress: number }) {
  return (
    <View style={st.wrap}>
      <Svg pointerEvents="none" width={GLOW} height={GLOW} style={st.glow}>
        <Defs>
          <RadialGradient id="programGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0.45" stopColor={C.white} stopOpacity={0.32} />
            <Stop offset="1" stopColor={C.white} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#programGlow)" />
      </Svg>
      <Ring size={SIZE} stroke={5} value={progress} color={C.white} track="rgba(255,255,255,0.24)">
        <View style={st.disc}>
          <Text style={st.emoji}>{emoji}</Text>
        </View>
      </Ring>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', left: (SIZE - GLOW) / 2, top: (SIZE - GLOW) / 2 },
  disc: { width: SIZE - 20, height: SIZE - 20, borderRadius: (SIZE - 20) / 2, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32 },
});
