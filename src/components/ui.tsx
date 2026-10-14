import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { C, R, shadow } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
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
      <IconButton icon="arrow-back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <Text style={s.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, color = C.text, bg = C.card, size = 22, badge, style }: { icon: IconName; onPress?: () => void; color?: string; bg?: string; size?: number; badge?: number; style?: ViewStyle }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.6 : 1 }, style]}>
      <Ionicons name={icon} size={size} color={color} />
      {!!badge && (
        <View style={s.badgeDot}>
          <Text style={s.badgeDotText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [s.card, style as ViewStyle, pressed && { transform: [{ scale: 0.985 }], opacity: 0.95 }]}>
        {children}
      </Pressable>
    );
  return <View style={[s.card, style as ViewStyle]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  return (
    <View style={[s.sectionRow, style]}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && (
        <Pressable hitSlop={10} onPress={onAction}>
          <Text style={s.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Text helpers ---------- */

export const T = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.textSoft, lineHeight: 21 },
  small: { fontSize: 13, color: C.textSoft },
  tiny: { fontSize: 11, color: C.muted, fontWeight: '600' },
  label: { fontSize: 13, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
});

/* ---------- Buttons ---------- */

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
  const v = {
    primary: { bg: C.primary, fg: C.white, border: C.primary },
    secondary: { bg: C.primarySoft, fg: C.primaryDark, border: C.primarySoft },
    outline: { bg: C.card, fg: C.text, border: C.border },
    ghost: { bg: 'transparent', fg: C.primaryDark, border: 'transparent' },
    danger: { bg: C.dangerSoft, fg: C.danger, border: C.dangerSoft },
    dark: { bg: C.navy, fg: C.white, border: C.navy },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        off && variant === 'primary' && { backgroundColor: '#C9D3DD', borderColor: '#C9D3DD' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={off && variant === 'primary' ? C.white : v.fg} style={{ marginRight: 8 }} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: off && variant === 'primary' ? C.white : v.fg }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------- Selection ---------- */

export function Chip({ label, selected, onPress, icon, color = C.primary, style }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; color?: string; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[s.chip, selected && { backgroundColor: color, borderColor: color }, style]}>
      {icon && <Ionicons name={icon} size={15} color={selected ? C.white : C.textSoft} style={{ marginRight: 6 }} />}
      <Text style={[s.chipText, selected && { color: C.white }]}>{label}</Text>
    </Pressable>
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
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [s.option, selected && s.optionSelected, pressed && { opacity: 0.9 }]}>
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
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; style?: ViewStyle }) {
  return (
    <View style={[s.seg, style]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            tap();
            onChange(o.value);
          }}
          style={[s.segItem, value === o.value && s.segItemOn]}>
          <Text style={[s.segText, value === o.value && s.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      hitSlop={8}
      style={[s.toggle, value && { backgroundColor: C.primary }]}>
      <View style={[s.toggleKnob, value && { transform: [{ translateX: 20 }] }]} />
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
      <IconButton icon="add" bg={C.primary} color={C.white} onPress={() => set(latest.current + step)} />
    </View>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({ value, color = C.primary, track = C.borderSoft, height = 8, style }: { value: number; color?: string; track?: string; height?: number; style?: ViewStyle }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Ring({ size = 120, stroke = 12, value, color = C.primary, track = C.borderSoft, children }: { size?: number; stroke?: number; value: number; color?: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - pct)} />
      </Svg>
      {children}
    </View>
  );
}

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, color: C.textSoft, fontWeight: '600', marginBottom: 6 }}>{label}</Text>
      <ProgressBar value={value / target} color={color} height={6} />
      <Text style={{ fontSize: 12, color: C.text, fontWeight: '700', marginTop: 6 }}>
        {Math.round(value)}
        <Text style={{ color: C.muted, fontWeight: '500' }}>/{target}g</Text>
      </Text>
    </View>
  );
}

/* ---------- Feedback ---------- */

export function EmptyState({ emoji, title, text, action, onAction }: { emoji: string; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.empty}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={[T.h3, { marginTop: 10, textAlign: 'center' }]}>{title}</Text>
      {text && <Text style={[T.small, { textAlign: 'center', marginTop: 6, lineHeight: 19 }]}>{text}</Text>}
      {action && <Button title={action} onPress={onAction} small variant="secondary" style={{ marginTop: 14, paddingHorizontal: 18 }} />}
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

/** Bottom sheet built on Modal: slide-up panel with dim backdrop. */
export function Sheet({ visible, onClose, title, children, scroll = false }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }]} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={s.grabber} />
          {title && (
            <View style={s.sheetHead}>
              <Text style={T.h3}>{title}</Text>
              <IconButton icon="close" bg={C.borderSoft} size={18} onPress={onClose} />
            </View>
          )}
          {scroll ? <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">{children}</ScrollView> : children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Centered dialog used for simulated system permission prompts and confirmations. */
export function Dialog({ visible, title, text, icon, confirm = 'OK', cancel, onConfirm, onCancel, danger }: { visible: boolean; title: string; text?: string; icon?: string; confirm?: string; cancel?: string; onConfirm: () => void; onCancel?: () => void; danger?: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={s.dialog}>
          {icon && <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>{icon}</Text>}
          <Text style={[T.h3, { textAlign: 'center' }]}>{title}</Text>
          {text && <Text style={[T.small, { textAlign: 'center', marginTop: 8, lineHeight: 19 }]}>{text}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {cancel && <Button title={cancel} variant="outline" onPress={onCancel} style={{ flex: 1 }} small />}
            <Button title={confirm} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} small />
          </View>
        </View>
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
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (text: string, icon: IconName = 'checkmark-circle') => {
      if (timer.current) clearTimeout(timer.current);
      setMsg({ id: Date.now(), text, icon });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setMsg(null));
      }, 2200);
    },
    [anim],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.toast,
            { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
          ]}>
          <Ionicons name={msg.icon} size={20} color={C.primary} />
          <Text style={s.toastText}>{msg.text}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: C.borderSoft }, style]} />;
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
      style={({ pressed }) => [s.listRow, pressed && { backgroundColor: C.borderSoft }]}>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeDotText: { color: C.white, fontSize: 10, fontWeight: '800' },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, ...shadow },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  sectionAction: { fontSize: 14, fontWeight: '700', color: C.primary },
  btn: { height: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 20, borderWidth: 1.5 },
  btnSmall: { height: 42, borderRadius: 12, paddingHorizontal: 14 },
  btnText: { fontSize: 16, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, marginBottom: 10 },
  optionSelected: { borderColor: C.primary, backgroundColor: C.primarySoft },
  optionEmoji: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  optionSub: { fontSize: 13, color: C.textSoft, marginTop: 3, lineHeight: 18 },
  optionBadge: { backgroundColor: C.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  optionBadgeText: { color: C.white, fontSize: 10, fontWeight: '800' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  seg: { flexDirection: 'row', backgroundColor: C.borderSoft, borderRadius: 12, padding: 4 },
  segItem: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segItemOn: { backgroundColor: C.card, ...shadow },
  segText: { fontSize: 14, fontWeight: '600', color: C.textSoft },
  segTextOn: { color: C.text, fontWeight: '700' },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: C.border, padding: 3 },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, ...shadow },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperValue: { fontSize: 22, fontWeight: '800', color: C.text, minWidth: 64, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontWeight: '800' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.border, alignSelf: 'center', marginBottom: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dialog: { backgroundColor: C.card, borderRadius: 22, padding: 22, width: '100%', maxWidth: 340 },
  toast: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.navy, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, ...shadow, zIndex: 999 },
  toastText: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 4 },
  listIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
