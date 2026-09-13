import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VisualAssessmentSummary } from '@/components/VisualAssessmentSummary';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatPercent } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function FarmerResultScreen() {
  const router = useRouter();
  const { lastHarvest } = useFarmPool();

  if (!lastHarvest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No new harvest yet</Text>
          <Text style={styles.emptyText}>Register a harvest first, then its quality screen appears here.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/farmer')}>
            <Text style={styles.primaryButtonText}>Register a harvest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const assessment = lastHarvest.assessment;
  const AI_STATUS_LABEL: Record<string, string> = {
    live: 'Automatic photo check (live)',
    'demo-fallback': 'Demo result (no backend configured)',
    'backend-unreachable': 'Demo result (backend unreachable)',
    'vision-unavailable': 'Demo result (vision service unavailable)',
  };
  const sourceLabel =
    AI_STATUS_LABEL[assessment.aiStatus ?? ''] ??
    (assessment.source === 'anthropic' ? 'Automatic photo check (live)' : 'Offline demo check');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="QUALITY SCREEN COMPLETE" title="Harvest ready to match" />

        <View style={styles.gradeCard}>
          <View style={styles.gradeTop}>
            <View>
              <Text style={styles.gradeEyebrow}>PRELIMINARY GRADE</Text>
              <Text style={styles.grade}>{assessment.grade}</Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={styles.score}>{assessment.visualScore}</Text>
              <Text style={styles.scoreLabel}>/100</Text>
            </View>
          </View>
          <Text style={styles.source}>{sourceLabel} · {formatPercent(assessment.confidence)} confidence</Text>
        </View>

        <View style={styles.metrics}>
          <MetricCard label="available supply" value={formatKg(lastHarvest.quantityKg)} tone="green" />
          <MetricCard label="condition" value={lastHarvest.condition} />
          <MetricCard label="asking price" value={`$${lastHarvest.minimumPricePerKg.toFixed(2)}`} />
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.cardEyebrow}>MATCHING PROFILE</Text>
          <Text style={styles.profileTitle}>{lastHarvest.crop} · {lastHarvest.variety}</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Location</Text>
            <Text style={styles.profileValue}>{lastHarvest.location}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Condition</Text>
            <Text style={styles.profileValue}>{lastHarvest.condition} (seller-provided)</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Photo check</Text>
            <Text style={styles.profileValue}>{assessment.photoStatus ?? 'No photo'}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Checked by</Text>
            <Text style={styles.profileValue}>{sourceLabel}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Account status</Text>
            <Text style={styles.profileValue}>
              {lastHarvest.verification ?? 'Self-reported'}
            </Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Harvest date</Text>
            <Text style={styles.profileValue}>{lastHarvest.harvestDate}</Text>
          </View>
          <View style={[styles.profileRow, styles.lastRow]}>
            <Text style={styles.profileLabel}>Farm-gate price</Text>
            <Text style={styles.profileValue}>${lastHarvest.minimumPricePerKg.toFixed(2)}/kg</Text>
          </View>
        </View>

        <VisualAssessmentSummary harvest={lastHarvest} />

        {lastHarvest.qualityAnswers && lastHarvest.qualityAnswers.length > 0 ? (
          <View style={styles.profileCard}>
            <Text style={styles.cardEyebrow}>SELF-REPORTED QUALITY</Text>
            {lastHarvest.qualityAnswers.map((answer) => (
              <View key={answer.id} style={styles.profileRow}>
                <Text style={styles.profileLabel}>{answer.label}</Text>
                <Text style={styles.profileValue}>
                  {answer.value}
                  {answer.unit ? ` ${answer.unit}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.observationCard}>
          <Text style={styles.cardEyebrow}>ASSESSMENT SIGNALS</Text>
          {assessment.observations.map((observation) => (
            <View key={observation} style={styles.observationRow}>
              <View style={styles.check}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <Text style={styles.observation}>{observation}</Text>
            </View>
          ))}
        </View>

        {assessment.photoStatus === 'Manual review' || assessment.photoStatus === 'Retake required' ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              {assessment.photoStatus === 'Retake required'
                ? 'Please retake the photo'
                : 'Photo waiting for review'}
            </Text>
            <Text style={styles.warningText}>
              {(assessment.photoChecks ?? []).join('. ') ||
                'The photo could not be checked automatically.'}
              {' '}Buyers will not see this photo until it is checked.
            </Text>
          </View>
        ) : null}

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Taste cannot come from a photo alone</Text>
          <Text style={styles.warningText}>{assessment.warning}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/buyer')}>
          <Text style={styles.primaryButtonText}>Create an order to match this lot</Text>
          <Text style={styles.buttonArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/')}>
          <Text style={styles.secondaryButtonText}>Back to FarmPool</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 52 },
  empty: { flex: 1, justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 27, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 22 },
  gradeCard: { backgroundColor: colors.ink, borderRadius: 12, padding: 19, marginTop: 24 },
  gradeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gradeEyebrow: { color: colors.primarySoft, fontSize: 10, fontWeight: '700' },
  grade: { color: colors.surface, fontSize: 29, fontWeight: '800', marginTop: 6 },
  scoreCircle: { width: 65, height: 65, borderRadius: 33, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  score: { color: colors.primaryDark, fontSize: 24, fontWeight: '800' },
  scoreLabel: { color: colors.primaryDark, fontSize: 8, fontWeight: '800', marginTop: -3 },
  source: { color: colors.primarySoft, fontSize: 11, marginTop: 15 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 12 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 18, marginTop: 20 },
  cardEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  profileTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 7, marginBottom: 10 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 10 },
  lastRow: { borderBottomWidth: 0, paddingBottom: 0 },
  profileLabel: { color: colors.muted, fontSize: 13 },
  profileValue: { color: colors.ink, fontSize: 13, fontWeight: '800', maxWidth: '62%', textAlign: 'right' },
  observationCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 18, marginTop: 12 },
  observationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  check: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  observation: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  warningCard: { backgroundColor: colors.amberSoft, borderRadius: 12, padding: 16, marginTop: 12 },
  warningTitle: { color: colors.amber, fontSize: 14, fontWeight: '800' },
  warningText: { color: '#735D2B', fontSize: 12, lineHeight: 18, marginTop: 5 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 56, backgroundColor: colors.primary, borderRadius: 12, marginTop: 22, paddingHorizontal: 17 },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  buttonArrow: { position: 'absolute', right: 18, color: '#F5EFE2', fontSize: 28 },
  secondaryButton: { alignItems: 'center', paddingVertical: 16 },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
