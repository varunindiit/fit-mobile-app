import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Segmented, tap } from '@/components/ui';
import { exerciseById, type SessionItem } from '@/data/program';
import { C, R } from '@/theme';
import { ExerciseArt } from './ExerciseArt';
import { fmtClock, focusColor } from './session';

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
  const [i, setI] = useState(index);
  const [tab, setTab] = useState<Tab>('animation');
  const [wasOpen, setWasOpen] = useState(false);

  // Reset paging/tab each time the sheet opens (derived during render — no stale frame).
  if (visible !== wasOpen) {
    setWasOpen(visible);
    if (visible) {
      setI(index);
      setTab('animation');
    }
  }

  const n = items.length;
  const it = items[Math.min(i, n - 1)];
  if (!it) return null;
  const ex = exerciseById(it.exerciseId);
  const go = (d: number) => {
    const next = i + d;
    if (next < 0 || next >= n) return;
    tap();
    setI(next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }]} onPress={onClose} />
        <View style={[s.panel, { paddingBottom: Math.max(insets.bottom, 14), marginTop: insets.top + 24 }]}>
          <View style={s.grabber} />
          <View style={s.head}>
            <Text style={s.title} numberOfLines={2}>
              {ex.name.toUpperCase()}
            </Text>
            <IconButton icon="close" bg={C.borderSoft} size={18} onPress={onClose} />
          </View>

          <ScrollView key={i} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {tab === 'animation' && <ExerciseArt key={ex.id} emoji={ex.emoji} width="100%" height={ART_H} animated radius={R.lg} />}
            {tab === 'muscle' && (
              <View style={[s.box, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={s.body}>
                  {ex.focus.map((f, k) => (
                    <View key={f} style={[s.glow, { backgroundColor: focusColor(f) + '33', top: 40 + k * 34, left: 18 + (k % 2) * 26 }]} />
                  ))}
                  <Text style={{ fontSize: 120, lineHeight: 140 }}>🧍</Text>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={s.small}>Target muscles</Text>
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
              <View style={[s.box, { padding: 16, gap: 12, justifyContent: 'center' }]}>
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

            <Segmented options={TABS} value={tab} onChange={setTab} style={{ marginTop: 14 }} />

            <View style={s.repeats}>
              <Text style={s.sec}>{it.seconds ? 'DURATION' : 'REPEATS'}</Text>
              <Text style={s.repeatVal}>{it.seconds ? fmtClock(it.seconds) : `x ${it.reps ?? 10}`}</Text>
            </View>

            <Text style={s.sec}>INSTRUCTIONS</Text>
            {ex.instructions.map((step, k) => (
              <Text key={k} style={[s.para, { marginBottom: 6 }]}>
                {step}
              </Text>
            ))}

            <Text style={s.sec}>FOCUS AREA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ex.focus.map((f) => (
                <View key={f} style={s.chip}>
                  <View style={[s.dot, { backgroundColor: focusColor(f) }]} />
                  <Text style={s.chipText}>{f}</Text>
                </View>
              ))}
            </View>

            <Text style={s.sec}>COMMON MISTAKES</Text>
            {ex.mistakes.map((m, k) => (
              <View key={k} style={{ marginBottom: 12 }}>
                <Text style={s.mistakeTitle}>
                  {k + 1}. {m.title}
                </Text>
                <Text style={s.para}>{m.text}</Text>
              </View>
            ))}

            <Text style={s.sec}>BREATHING TIPS</Text>
            {ex.breathing.map((b, k) => (
              <View key={k} style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
                <Text style={[s.para, { color: C.primary, fontWeight: '900' }]}>•</Text>
                <Text style={[s.para, { flex: 1 }]}>{b}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <View style={s.pager}>
              <Pressable hitSlop={8} onPress={() => go(-1)} style={[s.pagerBtn, i === 0 && { opacity: 0.3 }]} disabled={i === 0}>
                <Ionicons name="play-skip-back" size={20} color={C.text} />
              </Pressable>
              <Text style={s.pagerText}>
                {i + 1}/{n}
              </Text>
              <Pressable hitSlop={8} onPress={() => go(1)} style={[s.pagerBtn, i >= n - 1 && { opacity: 0.3 }]} disabled={i >= n - 1}>
                <Ionicons name="play-skip-forward" size={20} color={C.text} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                tap();
                onClose();
              }}
              style={({ pressed }) => [s.close, pressed && { opacity: 0.85 }]}>
              <Text style={s.closeText}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  panel: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.border, alignSelf: 'center', marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  title: { flex: 1, fontSize: 21, fontWeight: '900', color: C.text, letterSpacing: 0.3 },
  box: { minHeight: ART_H, borderRadius: R.lg, backgroundColor: '#F4F7FE', overflow: 'hidden' },
  body: { width: 130, height: ART_H, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  small: { fontSize: 12, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  muscles: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4, paddingRight: 12 },
  focusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  focusText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: C.white, fontWeight: '800', fontSize: 13 },
  repeats: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  repeatVal: { fontSize: 18, fontWeight: '900', color: C.text },
  sec: { color: C.primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.9, marginTop: 22, marginBottom: 10 },
  para: { fontSize: 15, color: C.textSoft, lineHeight: 22 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 34, borderRadius: R.pill, backgroundColor: C.bg },
  chipText: { fontSize: 13, fontWeight: '700', color: C.text },
  mistakeTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pagerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pagerText: { fontSize: 15, fontWeight: '800', color: C.text, minWidth: 44, textAlign: 'center' },
  close: { flex: 1, height: 52, borderRadius: R.pill, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
