import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOutUp,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { C, glow, MOTION, R, shadow, shadowSm } from '@/theme';
import { EASE_OUT, nativeOnly, PressableScale, useHeldWhileVisible, usePresence } from './motion';

export { CountUp, Enter, enter, EASE_OUT, fadeEnter, layoutTransition, nativeOnly, PressableScale, Skeleton, useHeldWhileVisible, usePresence } from './motion';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Selection tick for taps, toggles and chips. */
export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

/** Light impact for primary actions. */
export const impact = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/* ---------- Layout ---------- */

export function Screen({ children, edges = ['top'], bg = C.bg, style }: { children: React.ReactNode; edges?: ('top' | 'bottom')[]; bg?: string; style?: ViewStyle }) {
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Top bar with back arrow, centred title and an optional right element. */
export function Header({ title, onBack, right, transparent }: { title?: string; onBack?: () => void; right?: React.ReactNode; transparent?: boolean }) {
  return (
    <View style={[s.header, transparent && { backgroundColor: 'transparent' }]}>
      <IconButton icon="chevron-back" bordered onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <Text style={s.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Large left-aligned title for tab roots and top-level screens. */
export function ScreenTitle({ title, subtitle, right, style }: { title: string; subtitle?: string; right?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[s.screenTitle, style]}>
      <View style={{ flex: 1 }}>
        {!!subtitle && (
          <Text style={T.small} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <Text style={T.h1} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = C.text,
  bg = C.card,
  size = 22,
  badge,
  style,
  bordered,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  bg?: string;
  size?: number;
  badge?: number;
  style?: ViewStyle;
  /** Hairline ring, for icon buttons sitting directly on the canvas. */
  bordered?: boolean;
}) {
  return (
    <PressableScale
      hitSlop={8}
      scaleTo={0.9}
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[s.iconBtn, { backgroundColor: bg }, bordered && bg === C.card && s.iconBtnBorder, style]}>
      <Ionicons name={icon} size={size} color={color} />
      {!!badge && (
        <View style={s.badgeDot}>
          <Text style={s.badgeDotText}>{badge}</Text>
        </View>
      )}
    </PressableScale>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  if (onPress)
    return (
      <PressableScale
        scaleTo={0.98}
        onPress={() => {
          tap();
          onPress();
        }}
        style={[s.card, style]}>
        {children}
      </PressableScale>
    );
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  return (
    <View style={[s.sectionRow, style]}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && (
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            onAction?.();
          }}
          style={({ pressed }) => [s.sectionActionWrap, pressed && { opacity: 0.6 }]}>
          <Text style={s.sectionAction}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

/** Rounded-square tinted icon used in lists, stats and quick actions. */
export function IconTile({ icon, color = C.primaryDark, bg = C.primarySoft, size = 40, iconSize, radius }: { icon: IconName; color?: string; bg?: string; size?: number; iconSize?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.48)} color={color} />
    </View>
  );
}

/* ---------- Text helpers ---------- */

export const T = StyleSheet.create({
  display: { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  h1: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.7 },
  h2: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  body: { fontSize: 15, color: C.textSoft, lineHeight: 22 },
  small: { fontSize: 13, color: C.textSoft, lineHeight: 18 },
  tiny: { fontSize: 11, color: C.muted, fontWeight: '600', letterSpacing: 0.2 },
  label: { fontSize: 12, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  num: { fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
});

/* ---------- Buttons ---------- */

const BTN = {
  primary: { bg: C.primaryDark, fg: C.white, border: C.primaryDark },
  secondary: { bg: C.primarySoft, fg: C.primaryDark, border: C.primarySoft },
  outline: { bg: C.card, fg: C.text, border: C.border },
  ghost: { bg: 'transparent', fg: C.primaryDark, border: 'transparent' },
  danger: { bg: C.dangerSoft, fg: C.danger, border: C.dangerSoft },
  dark: { bg: C.navy, fg: C.white, border: C.navy },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
  textStyle,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  textStyle?: TextStyle;
  small?: boolean;
}) {
  const v = BTN[variant];
  const off = disabled || loading;
  const offPrimary = !!disabled && (variant === 'primary' || variant === 'dark');
  const fg = offPrimary ? C.white : v.fg;
  return (
    <PressableScale
      disabled={off}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={() => {
        if (variant === 'primary' || variant === 'dark') impact();
        else tap();
        onPress?.();
      }}
      style={[
        s.btn,
        small && s.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        variant === 'primary' && !off && !small && glow(C.primaryDark),
        offPrimary && s.btnOff,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: fg }, textStyle]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

/* ---------- Selection ---------- */

export function Chip({ label, selected, onPress, icon, color = C.primaryDark, style }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; color?: string; style?: ViewStyle }) {
  return (
    <PressableScale
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[s.chip, selected && { backgroundColor: color, borderColor: color }, style]}>
      {icon && <Ionicons name={icon} size={15} color={selected ? C.white : C.textSoft} style={{ marginRight: 6 }} />}
      <Text style={[s.chipText, selected && { color: C.white }]}>{label}</Text>
    </PressableScale>
  );
}

/** Large selectable row used throughout onboarding and settings. */
export function OptionCard({
  title,
  subtitle,
  emoji,
  icon,
  selected,
  onPress,
  multi,
  badge,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  multi?: boolean;
  badge?: string;
}) {
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: !!selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[s.option, selected && s.optionSelected]}>
      {emoji ? (
        <View style={[s.optionEmoji, selected && { backgroundColor: C.white }]}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
      ) : icon ? (
        <View style={[s.optionEmoji, selected && { backgroundColor: C.white }]}>
          <Ionicons name={icon} size={20} color={C.primaryDark} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.optionTitle}>{title}</Text>
          {badge && (
            <View style={s.optionBadge}>
              <Text style={s.optionBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={s.optionSub}>{subtitle}</Text>}
      </View>
      <View style={[multi ? s.check : s.radio, selected && (multi ? s.checkOn : s.radioOn)]}>
        {selected && (multi ? <Ionicons name="checkmark" size={15} color={C.white} /> : <View style={s.radioDot} />)}
      </View>
    </PressableScale>
  );
}

/** Segmented control with a sliding thumb. */
export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; style?: ViewStyle }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const itemW = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);
  const ready = useSharedValue(0);

  useEffect(() => {
    if (!itemW) return;
    if (ready.get() === 0) {
      x.set(index * itemW);
      ready.set(1);
    } else x.set(withSpring(index * itemW, MOTION.spring));
  }, [index, itemW, x, ready]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], opacity: ready.get() }));

  return (
    <View style={[s.seg, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {itemW > 0 && <Animated.View pointerEvents="none" style={[s.segThumb, { width: itemW }, thumb]} />}
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.value }}
          onPress={() => {
            tap();
            onChange(o.value);
          }}
          style={s.segItem}>
          <Text style={[s.segText, value === o.value && s.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(value ? 1 : 0, MOTION.pressSpring));
  }, [value, p]);
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(p.get(), [0, 1], [C.border, C.primary]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 20 }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => {
        tap();
        onChange(!value);
      }}
      hitSlop={8}>
      <Animated.View style={[s.toggle, track]}>
        <Animated.View style={[s.toggleKnob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, format }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; format?: (v: number) => string }) {
  // Track the latest value locally so rapid taps accumulate before the parent re-renders.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const set = (v: number) => {
    const next = Math.round(Math.max(min, Math.min(max, v)) * 100) / 100;
    latest.current = next;
    onChange(next);
  };
  return (
    <View style={s.stepper}>
      <IconButton icon="remove" bg={C.primarySoft} color={C.primaryDark} onPress={() => set(latest.current - step)} />
      <Text style={s.stepperValue}>{format ? format(value) : value}</Text>
      <IconButton icon="add" bg={C.primaryDark} color={C.white} onPress={() => set(latest.current + step)} />
    </View>
  );
}

/* ---------- Progress ---------- */

/** Animates from 0 on mount, then eases to each new value. */
function useProgress(value: number) {
  const pct = Math.max(0, Math.min(1, value || 0));
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(pct, { duration: MOTION.progress, easing: EASE_OUT }));
  }, [pct, p]);
  return p;
}

export function ProgressBar({ value, color = C.primary, track = C.borderSoft, height = 8, style }: { value: number; color?: string; track?: string; height?: number; style?: ViewStyle }) {
  const p = useProgress(value);
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color }, fill]} />
    </View>
  );
}

const ACircle = Animated.createAnimatedComponent(Circle);

export function Ring({
  size = 120,
  stroke = 12,
  value,
  color = C.primary,
  track = C.borderSoft,
  gradient,
  children,
}: {
  size?: number;
  stroke?: number;
  value: number;
  color?: string;
  track?: string;
  /** Optional two-stop gradient for the progress stroke. */
  gradient?: [string, string];
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useProgress(value);
  const gid = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {gradient && (
          <Defs>
            <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </SvgGradient>
          </Defs>
        )}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={gradient ? `url(#${gid})` : color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
        />
      </Svg>
      {children}
    </View>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        <Text style={{ fontSize: 12, color: C.textSoft, fontWeight: '600' }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <ProgressBar value={value / target} color={color} height={6} />
      <Text style={{ fontSize: 12, color: C.text, fontWeight: '700', marginTop: 6, fontVariant: ['tabular-nums'] }}>
        {Math.round(value)}
        <Text style={{ color: C.muted, fontWeight: '500' }}>/{target}g</Text>
      </Text>
    </View>
  );
}

/* ---------- Feedback ---------- */

export function EmptyState({ emoji, icon, title, text, action, onAction }: { emoji?: string; icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyArt}>
        {icon ? <Ionicons name={icon} size={30} color={C.primary} /> : <Text style={{ fontSize: 34 }}>{emoji}</Text>}
      </View>
      <Text style={[T.h3, { marginTop: 14, textAlign: 'center' }]}>{title}</Text>
      {text && <Text style={[T.small, { textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 280 }]}>{text}</Text>}
      {action && <Button title={action} onPress={onAction} small variant="secondary" style={{ marginTop: 16, paddingHorizontal: 18 }} />}
    </View>
  );
}

export function Pill({ text, color = C.primaryDark, bg = C.primarySoft, icon, style }: { text: string; color?: string; bg?: string; icon?: IconName; style?: ViewStyle }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }, style]}>
      {icon && <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} />}
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** Bottom sheet: fading backdrop, spring-free slide-up panel, drag the handle down to dismiss. */
export function Sheet({ visible, onClose, title, children, scroll = false }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const mounted = usePresence(visible, MOTION.sheetOut);
  const shownTitle = useHeldWhileVisible(title, visible);
  const shownChildren = useHeldWhileVisible(children, visible);
  const p = useSharedValue(0);
  const drag = useSharedValue(0);
  const h = useSharedValue(winH);

  useEffect(() => {
    if (visible) {
      drag.set(0);
      p.set(withTiming(1, { duration: MOTION.sheetIn, easing: EASE_OUT }));
    } else p.set(withTiming(0, { duration: MOTION.sheetOut, easing: Easing.in(Easing.quad) }));
  }, [visible, p, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.set(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110 || g.vy > 1.1) onClose();
          else drag.set(withSpring(0, MOTION.spring));
        },
        onPanResponderTerminate: () => drag.set(withSpring(0, MOTION.spring)),
      }),
    [drag, onClose],
  );

  const backdrop = useAnimatedStyle(() => ({ opacity: p.get() }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: drag.get() + interpolate(p.get(), [0, 1], [h.get(), 0]) }] }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => h.set(e.nativeEvent.layout.height + 40)}
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }, panel]}>
          <View {...pan.panHandlers}>
            <View style={s.grabberZone}>
              <View style={s.grabber} />
            </View>
            {shownTitle ? (
              <View style={s.sheetHead}>
                <Text style={[T.h3, { flex: 1, fontSize: 19 }]} numberOfLines={2}>
                  {shownTitle}
                </Text>
                <IconButton icon="close" bg={C.borderSoft} size={18} style={{ width: 34, height: 34 }} onPress={onClose} />
              </View>
            ) : null}
          </View>
          {scroll ? (
            <ScrollView style={{ maxHeight: Math.min(560, winH * 0.68) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {shownChildren}
            </ScrollView>
          ) : (
            shownChildren
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Centered dialog used for simulated system permission prompts and confirmations. */
export function Dialog({ visible, title, text, icon, iconName, confirm = 'OK', cancel, onConfirm, onCancel, danger }: { visible: boolean; title: string; text?: string; icon?: string; /** Vector icon shown in the badge instead of an emoji `icon`. */ iconName?: IconName; confirm?: string; cancel?: string; onConfirm: () => void; onCancel?: () => void; danger?: boolean }) {
  const mounted = usePresence(visible, MOTION.fast);
  // Hold each field separately (primitives) so closing doesn't flash new/empty content.
  const held = {
    title: useHeldWhileVisible(title, visible),
    text: useHeldWhileVisible(text, visible),
    icon: useHeldWhileVisible(icon, visible),
    iconName: useHeldWhileVisible(iconName, visible),
    confirm: useHeldWhileVisible(confirm, visible),
    cancel: useHeldWhileVisible(cancel, visible),
    danger: useHeldWhileVisible(danger, visible),
  };
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(visible ? withSpring(1, { damping: 20, stiffness: 260, mass: 0.7 }) : withTiming(0, { duration: MOTION.fast }));
  }, [visible, p]);
  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, p.get()) }));
  const box = useAnimatedStyle(() => ({ opacity: Math.min(1, p.get()), transform: [{ scale: interpolate(p.get(), [0, 1], [0.92, 1]) }] }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel ?? onConfirm} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }, backdrop]} />
        <Animated.View style={[s.dialog, box]}>
          {held.iconName ? (
            <View style={s.dialogIcon}>
              <Ionicons name={held.iconName} size={30} color={held.danger ? C.danger : C.primaryDark} />
            </View>
          ) : held.icon ? (
            <View style={s.dialogIcon}>
              <Text style={{ fontSize: 30 }}>{held.icon}</Text>
            </View>
          ) : null}
          <Text style={[T.h3, { textAlign: 'center', fontSize: 18 }]}>{held.title}</Text>
          {held.text && <Text style={[T.small, { textAlign: 'center', marginTop: 8, lineHeight: 20 }]}>{held.text}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
            {held.cancel && <Button title={held.cancel} variant="outline" onPress={onCancel} style={{ flex: 1 }} small />}
            <Button title={held.confirm} variant={held.danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} small />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ---------- Toast ---------- */

type ToastMsg = { id: number; text: string; icon: IconName };
const ToastCtx = createContext<(text: string, icon?: IconName) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((text: string, icon: IconName = 'checkmark-circle') => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text, icon });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View
          key={msg.id}
          pointerEvents="none"
          entering={nativeOnly(FadeInUp.springify().damping(18).stiffness(220))}
          exiting={nativeOnly(FadeOutUp.duration(MOTION.base))}
          style={[s.toast, { top: insets.top + 10 }]}>
          <View style={s.toastIcon}>
            <Ionicons name={msg.icon} size={16} color={C.white} />
          </View>
          <Text style={s.toastText}>{msg.text}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: C.borderSoft }, style]} />;
}

/** Tappable settings-style row. */
export function ListRow({ icon, iconColor = C.primaryDark, iconBg = C.primarySoft, title, subtitle, right, onPress, chevron = true }: { icon?: IconName; iconColor?: string; iconBg?: string; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; chevron?: boolean }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [s.listRow, pressed && { backgroundColor: C.surfaceAlt }]}>
      {icon && (
        <View style={[s.listIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{title}</Text>
        {subtitle && <Text style={[T.small, { marginTop: 2 }]}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && chevron && <Ionicons name="chevron-forward" size={18} color={C.muted} style={{ marginLeft: 6 }} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: C.bg },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  screenTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, paddingBottom: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconBtnBorder: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, ...shadowSm },
  badgeDot: { position: 'absolute', top: 1, right: 1, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.card },
  badgeDotText: { color: C.white, fontSize: 9, fontWeight: '800' },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.borderSoft, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  sectionActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionAction: { fontSize: 14, fontWeight: '600', color: C.primary },
  btn: { height: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 20, borderWidth: 1.5 },
  btnSmall: { height: 42, borderRadius: R.sm, paddingHorizontal: 14 },
  btnOff: { backgroundColor: '#D6D3D1', borderColor: '#D6D3D1' },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 10 },
  optionSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  optionEmoji: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.1 },
  optionSub: { fontSize: 13, color: C.textSoft, marginTop: 3, lineHeight: 18 },
  optionBadge: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionBadgeText: { color: C.white, fontSize: 10, fontWeight: '800' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  seg: { flexDirection: 'row', backgroundColor: '#EEEDEB', borderRadius: 14, padding: 4 },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 10, backgroundColor: C.card, ...shadowSm },
  segItem: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  segTextOn: { color: C.text, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 3 },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, ...shadowSm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperValue: { fontSize: 22, fontWeight: '800', color: C.text, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  emptyArt: { width: 76, height: 76, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: 20 },
  grabberZone: { paddingTop: 10, paddingBottom: 12, alignItems: 'center' },
  grabber: { width: 38, height: 5, borderRadius: 3, backgroundColor: C.border },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dialog: { backgroundColor: C.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, ...shadow },
  dialogIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  toast: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 18, ...shadow, zIndex: 999 },
  toastIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  toastText: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 19 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 12 },
  listIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
