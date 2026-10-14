import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Divider, IconTile, Sheet, Stepper, Toggle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

/** Rest duration, get-ready countdown, coach voice and music — shared by the day plan screen. */
export function WorkoutSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, updateSettings } = useStore();
  const st = state.settings;
  return (
    <Sheet visible={visible} onClose={onClose} title="Workout settings">
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <IconTile icon="hourglass-outline" color={C.accent} bg={C.accentSoft} size={40} />
        <View style={{ flex: 1 }}>
          <Copy title="Rest duration" sub="Between exercises" />
          <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <Stepper value={st.restSeconds} min={10} max={60} step={5} format={(v) => `${v}s`} onChange={(v) => updateSettings({ restSeconds: v })} />
          </View>
        </View>
      </View>
      <Divider style={s.inset} />
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <IconTile icon="timer-outline" color={C.water} bg={C.waterSoft} size={40} />
        <View style={{ flex: 1 }}>
          <Copy title="Countdown" sub={'“Get ready” time before the first exercise'} />
          <View style={s.chips}>
            {[5, 10, 15].map((n) => (
              <Chip key={n} label={`${n} sec`} selected={st.countdown === n} onPress={() => updateSettings({ countdown: n })} />
            ))}
          </View>
        </View>
      </View>
      <Divider style={s.inset} />
      <View style={s.row}>
        <IconTile icon="mic-outline" color={C.steps} bg={C.stepsSoft} size={40} />
        <Copy title="Coach voice" sub="Spoken cues & countdowns" />
        <Toggle value={st.coachVoice} onChange={(v) => updateSettings({ coachVoice: v })} />
      </View>
      <Divider style={s.inset} />
      <View style={s.row}>
        <IconTile icon="musical-notes-outline" color={C.workout} bg={C.workoutSoft} size={40} />
        <Copy title="Music" sub="Upbeat workout playlist" />
        <Toggle value={st.music} onChange={(v) => updateSettings({ music: v })} />
      </View>
      <Button title="Done" onPress={onClose} style={{ marginTop: 14 }} />
    </Sheet>
  );
}

function Copy({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.sub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  inset: { marginLeft: 52 },
  title: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  sub: { fontSize: 13, color: C.textSoft, lineHeight: 18, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
