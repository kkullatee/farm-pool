import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  label: string;
  value: string;
  tone?: 'green' | 'amber' | 'plain';
};

export function MetricCard({ label, value, tone = 'plain' }: Props) {
  return (
    <View style={[styles.card, tone === 'green' && styles.green, tone === 'amber' && styles.amber]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
  },
  green: {
    backgroundColor: colors.primarySoft,
  },
  amber: {
    backgroundColor: colors.amberSoft,
  },
  value: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
});

