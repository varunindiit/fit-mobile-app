import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckMark, EmojiTile, fmtNum, fmtQty, goBack, isDateKey, isMeal, MealChips, MiniMacro, RiaNote, ScoreRing } from '@/components/food/shared';
import { Button, CountUp, enter, fadeEnter, IconButton, IconTile, nativeOnly, Pill, PressableScale, ProgressBar, Sheet, T, tap, useToast, type IconName } from '@/components/ui';
import { foodById, mealLabel, SNAP_SAMPLES, type MealKey } from '@/data/foods';
import { currentMeal, relDay, round1, todayKey } from '@/lib/calc';
import { useStore } from '@/lib/store';
import { C, MOTION, R } from '@/theme';
import { Glyph } from '@/components/Glyph';

const DARK = '#0B0E0D';
const GLASS = 'rgba(255,255,255,0.12)';
const STEPS = ['Detecting items', 'Estimating portions', 'Calculating nutrition'];
const TIPS: { icon: IconName; color: string; bg: string; title: string; text: string }[] = [
  { icon: 'sunny', color: C.warning, bg: C.warningSoft, title: 'Good lighting', text: 'Natural light gives the most accurate recognition.' },
  { icon: 'scan', color: C.primaryDark, bg: C.primarySoft, title: 'Whole plate in frame', text: 'Shoot from above so every katori is visible.' },
  { icon: 'create-outline', color: C.steps, bg: C.stepsSoft, title: 'Review portions', text: 'Adjust quantities before logging for best accuracy.' },
];

type Stage = 'camera' | 'analyzing' | 'result';
type Item = { foodId: string; qty: number; on: boolean };

const confidence = (id: string) => 89 + ((id.length * 7 + id.charCodeAt(0)) % 10);

export default function SnapScreen() {
  const p = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { addFood } = useStore();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [stage, setStage] = useState<Stage>('camera');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [meal, setMeal] = useState<MealKey>(isMeal(p.meal) ? p.meal : (currentMeal() as MealKey));
  const [tips, setTips] = useState(false);
  const date = isDateKey(p.date) ? p.date : todayKey();
  const scan = useSharedValue(0);
  const shot = useSharedValue(0);
  const swap = useSharedValue(1);
  const pulse = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sample = SNAP_SAMPLES[sampleIdx];
  const frame = Math.round(Math.min(width - 48, height * 0.46, 380));

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Simulated analysis pipeline.
  useEffect(() => {
    if (stage !== 'analyzing') return;
    const ts = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2100),
      setTimeout(() => {
        setItems(SNAP_SAMPLES[sampleIdx].items.map((i) => ({ ...i, on: true })));
        setStage('result');
      }, 2450),
    ];
    return () => ts.forEach(clearTimeout);
  }, [stage, sampleIdx]);

  // Scanning line sweep while analysing (static when reduced motion is on).
  useEffect(() => {
    if (stage !== 'analyzing') return;
    if (reduce) {
      scan.set(0.5);
      return;
    }
    scan.set(0);
    scan.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(scan);
  }, [stage, reduce, scan]);

  // Gentle "focusing" breath on the corner brackets while the camera is idle.
  useEffect(() => {
    if (stage !== 'camera' || reduce) {
      pulse.set(withTiming(0, { duration: MOTION.fast }));
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(pulse);
  }, [stage, reduce, pulse]);

  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scan.get(), [0, 1], [6 - 40, frame - 10 - 40]) }] }));
  const shotStyle = useAnimatedStyle(() => ({ opacity: shot.get() }));
  const swapStyle = useAnimatedStyle(() => ({ opacity: swap.get(), transform: [{ scale: interpolate(swap.get(), [0, 1], [0.92, 1]) }] }));
  const bracketStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulse.get(), [0, 1], [1, 0.97]) }] }));

  const capture = () => {
    tap();
    shot.set(withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 380 })));
    setStep(0);
    setStage('analyzing');
  };
  const nextSample = () => {
    tap();
    swap.set(withTiming(0, { duration: 130 }));
    timers.current.push(
      setTimeout(() => {
        setSampleIdx((i) => (i + 1) % SNAP_SAMPLES.length);
        swap.set(withTiming(1, { duration: 200 }));
      }, 130),
    );
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
          <IconButton icon="close" color={C.white} bg={GLASS} onPress={goBack} />
          <Text style={st.topTitle}>Meal detected</Text>
          <View style={{ width: 40 }} />
        </View>
        <Animated.View entering={fadeEnter()} style={st.resHead}>
          <View style={st.thumb}>
            <LinearGradient colors={['#4A3424', '#2A1D14']} style={StyleSheet.absoluteFill} />
            <Plate size={84} items={sample.items} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={st.matchTag}>
              <Ionicons name="sparkles" size={11} color={C.aiBorder} />
              <Text style={st.matchTagText}>AI SCAN</Text>
            </View>
            <Text style={st.resTitle}>{sample.title}</Text>
            <Text style={st.resSub}>
              {items.length} items found · {Math.round(items.reduce((a, i) => a + confidence(i.foodId), 0) / Math.max(items.length, 1))}% match
            </Text>
            {date !== todayKey() && <Pill text={`For ${relDay(date)}`} icon="calendar-outline" color={C.navy} bg={C.gold} style={{ marginTop: 8 }} />}
          </View>
        </Animated.View>

        <Animated.View entering={enter(1)} style={st.sheet}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {/* AI summary */}
            <RiaNote title="Ria's take" style={st.aiCard}>
              <View style={st.totRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[T.tiny, { color: C.ai }]}>TOTAL · {sel.length} SELECTED</Text>
                  <CountUp value={tot.kcal} format={fmtNum} style={st.totalKcal}>
                    <Text style={st.totalUnit}> kcal</Text>
                  </CountUp>
                </View>
                {sel.length > 0 && (
                  <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))} style={{ alignItems: 'center' }}>
                    <ScoreRing score={score} size={56} />
                    <Text style={[T.tiny, { marginTop: 4 }]}>Meal score</Text>
                  </Animated.View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <MiniMacro label="Carbs" value={tot.carbs} color={C.carbs} />
                <MiniMacro label="Protein" value={tot.protein} color={C.protein} />
                <MiniMacro label="Fat" value={tot.fat} color={C.fat} />
              </View>
              {sel.length > 0 && <Text style={st.verdict}>{verdict}</Text>}
            </RiaNote>

            <View style={st.sheetHead}>
              <Text style={T.h3}>Detected items</Text>
              <Text style={T.tiny}>Tap to include / exclude</Text>
            </View>
            {items.map((it, idx) => {
              const f = foodById(it.foodId);
              if (!f) return null;
              return (
                <Animated.View key={it.foodId} entering={enter(2 + idx)}>
                  {idx > 0 && <View style={st.itemSep} />}
                  <ItemRow
                    on={it.on}
                    onToggle={() => {
                      tap();
                      setItem(idx, { on: !it.on });
                    }}>
                    <CheckMark on={it.on} />
                    <EmojiTile food={f} size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.itemName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      <Text style={T.tiny} numberOfLines={1}>
                        {fmtNum(f.kcal * it.qty)} kcal · {f.unit}
                      </Text>
                    </View>
                    <View style={st.mini}>
                      <PressableScale
                        scaleTo={0.85}
                        hitSlop={6}
                        onPress={() => {
                          tap();
                          setItem(idx, { qty: Math.max(0.5, it.qty - 0.5), on: true });
                        }}
                        style={st.miniBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Less ${f.name}`}>
                        <Ionicons name="remove" size={16} color={C.primaryDark} />
                      </PressableScale>
                      <Text style={st.miniQty}>{fmtQty(it.qty)}</Text>
                      <PressableScale
                        scaleTo={0.85}
                        hitSlop={6}
                        onPress={() => {
                          tap();
                          setItem(idx, { qty: Math.min(10, it.qty + 0.5), on: true });
                        }}
                        style={[st.miniBtn, { backgroundColor: C.primaryDark }]}
                        accessibilityRole="button"
                        accessibilityLabel={`More ${f.name}`}>
                        <Ionicons name="add" size={16} color={C.white} />
                      </PressableScale>
                    </View>
                  </ItemRow>
                </Animated.View>
              );
            })}

            <Text style={[T.label, { marginTop: 22, marginBottom: 10, paddingHorizontal: 20 }]}>Add to</Text>
            <MealChips value={meal} onChange={setMeal} style={{ paddingHorizontal: 4 }} />
          </ScrollView>
          <View style={[st.actions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Button title="Retake" icon="camera-reverse-outline" variant="outline" onPress={() => setStage('camera')} style={{ paddingHorizontal: 16 }} />
            <Button
              title={sel.length ? `Add ${sel.length} item${sel.length > 1 ? 's' : ''} to ${mealLabel(meal)}` : 'Select an item'}
              disabled={!sel.length}
              onPress={log}
              style={{ flex: 1, paddingHorizontal: 12 }}
              textStyle={{ fontSize: 15 }}
            />
          </View>
        </Animated.View>
      </View>
    );
  }

  /* ---------- Camera / analysing ---------- */
  const analyzing = stage === 'analyzing';
  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={st.topBar}>
        <IconButton icon="close" color={C.white} bg={GLASS} onPress={analyzing ? () => setStage('camera') : goBack} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={st.topTitle}>Snap & Log</Text>
          <Pill text="AI" icon="sparkles" color={C.ai} bg={C.aiSoft} />
        </View>
        <IconButton icon={flash ? 'flash' : 'flash-off'} color={flash ? C.gold : C.white} bg={GLASS} onPress={() => setFlash((f) => !f)} />
      </View>

      <View style={st.center}>
        <Animated.Text key={analyzing ? 'a' : 'c'} entering={fadeEnter()} style={st.hint}>
          {analyzing ? 'Analysing your meal…' : 'Point at your meal'}
        </Animated.Text>
        <Text style={st.hintSub}>{analyzing ? 'Hold on, this takes a moment' : 'Keep the whole plate inside the frame'}</Text>

        <View style={{ width: frame + 16, height: frame + 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
          <View style={[st.frame, { width: frame, height: frame }]}>
            <LinearGradient colors={flash ? ['#6B4C35', '#3D2B1D'] : ['#3B2A1E', '#1A120C']} style={StyleSheet.absoluteFill} />
            <Animated.View style={swapStyle}>
              <Plate size={frame * 0.82} items={sample.items} detected={analyzing && step >= 1} />
            </Animated.View>
            {!analyzing && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[st.gridV, { left: '33.33%' }]} />
                <View style={[st.gridV, { left: '66.66%' }]} />
                <View style={[st.gridH, { top: '33.33%' }]} />
                <View style={[st.gridH, { top: '66.66%' }]} />
              </View>
            )}
            {analyzing && (
              <>
                <Animated.View entering={nativeOnly(FadeIn.duration(MOTION.base))} pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,168,125,0.08)' }]} />
                <Animated.View pointerEvents="none" style={[st.scanWrap, scanStyle]}>
                  <LinearGradient colors={['rgba(18,168,125,0)', 'rgba(18,168,125,0.28)']} style={st.scanTrail} />
                  <View style={st.scanLine} />
                </Animated.View>
              </>
            )}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.white }, shotStyle]} />
          </View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bracketStyle]}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <View key={c} style={[st.corner, st[c], analyzing && { borderColor: C.primary }]} />
            ))}
          </Animated.View>
        </View>

        {analyzing ? (
          <Animated.View entering={fadeEnter()} style={st.steps}>
            <ProgressBar value={step / STEPS.length} color={C.primary} track="rgba(255,255,255,0.14)" height={4} style={{ marginBottom: 14 }} />
            {STEPS.map((s, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <View key={s} style={[st.stepRow, !done && !active && { opacity: 0.4 }]}>
                  <View style={st.stepIcon}>
                    {done ? (
                      <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base))}>
                        <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                      </Animated.View>
                    ) : active ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="rgba(255,255,255,0.6)" />
                    )}
                  </View>
                  <Text style={[st.stepText, done && { color: C.white }]}>{s}</Text>
                </View>
              );
            })}
          </Animated.View>
        ) : (
          <PressableScale scaleTo={0.96} onPress={nextSample} style={st.sampleChip} accessibilityRole="button">
            <Ionicons name="shuffle" size={15} color={C.white} />
            <Text style={st.sampleText}>
              Sample: {sample.title} · <Text style={{ color: C.gold }}>Try another</Text>
            </Text>
          </PressableScale>
        )}
      </View>

      <View style={[st.controls, { paddingBottom: Math.max(insets.bottom, 12) + 16, opacity: analyzing ? 0.35 : 1, pointerEvents: analyzing ? 'none' : 'auto' }]}>
        <PressableScale scaleTo={0.92} onPress={nextSample} style={st.side} accessibilityRole="button">
          <View style={st.sideIcon}>
            <Ionicons name="images-outline" size={22} color={C.white} />
          </View>
          <Text style={st.sideText}>Gallery</Text>
        </PressableScale>
        <PressableScale scaleTo={0.92} onPress={capture} style={st.shutter} accessibilityRole="button" accessibilityLabel="Capture">
          <View style={st.shutterInner}>
            <Ionicons name="sparkles" size={22} color={C.primaryDark} />
          </View>
        </PressableScale>
        <PressableScale
          scaleTo={0.92}
          onPress={() => {
            tap();
            setTips(true);
          }}
          style={st.side}
          accessibilityRole="button">
          <View style={st.sideIcon}>
            <Ionicons name="help-circle-outline" size={24} color={C.white} />
          </View>
          <Text style={st.sideText}>Tips</Text>
        </PressableScale>
      </View>

      <Sheet visible={tips} onClose={() => setTips(false)} title="Tips for accurate results">
        {TIPS.map((t) => (
          <View key={t.title} style={st.tipRow}>
            <IconTile icon={t.icon} color={t.color} bg={t.bg} size={44} />
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

/** Detected-item row: dims smoothly when excluded. */
function ItemRow({ on, onToggle, children }: { on: boolean; onToggle: () => void; children: ReactNode }) {
  const o = useSharedValue(on ? 1 : 0.45);
  useEffect(() => {
    o.set(withTiming(on ? 1 : 0.45, { duration: MOTION.base }));
  }, [on, o]);
  const fade = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [pressed && { backgroundColor: C.surfaceAlt }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <Animated.View style={[st.item, fade]}>{children}</Animated.View>
    </Pressable>
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
              detected && { borderWidth: 2, borderColor: C.primary, backgroundColor: 'rgba(18,168,125,0.1)' },
            ]}>
            <Glyph emoji={f?.emoji} size={Math.round(emo * 1.3)} />
            {detected && size > 120 && (
              <Animated.View entering={nativeOnly(ZoomIn.duration(MOTION.base).delay(i * 60))} style={st.conf}>
                <Text style={st.confText}>{confidence(it.foodId)}%</Text>
              </Animated.View>
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
  topTitle: { color: C.white, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  hint: { color: C.white, fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  hintSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  frame: { borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: C.white },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 26 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 26 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 26 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 26 },
  scanWrap: { position: 'absolute', top: 0, left: 12, right: 12, height: 43 },
  scanTrail: { height: 40, borderRadius: 2 },
  scanLine: { height: 3, borderRadius: 2, backgroundColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  plate: { backgroundColor: '#F6F2EA', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  conf: { position: 'absolute', top: -9, left: -2, backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  confText: { color: C.white, fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sampleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 14, height: 38, borderRadius: R.pill, backgroundColor: GLASS, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  sampleText: { color: C.white, fontSize: 13, fontWeight: '600' },
  steps: { marginTop: 20, width: 236, padding: 14, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 12 },
  side: { alignItems: 'center', gap: 6, width: 72 },
  sideIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  sideText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  resHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 20 },
  thumb: { width: 96, height: 96, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  matchTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 6 },
  matchTagText: { color: C.aiBorder, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resTitle: { color: C.white, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  resSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  sheet: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, overflow: 'hidden' },
  aiCard: { marginHorizontal: 16, marginTop: 18 },
  totRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  totalKcal: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1, marginTop: 2, fontVariant: ['tabular-nums'] },
  totalUnit: { fontSize: 15, fontWeight: '600', color: C.muted, letterSpacing: 0 },
  verdict: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
  itemSep: { height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft, marginLeft: 110 },
  itemName: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  miniQty: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft, backgroundColor: C.card },
});
