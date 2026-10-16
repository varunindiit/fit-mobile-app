import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { CountUp, PressableScale, ProgressBar, Ring, tap, type IconName } from '@/components/ui';
import { C, fade, glow, ink, INK } from '@/theme';

/**
 * A black scrim at the top (the hero photo still shows through, but darkened with neutral `INK`
 * rather than a grey-blue wash) settling onto solid `C.graphite` — the exact colour the workout
 * pill below uses. Full opacity arrives at 68% so the card's whole lower third is flat graphite.
 */
const WASH: [string, string, string] = [ink(0.55), fade(C.graphite, 0.96), C.graphite];
const FAINT = 'rgba(255,255,255,0.62)';
const TRACK = 'rgba(255,255,255,0.09)';
const OVER = '#FF8F87';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Three concentric activity-style rings: calories, protein, carbs. */
function Rings({ cal, protein, carbs, over }: { cal: number; protein: number; carbs: number; over: boolean }) {
  return (
    <View style={st.rings}>
      <Ring size={148} stroke={13} value={cal} color={OVER} track={TRACK} gradient={over ? ['#FF8F87', '#E5484D'] : [C.primaryBright, C.primaryBright]}>
        <Ring size={112} stroke={11} value={protein} color={C.protein} track={TRACK} gradient={['#8FB2FF', '#4A7CF0']}>
          <Ring size={80} stroke={10} value={carbs} color={C.carbs} track={TRACK} gradient={['#FFD36B', '#F0AE1C']}>
            <Ionicons name="flame" size={22} color={over ? OVER : C.primaryBright} />
          </Ring>
        </Ring>
      </Ring>
    </View>
  );
}

function StatLine({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={st.statLine}>
      <View style={[st.dot, { backgroundColor: color }]} />
      <Text style={st.statLabel}>{label}</Text>
      <Text style={st.statValue}>{fmt(value)}</Text>
    </View>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.macroLabel}>{label}</Text>
      <ProgressBar value={target > 0 ? value / target : 0} color={color} track={TRACK} height={5} style={{ marginTop: 6 }} />
      <Text style={st.macroValue}>
        {Math.round(value)}
        <Text style={st.macroTarget}>/{target}g</Text>
      </Text>
    </View>
  );
}

export type CalorieCardProps = {
  eaten: number;
  burned: number;
  budget: number;
  left: number;
  over: boolean;
  status: { text: string; icon: IconName; color: string; bg: string };
  macros: { carbs: [number, number]; protein: [number, number]; fat: [number, number]; fiber: [number, number] };
  onPress: () => void;
};

/** Home hero: dark premium calorie card with activity rings and macro bars. Tapping opens the diary. */
export function CalorieCard({ eaten, burned, budget, left, over, status, macros, onPress }: CalorieCardProps) {
  const total = Math.max(1, budget + burned);
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityLabel={`Calorie budget: ${fmt(Math.abs(left))} kcal ${over ? 'over' : 'left'}. Open diary`}
      style={[st.shell, glow(INK)]}>
      <LinearGradient colors={WASH} locations={[0, 0.42, 0.68]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={st.bg}>
        {/* Over budget gets a red wash; on track the card stays plain graphite. */}
        {over && (
          <Svg pointerEvents="none" width={260} height={260} style={st.glowTR}>
            <Defs>
              <RadialGradient id="calGlowA" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#E5484D" stopOpacity={0.3} />
                <Stop offset="1" stopColor="#E5484D" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={130} cy={130} r={130} fill="url(#calGlowA)" />
          </Svg>
        )}
        <Svg pointerEvents="none" width={200} height={200} style={st.glowBL}>
          <Defs>
            <RadialGradient id="calGlowB" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#4A7CF0" stopOpacity={0.18} />
              <Stop offset="1" stopColor="#4A7CF0" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={100} cy={100} r={100} fill="url(#calGlowB)" />
        </Svg>

        {/* Head */}
        <View style={st.head}>
          <Text style={st.eyebrow}>CALORIE BUDGET</Text>
          <View style={[st.chip, over && { borderColor: 'rgba(255,143,135,0.4)' }]}>
            <Ionicons name={status.icon} size={12} color={over ? OVER : C.primaryBright} />
            <Text style={[st.chipText, over && { color: OVER }]}>{status.text}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={st.diary}>
            <Text style={st.diaryText}>Diary</Text>
            <Ionicons name="arrow-forward" size={13} color={C.white} />
          </View>
        </View>

        {/* Body */}
        <View style={st.body}>
          <View style={{ flex: 1 }}>
            <CountUp value={Math.abs(left)} fromZero style={[st.big, over && { color: OVER }]} />
            <Text style={st.bigLabel}>{over ? 'kcal over budget' : 'kcal left today'}</Text>
            <View style={st.stats}>
              <StatLine color={C.primaryBright} label="Eaten" value={eaten} />
              <StatLine color={C.accent} label="Burned" value={burned} />
              <StatLine color="rgba(255,255,255,0.5)" label="Budget" value={budget} />
            </View>
          </View>
          <Rings cal={eaten / total} protein={macros.protein[1] ? macros.protein[0] / macros.protein[1] : 0} carbs={macros.carbs[1] ? macros.carbs[0] / macros.carbs[1] : 0} over={over} />
        </View>

        {/* Macros on frosted glass */}
        <View style={st.glass}>
          <Macro label="Carbs" value={macros.carbs[0]} target={macros.carbs[1]} color={C.carbs} />
          <Macro label="Protein" value={macros.protein[0]} target={macros.protein[1]} color="#6E97F5" />
          <Macro label="Fat" value={macros.fat[0]} target={macros.fat[1]} color={C.fat} />
          <Macro label="Fiber" value={macros.fiber[0]} target={macros.fiber[1]} color="#A58BF0" />
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const st = StyleSheet.create({
  shell: { borderRadius: 26 },
  bg: { borderRadius: 26, padding: 18, overflow: 'hidden' },
  glowTR: { position: 'absolute', top: -70, right: -80 },
  glowBL: { position: 'absolute', bottom: -90, left: -70 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: FAINT, letterSpacing: 1.2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(86,214,97,0.45)' },
  chipText: { fontSize: 11, fontWeight: '700', color: C.primaryBright },
  diary: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  diaryText: { fontSize: 12, fontWeight: '700', color: C.white },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  big: { fontSize: 54, lineHeight: 60, fontWeight: '800', color: C.white, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  bigLabel: { fontSize: 13, fontWeight: '600', color: FAINT, marginTop: -2 },
  stats: { marginTop: 14, gap: 7, paddingRight: 10 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: FAINT },
  statValue: { fontSize: 14, fontWeight: '800', color: C.white, fontVariant: ['tabular-nums'] },
  rings: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
  glass: { flexDirection: 'row', gap: 12, marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.1)' },
  macroLabel: { fontSize: 12, fontWeight: '700', color: FAINT },
  macroValue: { fontSize: 12, fontWeight: '800', color: C.white, marginTop: 6, fontVariant: ['tabular-nums'] },
  macroTarget: { color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
});
