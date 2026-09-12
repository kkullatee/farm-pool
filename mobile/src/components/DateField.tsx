import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  label: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  /** ISO date string YYYY-MM-DD (same format the matching engine expects). */
  value: string;
  onChange: (value: string) => void;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad = (value: number) => String(value).padStart(2, '0');
const toIso = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

function parseIso(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function formatDisplay(value: string): string | null {
  const parsed = parseIso(value);
  if (!parsed) return null;
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date(parsed.year, parsed.month, parsed.day).getDay()
  ];
  return `${weekday} ${parsed.day} ${MONTHS[parsed.month].slice(0, 3)} ${parsed.year}`;
}

/** Weeks of the month as day numbers, Monday-first, 0 for padding cells. */
function monthGrid(year: number, month: number): number[][] {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array<number>(leading).fill(0),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(0);
  const weeks: number[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function DateField({ label, hint, placeholder, error, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const selected = parseIso(value);
  const [viewYear, setViewYear] = useState(selected?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.month ?? today.getMonth());

  const display = formatDisplay(value);

  function openPicker() {
    const current = parseIso(value);
    setViewYear(current?.year ?? today.getFullYear());
    setViewMonth(current?.month ?? today.getMonth());
    setOpen(true);
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pick(day: number) {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  }

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <TouchableOpacity
        style={[styles.input, error ? styles.inputError : null]}
        activeOpacity={0.7}
        onPress={openPicker}>
        <Text style={[styles.inputText, !display && styles.placeholderText]}>
          {display ?? placeholder ?? 'Pick a date'}
        </Text>
        <Text style={styles.calendarIcon}>▦</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.monthRow}>
              <TouchableOpacity style={styles.monthArrow} onPress={() => shiftMonth(-1)}>
                <Text style={styles.monthArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity style={styles.monthArrow} onPress={() => shiftMonth(1)}>
                <Text style={styles.monthArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((weekday, index) => (
                <Text key={`${weekday}-${index}`} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
            </View>

            {monthGrid(viewYear, viewMonth).map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === 0) return <View key={dayIndex} style={styles.dayCell} />;
                  const isSelected =
                    selected?.year === viewYear &&
                    selected?.month === viewMonth &&
                    selected?.day === day;
                  const isToday =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === day;
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[styles.dayCell, isToday && styles.todayCell, isSelected && styles.selectedCell]}
                      onPress={() => pick(day)}>
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.todayText,
                          isSelected && styles.selectedText,
                        ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

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
  inputText: { color: colors.ink, fontSize: 16 },
  placeholderText: { color: colors.faint },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 15, marginTop: 6 },
  calendarIcon: { color: colors.primary, fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(19,34,23,0.45)',
    justifyContent: 'center',
    padding: 26,
  },
  sheet: { backgroundColor: colors.surface, borderRadius: 23, padding: 18 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: { color: colors.primary, fontSize: 22, fontWeight: '900', marginTop: -2 },
  monthTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.faint,
    fontSize: 10,
    fontWeight: '900',
    paddingVertical: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: { borderWidth: 1, borderColor: colors.primary },
  selectedCell: { backgroundColor: colors.primary },
  dayText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  todayText: { color: colors.primary },
  selectedText: { color: colors.surface, fontWeight: '900' },
  closeButton: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  closeText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
