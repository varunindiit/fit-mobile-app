import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Divider, ListRow, OptionCard, Sheet, Stepper, T, Toggle, tap, useToast } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

type SheetProps = { visible: boolean; onClose: () => void };

export const LANGUAGES = ['English', 'हिन्दी (Hindi)', 'தமிழ் (Tamil)', 'తెలుగు (Telugu)', 'मराठी (Marathi)', 'বাংলা (Bengali)'];

export function WorkoutSettingsSheet({ visible, onClose }: SheetProps) {
  const { state, updateSettings } = useStore();
  const toast = useToast();
  const s = state.settings;
  return (
    <Sheet visible={visible} onClose={onClose} title="Workout settings" scroll>
      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Text style={st.label}>Rest duration</Text>
          <Text style={T.small}>Break between exercises</Text>
        </View>
        <Stepper value={s.restSeconds} step={5} min={10} max={60} format={(v) => `${v}s`} onChange={(restSeconds) => updateSettings({ restSeconds })} />
      </View>
      <Divider style={{ marginVertical: 14 }} />
      <Text style={st.label}>Countdown before exercise</Text>
      <Text style={[T.small, { marginBottom: 10 }]}>Get ready time before each move starts</Text>
      <View style={st.chips}>
        {[5, 10, 15].map((v) => (
          <Chip key={v} label={`${v} sec`} selected={s.countdown === v} onPress={() => updateSettings({ countdown: v })} />
        ))}
      </View>
      <Divider style={{ marginVertical: 14 }} />
      <ListRow
        icon="mic-outline"
        iconColor={C.white}
        iconBg={C.protein}
        title="Coach voice"
        subtitle="Spoken cues and rep counting"
        chevron={false}
        onPress={() => updateSettings({ coachVoice: !s.coachVoice })}
        right={<Toggle value={s.coachVoice} onChange={(coachVoice) => updateSettings({ coachVoice })} />}
      />
      <ListRow
        icon="musical-notes-outline"
        iconColor={C.white}
        iconBg={C.fat}
        title="Background music"
        subtitle="Upbeat tracks during workouts"
        chevron={false}
        onPress={() => updateSettings({ music: !s.music })}
        right={<Toggle value={s.music} onChange={(music) => updateSettings({ music })} />}
      />
      <Button
        title="Done"
        style={{ marginTop: 16 }}
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
      <Text style={[T.body, { textAlign: 'center' }]}>Enjoying Fitora? Your rating helps more people find us.</Text>
      <View style={st.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            hitSlop={6}
            onPress={() => {
              tap();
              setRating(n);
            }}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={40} color={n <= rating ? C.gold : C.border} />
          </Pressable>
        ))}
      </View>
      <Text style={st.ratingText}>{RATING_TEXT[rating]}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '700', color: C.text },
  chips: { flexDirection: 'row', gap: 8 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 },
  ratingText: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: C.text, marginTop: 12 },
});
