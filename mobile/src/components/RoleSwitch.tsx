import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useFarmPool } from '@/context/FarmPoolContext';
import { colors } from '@/lib/theme';

/** Demo-only toggle: one device plays both sides of the marketplace. */
export function RoleSwitch() {
  const { role, setRole } = useFarmPool();

  return (
    <View style={styles.track}>
      {(['buyer', 'seller'] as const).map((option) => {
        const active = role === option;
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => setRole(option)}>
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {option === 'buyer' ? 'Buyer' : 'Seller'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 999,
    padding: 3,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  pillTextActive: {
    color: colors.cream,
  },
});
