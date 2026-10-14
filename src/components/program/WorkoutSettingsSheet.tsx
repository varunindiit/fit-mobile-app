import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Divider, Sheet, Stepper, T, Toggle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

/** Rest duration, get-ready countdown, coach voice and music — shared by the day plan screen. */
export function WorkoutSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, updateSettings } = useStore();
  const st = state.settings;
  return (
    <Sheet visible={visible} onClose={onClose} title="Workout Settings">
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>Rest duration</Text>
          <Text style={T.small}>Between exercises</Text>
        </View>
        <Stepper value={st.restSeconds} min={10} max={60} step={5} format={(v) => `${v}s`} onChange={(v) => updateSettings({ restSeconds: v })} />
      </View>
      <Divider />
      <View style={[s.row, { flexDirection: 'column', alignItems: 'stretch' }]}>
        <Text style={T.h3}>Countdown</Text>
        <Text style={T.small}>"Get ready" time before the first exercise</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[5, 10, 15].map((n) => (
            <Chip key={n} label={`${n} sec`} selected={st.countdown === n} onPress={() => updateSettings({ countdown: n })} />
          ))}
        </View>
      </View>
      <Divider />
      <View style={s.row}>
        <Text style={s.emoji}>🧔</Text>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>Coach voice</Text>
          <Text style={T.small}>Spoken cues & countdowns</Text>
        </View>
        <Toggle value={st.coachVoice} onChange={(v) => updateSettings({ coachVoice: v })} />
      </View>
      <View style={s.row}>
        <Text style={s.emoji}>🎵</Text>
        <View style={{ flex: 1 }}>
          <Text style={T.h3}>Music</Text>
          <Text style={T.small}>Upbeat workout playlist</Text>
        </View>
        <Toggle value={st.music} onChange={(v) => updateSettings({ music: v })} />
      </View>
      <Button title="Done" onPress={onClose} style={{ marginTop: 12, borderRadius: 999 }} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  emoji: { fontSize: 22, width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, textAlign: 'center', lineHeight: 36, overflow: 'hidden' },
});
