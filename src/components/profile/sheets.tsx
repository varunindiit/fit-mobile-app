import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Divider, IconTile, ListRow, OptionCard, PressableScale, Segmented, Sheet, Stepper, T, Toggle, tap, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C, MOTION, R } from '@/theme';
import { tint } from './shared';

type SheetProps = { visible: boolean; onClose: () => void };

export const LANGUAGES = ['English', 'हिन्दी (Hindi)', 'தமிழ் (Tamil)', 'తెలుగు (Telugu)', 'मराठी (Marathi)', 'বাংলা (Bengali)'];

const COUNTDOWNS = [5, 10, 15];

export function WorkoutSettingsSheet({ visible, onClose }: SheetProps) {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  const s = state.settings;
  return (
    <Sheet visible={visible} onClose={onClose} title="Workout settings" scroll>
      <View style={st.group}>
        <View style={st.row}>
          <IconTile icon="timer-outline" color={C.workout} bg={C.workoutSoft} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Rest duration</Text>
            <Text style={T.small}>Break between exercises</Text>
          </View>
        </View>
        <View style={st.stepperWrap}>
          <Stepper value={s.restSeconds} step={5} min={10} max={60} format={(v) => `${v}s`} onChange={(restSeconds) => updateSettings({ restSeconds })} />
        </View>
      </View>

      <View style={[st.group, { marginTop: 10 }]}>
        <View style={st.row}>
          <IconTile icon="hourglass-outline" color={C.steps} bg={C.stepsSoft} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={st.label}>Countdown before exercise</Text>
            <Text style={T.small}>Get ready time before each move starts</Text>
          </View>
        </View>
        <Segmented<string>
          style={{ marginTop: 14 }}
          options={COUNTDOWNS.map((v) => ({ value: String(v), label: `${v} sec` }))}
          value={String(s.countdown)}
          onChange={(v) => updateSettings({ countdown: Number(v) })}
        />
      </View>

      <Text style={[T.label, { marginTop: 22, marginBottom: 6, marginLeft: 4 }]}>Audio</Text>
      <View style={st.audio}>
        <ListRow
          icon="mic-outline"
          iconColor={C.protein}
          iconBg={tint(C.protein)}
          title="Coach voice"
          subtitle="Spoken cues and rep counting"
          chevron={false}
          onPress={() => updateSettings({ coachVoice: !s.coachVoice })}
          right={<Toggle value={s.coachVoice} onChange={(coachVoice) => updateSettings({ coachVoice })} />}
        />
        <Divider style={{ marginLeft: 52 }} />
        <ListRow
          icon="musical-notes-outline"
          iconColor={C.fat}
          iconBg={tint(C.fat)}
          title="Background music"
          subtitle="Upbeat tracks during workouts"
          chevron={false}
          onPress={() => updateSettings({ music: !s.music })}
          right={<Toggle value={s.music} onChange={(music) => updateSettings({ music })} />}
        />
      </View>
      <Button
        title="Done"
        style={{ marginTop: 18 }}
        onPress={() => {
          onClose();
          toast(`Workout settings saved · ${s.restSeconds}s rest, ${s.countdown}s countdown`, 'barbell');
        }}
      />
    </Sheet>
  );
}

export function LanguageSheet({ visible, onClose }: SheetProps) {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  return (
    <Sheet visible={visible} onClose={onClose} title="Language options" scroll>
      {LANGUAGES.map((l) => (
        <OptionCard
          key={l}
          title={l}
          selected={state.settings.language === l}
          onPress={() => {
            updateSettings({ language: l });
            toast(`Language set to ${l} (demo: UI stays in English)`, 'language');
            setTimeout(onClose, 250);
          }}
        />
      ))}
    </Sheet>
  );
}

const RATING_TEXT = ['', 'We can do better 😕', 'Needs work 🤔', "It's okay 🙂", 'Really good 😊', 'Love it! 😍'];

export function RateSheet({ visible, onClose }: SheetProps) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  return (
    <Sheet visible={visible} onClose={onClose} title="Rate us">
      <View style={st.rateHead}>
        <IconTile icon="star" color={C.warning} bg={C.warningSoft} size={56} />
        <Text style={[T.body, { textAlign: 'center', marginTop: 12 }]}>Enjoying Fitora? Your rating helps more people find us.</Text>
      </View>
      <View style={st.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <PressableScale
            key={n}
            hitSlop={6}
            scaleTo={0.82}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            onPress={() => {
              tap();
              setRating(n);
            }}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={n <= rating ? C.gold : C.border} />
          </PressableScale>
        ))}
      </View>
      <Animated.Text key={rating} entering={FadeIn.duration(MOTION.base)} style={st.ratingText}>
        {RATING_TEXT[rating]}
      </Animated.Text>
      <Button
        title="Submit"
        style={{ marginTop: 18 }}
        onPress={() => {
          onClose();
          toast(`Thanks for rating us ${'⭐'.repeat(rating)}`, 'star');
        }}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.borderSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperWrap: { alignItems: 'center', marginTop: 14 },
  label: { fontSize: 15, fontWeight: '700', color: C.text },
  audio: { borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: C.border, paddingHorizontal: 10, paddingVertical: 2 },
  rateHead: { alignItems: 'center', paddingHorizontal: 8 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 },
  ratingText: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.text, marginTop: 12 },
});
