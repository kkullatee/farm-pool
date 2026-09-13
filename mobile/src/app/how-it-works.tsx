import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from '@/lib/theme';

const STEPS: [string, string][] = [
  [
    'Sellers list harvests',
    'Crop, variety, quantity, price, harvest date and a photo. You can fill the form by voice.',
  ],
  [
    'Rules decide what is allowed',
    'Only lots with the right crop, variety, condition and timing can be pooled, and no plan can exceed your price ceiling.',
  ],
  [
    'A ranking model orders the options',
    'Feasible pools are ranked by predicted fulfilment: supplier track record, timing slack, spare supply and distance. Every match shows why it ranked where it did.',
  ],
  [
    'You stay in control',
    'Pick any pool, chat with sellers about quality, and confirm. Sellers accept or decline their share. Physical checks happen at pickup.',
  ],
];

export default function HowItWorksScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>How FarmPool works</Text>
        </View>

        <Text style={styles.intro}>
          FarmPool pools produce from several small farms so one large order can be filled.
        </Text>

        <View style={styles.card}>
          {STEPS.map(([heading, copy], index) => (
            <View key={heading} style={[styles.step, index > 0 && styles.stepDivider]}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{heading}</Text>
                <Text style={styles.stepText}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          The full ranking method, including model evaluation, is under “How ranking works” on the
          Matches screen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: radius.control,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backText: { color: colors.ink, fontSize: 22, fontWeight: '600', marginTop: -2 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 12, marginBottom: 14 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 14,
  },
  step: { flexDirection: 'row', paddingVertical: 13 },
  stepDivider: { borderTopColor: colors.line, borderTopWidth: 1 },
  stepNumber: { color: colors.primary, fontSize: 13, fontWeight: '800', width: 24, paddingTop: 1 },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  stepText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  footnote: { color: colors.faint, fontSize: 11, lineHeight: 16, marginTop: 14 },
});
