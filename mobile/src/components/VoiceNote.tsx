import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  value: string | null;
  onChange: (uri: string | null) => void;
};

export function VoiceNote({ value, onChange }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  async function toggleRecording() {
    if (state.isRecording) {
      await recorder.stop();
      onChange(recorder.uri);
      return;
    }

    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone permission required', 'Allow microphone access to add a voice note.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  const seconds = Math.max(0, Math.floor((state.durationMillis ?? 0) / 1000));

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{state.isRecording ? `Recording ${seconds}s` : 'Voice harvest note'}</Text>
        <Text style={styles.description}>
          {value ? 'Voice note attached' : 'Describe the crop naturally instead of typing everything.'}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.recordButton, state.isRecording && styles.stopButton]}
        onPress={toggleRecording}>
        <Text style={styles.recordText}>{state.isRecording ? 'Stop' : value ? 'Redo' : 'Record'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
  },
  copy: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  recordButton: {
    minWidth: 66,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  stopButton: {
    backgroundColor: colors.danger,
  },
  recordText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
});
