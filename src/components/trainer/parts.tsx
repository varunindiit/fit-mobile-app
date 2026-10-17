import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Glyph } from '@/components/Glyph';
import { sessionArt } from '@/components/glyphs';
import { ExerciseArt } from '@/components/program/ExerciseArt';
import { itemLabel } from '@/components/program/session';
import { PressableScale, tap, type IconName } from '@/components/ui';
import { exerciseById } from '@/data/program';
import { PRO_DEMO_CREDIT, hasProDemo } from '@/data/proDemos';
import { planSummary, type TrainerPlan } from '@/data/trainerPlans';
import { availability, firstName, type Trainer } from '@/data/trainers';
import { C, R, fade, shadowSm } from '@/theme';

/** Initials avatar for a trainer, tinted with their accent. No stock photography is used. */
export function TrainerAvatar({ trainer, size = 52, online, style }: { trainer: Trainer; size?: number; online?: boolean; style?: ViewStyle }) {
  const initials = trainer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const dot = Math.round(size * 0.26);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fade(trainer.color, 0.14), borderWidth: 1.5, borderColor: fade(trainer.color, 0.3), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: trainer.color, fontWeight: '800', fontSize: Math.round(size * 0.36), letterSpacing: -0.4 }}>{initials}</Text>
      </View>
      {online !== undefined && (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: online ? C.primary : C.muted,
            borderWidth: Math.max(2, Math.round(size * 0.05)),
            borderColor: C.card,
          }}
        />
      )}
    </View>
  );
}

/** "Online now" / "Back at 18:00" line with a status dot. */
export function AvailabilityLine({ trainer, style }: { trainer: Trainer; style?: ViewStyle }) {
  const a = availability(trainer);
  return (
    <View style={[s.availRow, style]}>
      <View style={[s.availDot, { backgroundColor: a.online ? C.primary : C.muted }]} />
      <Text style={[s.availText, a.online && { color: C.primaryDark }]} numberOfLines={1}>
        {a.label}
      </Text>
    </View>
  );
}

/** Caption that must sit under any Pro demonstration, so it is never read as video of the user's coach. */
export function ProDemoNote({ style }: { style?: ViewStyle }) {
  return (
    <View style={[s.note, style]}>
      <Ionicons name="information-circle-outline" size={13} color={C.muted} />
      <Text style={s.noteText} numberOfLines={2}>
        {PRO_DEMO_CREDIT}
      </Text>
    </View>
  );
}

export const openPlan = (key: string) => {
  tap();
  router.push({ pathname: '/program-day', params: { key } });
};
export const startPlan = (key: string) => {
  tap();
  router.push({ pathname: '/player', params: { key } });
};

/**
 * A workout the coach shared: title, the real exercise list with demonstrations,
 * and the two ways in — open the details or start it right now.
 *
 * `pro` comes from the entitlement layer and decides whether the thumbnails show
 * the Pro photo demonstrations; this component never decides that itself.
 */
export function TrainerPlanCard({
  plan,
  pro,
  trainer,
  restSeconds = 30,
  maxRows = 4,
  style,
}: {
  plan: TrainerPlan;
  pro: boolean;
  trainer?: Trainer;
  restSeconds?: number;
  /** Rows shown before "+n more". */
  maxRows?: number;
  style?: ViewStyle;
}) {
  const stats = planSummary(plan, restSeconds);
  const rows = plan.items.slice(0, maxRows);
  const extra = plan.items.length - rows.length;
  const showsDemo = pro && plan.items.some((it) => hasProDemo(it.exerciseId));

  return (
    <View style={[s.card, style]}>
      <View style={[s.cardHead, { backgroundColor: fade(plan.colors[1], 0.1) }]}>
        <LinearGradient colors={plan.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cardIcon}>
          <Glyph emoji={plan.emoji} src={sessionArt(plan.key)} size={28} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {plan.title}
          </Text>
          <Text style={s.cardMeta} numberOfLines={1}>
            {stats.exercises} moves · {stats.minutes} min · ~{stats.kcal} kcal
          </Text>
        </View>
      </View>

      {!!trainer && (
        <View style={s.noteRow}>
          <TrainerAvatar trainer={trainer} size={26} />
          <Text style={s.noteBody}>
            <Text style={{ fontWeight: '700', color: C.text }}>{firstName(trainer)}: </Text>
            {plan.note}
          </Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        {rows.map((it, i) => (
          <Row key={`${it.exerciseId}-${i}`} index={i} item={it} pro={pro} accent={plan.colors[1]} />
        ))}
        {extra > 0 && <Text style={s.more}>+{extra} more</Text>}
      </View>

      {showsDemo && <ProDemoNote style={{ marginHorizontal: 12, marginTop: 4 }} />}

      <View style={s.cardFoot}>
        <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={() => openPlan(plan.key)} style={s.ghostBtn}>
          <Ionicons name="list-outline" size={16} color={C.text} />
          <Text style={s.ghostText}>Details</Text>
        </PressableScale>
        <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={() => startPlan(plan.key)} style={[s.startBtn, { backgroundColor: plan.colors[1] }]}>
          <Ionicons name="play" size={15} color={C.white} />
          <Text style={s.startText}>Start workout</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function Row({ index, item, pro, accent }: { index: number; item: { exerciseId: string; reps?: number; seconds?: number }; pro: boolean; accent: string }) {
  const ex = exerciseById(item.exerciseId);
  return (
    <View style={[s.row, index > 0 && s.rowBorder]}>
      <ExerciseArt id={ex.id} emoji={ex.emoji} size={40} radius={12} animated pro={pro} tint={['#FFFFFF', fade(accent, 0.16)]} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>
          {ex.name}
        </Text>
        <Text style={s.rowMuscles} numberOfLines={1}>
          {ex.muscles}
        </Text>
      </View>
      <View style={[s.amount, { backgroundColor: fade(accent, 0.12) }]}>
        <Text style={[s.amountText, { color: accent }]}>{itemLabel(item)}</Text>
      </View>
    </View>
  );
}

/** Round action button used on the trainer header (chat, audio, video). */
export function TrainerAction({ icon, label, color, onPress, style }: { icon: IconName; label: string; color: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <PressableScale
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[s.action, { backgroundColor: color }, style]}>
      <Ionicons name={icon} size={19} color={C.white} />
    </PressableScale>
  );
}

const s = StyleSheet.create({
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availDot: { width: 7, height: 7, borderRadius: 3.5 },
  availText: { fontSize: 12, fontWeight: '700', color: C.muted },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  noteText: { flex: 1, fontSize: 11, color: C.muted, fontWeight: '600' },
  card: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: 'hidden', ...shadowSm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  cardMeta: { fontSize: 12, color: C.textSoft, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  noteRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 12, alignItems: 'flex-start' },
  noteBody: { flex: 1, fontSize: 13, color: C.textSoft, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: C.borderSoft },
  rowName: { fontSize: 14, fontWeight: '700', color: C.text },
  rowMuscles: { fontSize: 11, color: C.muted, marginTop: 1 },
  amount: { borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  amountText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  more: { fontSize: 12, color: C.muted, fontWeight: '700', paddingVertical: 8 },
  cardFoot: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 10 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, paddingHorizontal: 16, borderRadius: R.md, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  ghostText: { fontSize: 14, fontWeight: '700', color: C.text },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: R.md },
  startText: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: 0.2 },
  action: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
