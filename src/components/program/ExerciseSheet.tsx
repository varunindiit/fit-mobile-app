import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EASE_OUT, IconButton, IconTile, nativeOnly, PressableScale, Segmented, T, tap, usePresence, type IconName } from '@/components/ui';
import { exerciseById, type SessionItem } from '@/data/program';
import { C, MOTION, R } from '@/theme';
import { ExerciseArt } from './ExerciseArt';
import { fmtClock, focusColor } from './session';
import { Glyph } from '@/components/Glyph';

type Tab = 'animation' | 'muscle' | 'how';
const TABS: { value: Tab; label: string }[] = [
  { value: 'animation', label: 'Animation' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'how', label: 'How to do' },
];
const ART_H = 230;

/** Full-height exercise detail sheet with paging through the session's exercises. */
export function ExerciseSheet({ visible, onClose, items, index }: { visible: boolean; onClose: () => void; items: SessionItem[]; index: number }) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [i, setI] = useState(index);
  const [tab, setTab] = useState<Tab>('animation');
  const [wasOpen, setWasOpen] = useState(false);
  const mounted = usePresence(visible, MOTION.sheetOut);
  const p = useSharedValue(0);

  // Reset paging/tab each time the sheet opens (derived during render — no stale frame).
  if (visible !== wasOpen) {
    setWasOpen(visible);
    if (visible) {
      setI(index);
      setTab('animation');
    }
  }

  useEffect(() => {
    p.set(visible ? withTiming(1, { duration: MOTION.sheetIn, easing: EASE_OUT }) : withTiming(0, { duration: MOTION.sheetOut, easing: Easing.in(Easing.quad) }));
  }, [visible, p]);
  const backdrop = useAnimatedStyle(() => ({ opacity: p.get() }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.get(), [0, 1], [winH, 0]) }] }));

  const n = items.length;
  const it = items[Math.min(i, n - 1)];
  if (!it || !mounted) return null;
  const ex = exerciseById(it.exerciseId);
  const go = (d: number) => {
    const next = i + d;
    if (next < 0 || next >= n) return;
    tap();
    setI(next);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[s.panel, { paddingBottom: Math.max(insets.bottom, 14), marginTop: insets.top + 24 }, panel]}>
          <View style={s.grabber} />
          <View style={s.head}>
            <View style={{ flex: 1 }}>
              <Text style={T.label}>
                Exercise {Math.min(i, n - 1) + 1} of {n}
              </Text>
              <Text style={s.title} numberOfLines={2}>
                {ex.name}
              </Text>
            </View>
            <IconButton icon="close" bg={C.borderSoft} size={18} style={{ width: 34, height: 34 }} onPress={onClose} />
          </View>

          <ScrollView key={i} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Animated.View key={tab} entering={nativeOnly(FadeIn.duration(MOTION.base))}>
              {tab === 'animation' && <ExerciseArt key={ex.id} id={ex.id} emoji={ex.emoji} width="100%" height={ART_H} animated radius={R.lg} />}
              {tab === 'muscle' && (
                <View style={[s.box, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={s.body}>
                    {ex.focus.map((f, k) => (
                      <View key={f} style={[s.glow, { backgroundColor: focusColor(f) + '33', top: 40 + k * 34, left: 18 + (k % 2) * 26 }]} />
                    ))}
                    <Glyph emoji="🧍" size={150} />
                  </View>
                  <View style={{ flex: 1, gap: 8, paddingRight: 12 }}>
                    <Text style={T.label}>Target muscles</Text>
                    <Text style={s.muscles}>{ex.muscles}</Text>
                    {ex.focus.map((f) => (
                      <View key={f} style={s.focusRow}>
                        <View style={[s.dot, { backgroundColor: focusColor(f) }]} />
                        <Text style={s.focusText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {tab === 'how' && (
                <View style={[s.box, { padding: 16, gap: 14, justifyContent: 'center' }]}>
                  {ex.instructions.map((step, k) => (
                    <View key={k} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                      <View style={s.stepNum}>
                        <Text style={s.stepNumText}>{k + 1}</Text>
                      </View>
                      <Text style={[s.para, { flex: 1 }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            <Segmented options={TABS} value={tab} onChange={setTab} style={{ marginTop: 14 }} />

            <View style={s.repeats}>
              <IconTile icon={it.seconds ? 'timer-outline' : 'repeat'} size={40} />
              <Text style={[s.repeatLabel, { flex: 1 }]}>{it.seconds ? 'Duration' : 'Repeats'}</Text>
              <Text style={s.repeatVal}>{it.seconds ? fmtClock(it.seconds) : `x ${it.reps ?? 10}`}</Text>
            </View>

            <Text style={[T.label, s.sec]}>Instructions</Text>
            {ex.instructions.map((step, k) => (
              <Text key={k} style={[s.para, { marginBottom: 6 }]}>
                {step}
              </Text>
            ))}

            <Text style={[T.label, s.sec]}>Focus area</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ex.focus.map((f) => (
                <View key={f} style={s.chip}>
                  <View style={[s.dot, { backgroundColor: focusColor(f) }]} />
                  <Text style={s.chipText}>{f}</Text>
                </View>
              ))}
            </View>

            <Text style={[T.label, s.sec]}>Common mistakes</Text>
            <View style={s.group}>
              {ex.mistakes.map((m, k) => (
                <View key={k} style={[s.mistake, k > 0 && s.mistakeBorder]}>
                  <IconTile icon="alert" color={C.danger} bg={C.dangerSoft} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.mistakeTitle}>{m.title}</Text>
                    <Text style={s.para}>{m.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[T.label, s.sec]}>Breathing tips</Text>
            {ex.breathing.map((b, k) => (
              <View key={k} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <Ionicons name="leaf-outline" size={16} color={C.primary} style={{ marginTop: 3 }} />
                <Text style={[s.para, { flex: 1 }]}>{b}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <View style={s.pager}>
              <PagerBtn icon="chevron-back" disabled={i === 0} onPress={() => go(-1)} />
              <Text style={s.pagerText}>
                {i + 1}/{n}
              </Text>
              <PagerBtn icon="chevron-forward" disabled={i >= n - 1} onPress={() => go(1)} />
            </View>
            <Button title="Close" onPress={onClose} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PagerBtn({ icon, disabled, onPress }: { icon: IconName; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale hitSlop={8} scaleTo={0.9} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} style={[s.pagerBtn, disabled && s.pagerOff]}>
      <Ionicons name={icon} size={20} color={C.text} />
    </PressableScale>
  );
}

const s = StyleSheet.create({
  panel: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { width: 38, height: 5, borderRadius: 3, backgroundColor: C.border, alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4, marginTop: 2 },
  box: { minHeight: ART_H, borderRadius: R.lg, backgroundColor: C.surfaceAlt, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft, overflow: 'hidden' },
  body: { width: 130, height: ART_H, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  muscles: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4, letterSpacing: -0.2 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  focusText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepNum: { width: 26, height: 26, borderRadius: 9, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: C.primaryDark, fontWeight: '800', fontSize: 13 },
  repeats: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, borderRadius: R.md, backgroundColor: C.surfaceAlt },
  repeatLabel: { fontSize: 15, fontWeight: '600', color: C.textSoft },
  repeatVal: { fontSize: 20, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  sec: { marginTop: 24, marginBottom: 10 },
  para: { fontSize: 15, color: C.textSoft, lineHeight: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 34, borderRadius: R.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  chipText: { fontSize: 13, fontWeight: '600', color: C.text },
  group: { borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft, paddingHorizontal: 12 },
  mistake: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  mistakeBorder: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  mistakeTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pagerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  pagerOff: { opacity: 0.35 },
  pagerText: { fontSize: 15, fontWeight: '700', color: C.text, minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
