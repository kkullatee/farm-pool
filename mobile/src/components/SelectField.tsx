import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/lib/theme';

export type SelectOption = {
  value: string;
  caption?: string;
};

type Props = {
  label: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  value: string;
  options: SelectOption[];
  /** Show a search box above the list (for long lists like the crop catalog). */
  searchable?: boolean;
  /** Shown when the list is empty or nothing matches the search. */
  emptyText?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SelectField({
  label,
  hint,
  placeholder,
  error,
  value,
  options,
  searchable = false,
  emptyText = 'No options',
  disabled = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const wanted = query.trim().toLowerCase();
    if (!wanted) return options;
    return options.filter(
      (option) =>
        option.value.toLowerCase().includes(wanted) ||
        option.caption?.toLowerCase().includes(wanted),
    );
  }, [options, query]);

  function openPicker() {
    if (disabled) return;
    setQuery('');
    setOpen(true);
  }

  function pick(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.input, error ? styles.inputError : null, disabled && styles.inputDisabled]}
        activeOpacity={0.7}
        onPress={openPicker}>
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder || 'Select'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label.replace(' *', '')}</Text>
            {searchable ? (
              <TextInput
                style={styles.search}
                placeholder="Search…"
                placeholderTextColor={colors.faint}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCorrect={false}
              />
            ) : null}
            <FlatList
              data={filtered}
              keyExtractor={(option) => option.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => pick(item.value)}>
                    <View style={styles.optionCopy}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {item.value}
                      </Text>
                      {item.caption ? <Text style={styles.optionCaption}>{item.caption}</Text> : null}
                    </View>
                    {selected ? <Text style={styles.tick}>✓</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 7,
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.faint, fontSize: 11 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { color: colors.ink, fontSize: 16 },
  placeholderText: { color: colors.faint },
  chevron: { color: colors.primary, fontSize: 15 },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 15, marginTop: 6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(19,34,23,0.45)',
    justifyContent: 'center',
    padding: 26,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 23, padding: 18, maxHeight: '75%' },
  sheetTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  search: {
    color: colors.ink,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 13,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 10,
  },
  list: { flexGrow: 0 },
  empty: { color: colors.faint, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionSelected: { backgroundColor: colors.primarySoft },
  optionCopy: { flex: 1 },
  optionText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  optionTextSelected: { color: colors.primaryDark },
  optionCaption: { color: colors.faint, fontSize: 11, marginTop: 2 },
  tick: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  closeButton: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  closeText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
