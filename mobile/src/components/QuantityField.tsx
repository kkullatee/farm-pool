import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CropInfo, QUANTITY_UNITS, QuantityUnit, isEstimatedUnit, toKg } from '@/data/crops';
import { colors } from '@/lib/theme';

type Props = {
  label: string;
  error?: string;
  value: string;
  unit: QuantityUnit;
  /** Selected crop, used for crate/pallet weight conversion. */
  crop?: CropInfo;
  onChangeValue: (value: string) => void;
  onChangeUnit: (unit: QuantityUnit) => void;
};

/** Numeric quantity input with a kg / tonnes / crates / pallets unit selector
 * and a live conversion caption. Matching always runs on canonical kg. */
export function QuantityField({
  label,
  error,
  value,
  unit,
  crop,
  onChangeValue,
  onChangeUnit,
}: Props) {
  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount > 0;
  const kg = valid ? toKg(amount, unit, crop) : 0;
  const perUnitKg = unit === 'crates' ? crop?.crateKg : unit === 'pallets' ? crop?.palletKg : null;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeValue}
      />
      <View style={styles.unitRow}>
        {QUANTITY_UNITS.map((option) => {
          const selected = option === unit;
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.unitPill, selected && styles.unitPillSelected]}
              onPress={() => onChangeUnit(option)}>
              <Text style={[styles.unitText, selected && styles.unitTextSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {valid && unit !== 'kg' ? (
        <Text style={styles.conversion}>
          {isEstimatedUnit(unit)
            ? `≈ ${Math.round(kg).toLocaleString()} kg (estimate at ~${perUnitKg} kg per ${unit.slice(0, -1)}${crop ? ` of ${crop.name.toLowerCase()}` : ''}, confirmed at pickup)`
            : `= ${Math.round(kg).toLocaleString()} kg`}
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700', marginBottom: 7 },
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
  inputError: { borderColor: colors.danger },
  unitRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  unitPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
  },
  unitPillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  unitTextSelected: { color: colors.surface },
  conversion: { color: colors.primary, fontSize: 11, lineHeight: 16, marginTop: 7, fontWeight: '600' },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 15, marginTop: 6 },
});
