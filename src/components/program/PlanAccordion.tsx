import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { EASE_OUT, ProgressBar, PressableScale, tap } from '@/components/ui';
import { PROGRAMS, type ProgramId } from '@/data/program';
import { C, MOTION, R } from '@/theme';

type Program = (typeof PROGRAMS)[number];

const layout = LinearTransition.duration(MOTION.base).easing(EASE_OUT);
const bodyIn = FadeInDown.duration(MOTION.base + 60)
  .delay(60)
  .easing(EASE_OUT)
  .withInitialValues({ transform: [{ translateY: -8 }] });
const bodyOut = FadeOutUp.duration(MOTION.fast);

export function Bolts({ n, color = C.white }: { n: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3].map((i) => (
        <Ionicons key={i} name="flash" size={12} color={color} style={{ opacity: i <= n ? 1 : 0.35 }} />
      ))}
    </View>
  );
}

/** "Select Training Plan" accordion: one card expanded at a time, CTA on the expanded card. */
export function PlanAccordion({ value, onChange, onStart, cta = 'Start Day 1', progress }: { value: ProgramId; onChange: (id: ProgramId) => void; onStart?: (id: ProgramId) => void; cta?: string; progress?: Record<string, number> }) {
  return (
    <View style={{ gap: 12 }}>
      {PROGRAMS.map((p) => (
        <PlanCard key={p.id} p={p} open={p.id === value} done={progress?.[p.id] ?? 0} cta={cta} onChange={onChange} onStart={onStart} />
      ))}
    </View>
  );
}

function PlanCard({ p, open, done, cta, onChange, onStart }: { p: Program; open: boolean; done: number; cta: string; onChange: (id: ProgramId) => void; onStart?: (id: ProgramId) => void }) {
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    turn.set(withTiming(open ? 1 : 0, { duration: MOTION.base, easing: EASE_OUT }));
  }, [open, turn]);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 90}deg` }] }));

  return (
    <Animated.View layout={layout} style={[s.shell, { backgroundColor: p.colors[1] }]}>
      <PressableScale
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          tap();
          onChange(p.id);
        }}>
        <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <Svg width={220} height={220} style={s.deco} pointerEvents="none">
            <Circle cx={150} cy={70} r={92} fill={C.white} opacity={0.09} />
            <Circle cx={150} cy={70} r={56} fill="none" stroke={C.white} strokeOpacity={0.16} strokeWidth={1.5} />
          </Svg>
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, open && s.titleOpen]} numberOfLines={1}>
                {p.title}
              </Text>
              <View style={s.levelRow}>
                <Text style={s.level}>{p.level}</Text>
                <Bolts n={p.bolts} />
              </View>
            </View>
            <Animated.View style={[s.arrow, chevron]}>
              <Ionicons name="chevron-forward" size={16} color={p.colors[1]} />
            </Animated.View>
          </View>

          {open && (
            <Animated.View entering={bodyIn} exiting={bodyOut}>
              <View style={s.artRow}>
                <View style={s.emojiDisc}>
                  <Text style={s.bigEmoji}>{p.emoji}</Text>
                </View>
                <View style={s.users}>
                  <Ionicons name="people" size={14} color={C.white} />
                  <Text style={s.usersText}>{p.users} users</Text>
                </View>
              </View>
              <Text style={s.desc}>{p.desc}</Text>
              {done > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={s.progressRow}>
                    <Text style={s.progressText}>{done}/30 days completed</Text>
                    <Text style={s.progressText}>{Math.round((done / 30) * 100)}%</Text>
                  </View>
                  <ProgressBar value={done / 30} color={C.white} track="rgba(255,255,255,0.28)" height={5} style={{ marginTop: 6 }} />
                </View>
              )}
              {onStart && (
                <PressableScale
                  scaleTo={0.96}
                  accessibilityRole="button"
                  onPress={() => {
                    tap();
                    onStart(p.id);
                  }}
                  style={s.cta}>
                  <Ionicons name="play" size={15} color={p.colors[1]} />
                  <Text style={[s.ctaText, { color: p.colors[1] }]}>{done > 0 ? `Continue Day ${Math.min(30, done + 1)}` : cta}</Text>
                </PressableScale>
              )}
            </Animated.View>
          )}
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  shell: { borderRadius: R.lg, overflow: 'hidden' },
  card: { borderRadius: R.lg, padding: 18, overflow: 'hidden' },
  deco: { position: 'absolute', top: -40, right: -60 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: C.white, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  titleOpen: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  level: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  artRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  emojiDisc: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  bigEmoji: { fontSize: 54 },
  users: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, alignSelf: 'flex-start' },
  usersText: { color: C.white, fontWeight: '700', fontSize: 12, fontVariant: ['tabular-nums'] },
  desc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 14, lineHeight: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: C.white, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cta: { flexDirection: 'row', gap: 8, backgroundColor: C.white, borderRadius: R.md, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaText: { fontWeight: '700', fontSize: 15, letterSpacing: 0.1 },
});
