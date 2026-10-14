import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckMark, EmojiTile, fmtNum, fmtQty, goBack, isDateKey, isMeal, MealChips, MiniMacro, scoreBg, scoreColor } from '@/components/food/shared';
import { Button, IconButton, Pill, Sheet, T, tap, useToast } from '@/components/ui';
import { foodById, mealLabel, SNAP_SAMPLES, type MealKey } from '@/data/foods';
import { currentMeal, relDay, round1, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, R } from '@/theme';

const DARK = '#0B0F19';
const ND = Platform.OS !== 'web';
const STEPS = ['Detecting items', 'Estimating portions', 'Calculating nutrition'];
const TIPS = [
  { emoji: '☀️', title: 'Good lighting', text: 'Natural light gives the most accurate recognition.' },
  { emoji: '🍽️', title: 'Whole plate in frame', text: 'Shoot from above so every katori is visible.' },
  { emoji: '✏️', title: 'Review portions', text: 'Adjust quantities before logging for best accuracy.' },
];

type Stage = 'camera' | 'analyzing' | 'result';
type Item = { foodId: string; qty: number; on: boolean };

const confidence = (id: string) => 89 + ((id.length * 7 + id.charCodeAt(0)) % 10);

export default function SnapScreen() {
  const p = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { addFood } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState<Stage>('camera');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [meal, setMeal] = useState<MealKey>(isMeal(p.meal) ? p.meal : (currentMeal() as MealKey));
  const [tips, setTips] = useState(false);
  const date = isDateKey(p.date) ? p.date : todayKey();
  const scan = useRef(new Animated.Value(0)).current;
  const shot = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(1)).current;
  const sample = SNAP_SAMPLES[sampleIdx];
  const frame = Math.round(Math.min(width - 48, height * 0.46, 380));

  useEffect(() => {
    if (stage !== 'analyzing') return;
    scan.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(scan, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      ]),
    );
    loop.start();
    setStep(0);
    const ts = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2100),
      setTimeout(() => {
        setItems(SNAP_SAMPLES[sampleIdx].items.map((i) => ({ ...i, on: true })));
        setStage('result');
      }, 2450),
    ];
    return () => {
      loop.stop();
      ts.forEach(clearTimeout);
    };
  }, [stage, sampleIdx, scan]);

  const capture = () => {
    tap();
    shot.setValue(1);
    Animated.timing(shot, { toValue: 0, duration: 380, useNativeDriver: ND }).start();
    setStage('analyzing');
  };
  const nextSample = () => {
    tap();
    Animated.timing(swap, { toValue: 0, duration: 130, useNativeDriver: ND }).start(() => {
      setSampleIdx((i) => (i + 1) % SNAP_SAMPLES.length);
      Animated.timing(swap, { toValue: 1, duration: 200, useNativeDriver: ND }).start();
    });
  };

  /* ---------- Result ---------- */
  if (stage === 'result') {
    const sel = items.filter((i) => i.on);
    const tot = sel.reduce(
      (a, i) => {
        const f = foodById(i.foodId);
        if (!f) return a;
        a.kcal += f.kcal * i.qty;
        a.protein += f.protein * i.qty;
        a.carbs += f.carbs * i.qty;
        a.fat += f.fat * i.qty;
        a.score += f.score * f.kcal * i.qty;
        return a;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0, score: 0 },
    );
    const score = tot.kcal ? round1(tot.score / tot.kcal) : 0;
    const verdict = score >= 8 ? 'Well balanced meal. Nice work!' : score >= 5 ? 'Decent meal. Add veggies or protein to balance it.' : 'Heavy meal. Go lighter at your next one.';
    const setItem = (idx: number, patch: Partial<Item>) => setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    const log = () => {
      sel.forEach((i) => addFood(i.foodId, meal, i.qty, date));
      toast(`Logged ${sel.length} item${sel.length > 1 ? 's' : ''} to ${mealLabel(meal)} · ${fmtNum(tot.kcal)} kcal`, 'camera');
      goBack();
    };

    return (
      <View style={[st.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={st.topBar}>
          <IconButton icon="close" color={C.white} bg="rgba(255,255,255,0.12)" onPress={goBack} />
          <Text style={st.topTitle}>Meal detected</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.resHead}>
          <View style={st.thumb}>
            <LinearGradient colors={['#4A3424', '#2A1D14']} style={StyleSheet.absoluteFill} />
            <Plate size={84} items={sample.items} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.resTitle}>{sample.title}</Text>
            <Text style={st.resSub}>
              {items.length} items found · {Math.round(items.reduce((a, i) => a + confidence(i.foodId), 0) / Math.max(items.length, 1))}% match
            </Text>
            {date !== todayKey() && <Pill text={`For ${relDay(date)}`} color={C.navy} bg={C.gold} style={{ marginTop: 6 }} />}
          </View>
        </View>

        <View style={st.sheet}>
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <View style={st.sheetHead}>
              <Text style={T.h3}>Detected items</Text>
              <Text style={T.tiny}>Tap to include / exclude</Text>
            </View>
            {items.map((it, idx) => {
              const f = foodById(it.foodId);
              if (!f) return null;
              return (
                <Pressable
                  key={it.foodId}
                  onPress={() => {
                    tap();
                    setItem(idx, { on: !it.on });
                  }}
                  style={[st.item, !it.on && { opacity: 0.45 }]}>
                  <CheckMark on={it.on} />
                  <EmojiTile food={f} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.itemName} numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text style={T.tiny} numberOfLines={1}>
                      {fmtNum(f.kcal * it.qty)} kcal · {f.unit}
                    </Text>
                  </View>
                  <View style={st.mini}>
                    <Pressable
                      hitSlop={6}
                      onPress={() => {
                        tap();
                        setItem(idx, { qty: Math.max(0.5, it.qty - 0.5), on: true });
                      }}
                      style={st.miniBtn}>
                      <Ionicons name="remove" size={16} color={C.primaryDark} />
                    </Pressable>
                    <Text style={st.miniQty}>{fmtQty(it.qty)}</Text>
                    <Pressable
                      hitSlop={6}
                      onPress={() => {
                        tap();
                        setItem(idx, { qty: Math.min(10, it.qty + 0.5), on: true });
                      }}
                      style={[st.miniBtn, { backgroundColor: C.primary }]}>
                      <Ionicons name="add" size={16} color={C.white} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}

            <View style={st.totals}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text style={T.tiny}>TOTAL · {sel.length} SELECTED</Text>
                  <Text style={st.totalKcal}>
                    {fmtNum(tot.kcal)} <Text style={st.totalUnit}>kcal</Text>
                  </Text>
                </View>
                {sel.length > 0 && (
                  <View style={[st.score, { backgroundColor: scoreBg(score) }]}>
                    <Ionicons name="heart" size={13} color={scoreColor(score)} />
                    <Text style={[st.scoreText, { color: scoreColor(score) }]}>{score}/10</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <MiniMacro label="Carbs" value={tot.carbs} color={C.carbs} />
                <MiniMacro label="Protein" value={tot.protein} color={C.protein} />
                <MiniMacro label="Fat" value={tot.fat} color={C.fat} />
              </View>
              {sel.length > 0 && <Text style={[T.small, { marginTop: 10 }]}>{verdict}</Text>}
            </View>

            <Text style={[T.label, { marginTop: 18, marginBottom: 10, paddingHorizontal: 20 }]}>Add to</Text>
            <MealChips value={meal} onChange={setMeal} style={{ paddingHorizontal: 4 }} />
          </ScrollView>
          <View style={[st.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Button
              title="Retake"
              icon="camera-reverse-outline"
              variant="outline"
              onPress={() => setStage('camera')}
              style={{ paddingHorizontal: 16 }}
            />
            <Button
              title={sel.length ? `Add ${sel.length} item${sel.length > 1 ? 's' : ''} to ${mealLabel(meal)}` : 'Select an item'}
              disabled={!sel.length}
              onPress={log}
              style={{ flex: 1, paddingHorizontal: 12 }}
              textStyle={{ fontSize: 15 }}
            />
          </View>
        </View>
      </View>
    );
  }

  /* ---------- Camera / analysing ---------- */
  const analyzing = stage === 'analyzing';
  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={st.topBar}>
        <IconButton icon="close" color={C.white} bg="rgba(255,255,255,0.12)" onPress={analyzing ? () => setStage('camera') : goBack} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={st.topTitle}>Snap & Log</Text>
          <Pill text="AI" color={C.navy} bg={C.gold} />
        </View>
        <IconButton
          icon={flash ? 'flash' : 'flash-off'}
          color={flash ? C.gold : C.white}
          bg="rgba(255,255,255,0.12)"
          onPress={() => setFlash((f) => !f)}
        />
      </View>

      <View style={st.center}>
        <Text style={st.hint}>{analyzing ? 'Analysing your meal…' : 'Point at your meal'}</Text>
        <Text style={st.hintSub}>{analyzing ? 'Hold on, this takes a moment' : 'Keep the whole plate inside the frame'}</Text>

        <View style={{ width: frame + 16, height: frame + 16, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
          <View style={[st.frame, { width: frame, height: frame }]}>
            <LinearGradient colors={flash ? ['#6B4C35', '#3D2B1D'] : ['#3B2A1E', '#1A120C']} style={StyleSheet.absoluteFill} />
            <Animated.View style={{ opacity: swap, transform: [{ scale: swap.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
              <Plate size={frame * 0.82} items={sample.items} detected={analyzing && step >= 1} />
            </Animated.View>
            {analyzing && (
              <>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,164,114,0.08)' }]} />
                <Animated.View
                  style={[st.scanLine, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [6, frame - 10] }) }] }]}
                />
              </>
            )}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.white, opacity: shot, pointerEvents: 'none' }]} />
          </View>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[st.corner, st[c], analyzing && { borderColor: C.primary }]} />
          ))}
        </View>

        {analyzing ? (
          <View style={st.steps}>
            {STEPS.map((s, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <View key={s} style={[st.stepRow, !done && !active && { opacity: 0.35 }]}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                  ) : active ? (
                    <ActivityIndicator size="small" color={C.white} style={{ width: 20 }} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color="rgba(255,255,255,0.6)" />
                  )}
                  <Text style={[st.stepText, done && { color: C.white }]}>{s}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Pressable onPress={nextSample} style={({ pressed }) => [st.sampleChip, pressed && { opacity: 0.7 }]}>
            <Ionicons name="shuffle" size={15} color={C.white} />
            <Text style={st.sampleText}>
              Sample: {sample.title} · <Text style={{ color: C.gold }}>Try another</Text>
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[st.controls, { paddingBottom: Math.max(insets.bottom, 12) + 16, opacity: analyzing ? 0.35 : 1, pointerEvents: analyzing ? 'none' : 'auto' }]}>
        <Pressable onPress={nextSample} style={st.side}>
          <View style={st.sideIcon}>
            <Ionicons name="images-outline" size={22} color={C.white} />
          </View>
          <Text style={st.sideText}>Gallery</Text>
        </Pressable>
        <Pressable onPress={capture} style={({ pressed }) => [st.shutter, pressed && { transform: [{ scale: 0.94 }] }]}>
          <View style={st.shutterInner} />
        </Pressable>
        <Pressable
          onPress={() => {
            tap();
            setTips(true);
          }}
          style={st.side}>
          <View style={st.sideIcon}>
            <Ionicons name="help-circle-outline" size={24} color={C.white} />
          </View>
          <Text style={st.sideText}>Tips</Text>
        </Pressable>
      </View>

      <Sheet visible={tips} onClose={() => setTips(false)} title="Tips for accurate results">
        {TIPS.map((t) => (
          <View key={t.title} style={st.tipRow}>
            <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.tipTitle}>{t.title}</Text>
              <Text style={T.small}>{t.text}</Text>
            </View>
          </View>
        ))}
        <Button title="Got it" onPress={() => setTips(false)} style={{ marginTop: 8 }} />
      </Sheet>
    </View>
  );
}

/** Pretend plate: emoji arranged in a ring on a ceramic plate. */
function Plate({ size, items, detected }: { size: number; items: { foodId: string; qty: number }[]; detected?: boolean }) {
  const n = items.length;
  const r = n <= 1 ? 0 : n === 2 ? size * 0.2 : size * 0.25;
  const emo = n >= 5 ? size * 0.16 : n >= 3 ? size * 0.2 : size * 0.24;
  const box = emo * 1.45;
  const offset = n === 2 ? 0 : -Math.PI / 2;
  return (
    <View style={[st.plate, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={{ position: 'absolute', width: size * 0.82, height: size * 0.82, borderRadius: size, borderWidth: Math.max(1, size * 0.008), borderColor: '#E3DCCD' }} />
      {items.map((it, i) => {
        const a = (i / n) * 2 * Math.PI + offset;
        const f = foodById(it.foodId);
        return (
          <View
            key={it.foodId}
            style={[
              { position: 'absolute', left: size / 2 + Math.cos(a) * r - box / 2, top: size / 2 + Math.sin(a) * r - box / 2, width: box, height: box, alignItems: 'center', justifyContent: 'center', borderRadius: box * 0.22 },
              detected && { borderWidth: 2, borderColor: C.primary, backgroundColor: 'rgba(14,164,114,0.1)' },
            ]}>
            <Text style={{ fontSize: emo }}>{f?.emoji}</Text>
            {detected && size > 120 && (
              <View style={st.conf}>
                <Text style={st.confText}>{confidence(it.foodId)}%</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const CORNER = 30;
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  topTitle: { color: C.white, fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  hint: { color: C.white, fontSize: 18, fontWeight: '800' },
  hintSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  frame: { borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.white },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 26 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 26 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 26 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 26 },
  scanLine: { position: 'absolute', top: 0, left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  plate: { backgroundColor: '#F6F2EA', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  conf: { position: 'absolute', top: -9, left: -2, backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  confText: { color: C.white, fontSize: 9, fontWeight: '800' },
  sampleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 14, paddingVertical: 9, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  sampleText: { color: C.white, fontSize: 13, fontWeight: '600' },
  steps: { marginTop: 18, gap: 10, alignSelf: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 12 },
  side: { alignItems: 'center', gap: 6, width: 72 },
  sideIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  sideText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.white },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  resHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 18 },
  thumb: { width: 96, height: 96, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  resTitle: { color: C.white, fontSize: 20, fontWeight: '800' },
  resSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  sheet: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  itemName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  miniQty: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '800', color: C.text },
  totals: { marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.bg },
  totalKcal: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 2 },
  totalUnit: { fontSize: 15, fontWeight: '600', color: C.muted },
  score: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 28, borderRadius: R.pill },
  scoreText: { fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderSoft, backgroundColor: C.card },
});
