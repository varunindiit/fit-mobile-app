import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';

import { tap } from '@/components/ui';
import { PROGRAMS, type ProgramId } from '@/data/program';
import { C, R } from '@/theme';

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

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
      {PROGRAMS.map((p) => {
        const open = p.id === value;
        const done = progress?.[p.id] ?? 0;
        return (
          <Pressable
            key={p.id}
            onPress={() => {
              tap();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onChange(p.id);
            }}>
            <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, open && s.cardOpen]}>
              {open ? (
                <>
                  <View style={s.users}>
                    <Text style={s.usersText}>{p.users}</Text>
                    <Text style={s.usersText}>Users</Text>
                  </View>
                  <Text style={s.bigEmoji}>{p.emoji}</Text>
                  <Text style={s.title}>{p.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.level}>{p.level}</Text>
                    <Bolts n={p.bolts} />
                  </View>
                  <Text style={s.desc}>{p.desc}</Text>
                  {done > 0 && <Text style={[s.desc, { fontWeight: '800', marginTop: 6 }]}>{done}/30 days completed</Text>}
                  {onStart && (
                    <Pressable
                      onPress={() => {
                        tap();
                        onStart(p.id);
                      }}
                      style={({ pressed }) => [s.cta, pressed && { opacity: 0.85 }]}>
                      <Text style={[s.ctaText, { color: p.colors[1] }]}>{done > 0 ? `Continue Day ${Math.min(30, done + 1)}` : cta}</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.title, { fontSize: 20 }]}>{p.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.level}>{p.level}</Text>
                      <Bolts n={p.bolts} />
                    </View>
                  </View>
                  <View style={s.arrow}>
                    <Ionicons name="chevron-forward" size={16} color={p.colors[1]} />
                  </View>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: R.lg, padding: 18, overflow: 'hidden' },
  cardOpen: { paddingTop: 22, paddingBottom: 18 },
  users: { position: 'absolute', top: 14, right: 16, alignItems: 'flex-end' },
  usersText: { color: C.white, fontWeight: '800', fontSize: 11 },
  bigEmoji: { fontSize: 76, textAlign: 'center', marginVertical: 8 },
  title: { color: C.white, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  level: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },
  desc: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 8, lineHeight: 18 },
  cta: { backgroundColor: C.white, borderRadius: R.pill, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  ctaText: { fontWeight: '800', fontSize: 15 },
  arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
});
