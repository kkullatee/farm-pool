import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function FormField({ label, hint, error, multiline, style, ...props }: Props) {
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.faint}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: colors.faint,
    fontSize: 11,
  },
  input: {
    color: colors.ink,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 15,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  multiline: {
    minHeight: 94,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
});

