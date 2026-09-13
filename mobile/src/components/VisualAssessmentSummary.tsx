import { StyleSheet, Text, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { colors } from '@/lib/theme';
import type { Harvest, VisualVerificationStatus } from '@/lib/types';

const STATUS_COPY: Record<VisualVerificationStatus, { label: string; bg: string; fg: string }> = {
  'ai-screened': { label: 'AI-screened', bg: colors.primarySoft, fg: colors.primaryDark },
  'needs-review': { label: 'Needs review', bg: colors.amberSoft, fg: colors.amber },
  unverified: { label: 'Unverified', bg: colors.dangerSoft, fg: colors.danger },
};

export function VisualAssessmentSummary({
  harvest,
  compact = false,
}: {
  harvest: Harvest;
  compact?: boolean;
}) {
  const visual = harvest.assessment.visualAssessment;
  const status =
    visual?.verificationStatus ??
    (harvest.assessment.photoStatus === 'Accepted'
      ? 'ai-screened'
      : harvest.imageUri
        ? 'needs-review'
        : 'unverified');
  const statusCopy = STATUS_COPY[status];
  const observations = visual?.observations ?? harvest.assessment.observations;
  const damage = visual?.damageOrDefectIndicators ?? [];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>VISUAL ASSESSMENT</Text>
        <View style={[styles.statusPill, { backgroundColor: statusCopy.bg }]}>
          <Text style={[styles.statusText, { color: statusCopy.fg }]}>{statusCopy.label}</Text>
        </View>
      </View>
      <Text style={styles.summary}>
        {visual?.containsProduce
          ? `Photo shows produce${visual.detectedCrop ? ` (${visual.detectedCrop})` : ''}.`
          : harvest.imageUri
            ? 'Photo is attached but not visually verified yet.'
            : 'No produce photo is stored for this listing.'}{' '}
        {visual ? `${formatPercent(visual.confidence)} confidence.` : ''}
      </Text>
      {visual?.cropAgreesWithListing === false ? (
        <Text style={styles.problem}>Photo does not clearly agree with the entered crop.</Text>
      ) : null}
      {damage.length > 0 ? (
        <Text style={styles.problem}>Visible concerns: {damage.join(', ')}.</Text>
      ) : null}
      {observations.length > 0 ? (
        <Text style={styles.detail} numberOfLines={compact ? 2 : undefined}>
          {observations.slice(0, compact ? 2 : 4).join(' · ')}
        </Text>
      ) : null}
      {visual?.retakeReason ? <Text style={styles.problem}>{visual.retakeReason}</Text> : null}
      {!compact ? (
        <>
          {harvest.photoReference ? (
            <Text style={styles.storageNote}>{harvest.photoReference.note}</Text>
          ) : null}
          <Text style={styles.disclaimer}>
            {visual?.disclaimer ??
              'Visual assessment only: this photo does not prove Brix, internal quality, food safety, exact variety or freshness.'}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 11,
  },
  wrapCompact: {
    padding: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: '800' },
  summary: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 8 },
  detail: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  problem: { color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 5 },
  storageNote: { color: colors.faint, fontSize: 9, lineHeight: 13, marginTop: 7 },
  disclaimer: { color: colors.faint, fontSize: 9, lineHeight: 13, marginTop: 6 },
});
