import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoneyExact, formatPrice } from '@/lib/format';
import { colors } from '@/lib/theme';
import { ConditionGrade, MatchBreakdown, RankedCombination } from '@/lib/types';

const conditionRank: Record<ConditionGrade, number> = { Economy: 1, Standard: 2, Premium: 3 };

const BREAKDOWN_LABELS: { key: keyof MatchBreakdown; label: string }[] = [
  { key: 'condition', label: 'Condition' },
  { key: 'timing', label: 'Harvest timing' },
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
  { key: 'reliability', label: 'Reliability' },
];

export default function MatchesScreen() {
  const router = useRouter();
  const { plan, runDemo, approveDeal, chooseCombination } = useFarmPool();
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);

  function createDemoPlan() {
    runDemo();
  }

  function approve() {
    approveDeal();
    router.push('/deal');
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyEyebrow}>NO ACTIVE ORDER</Text>
          <Text style={styles.emptyTitle}>Let FarmPool build a supply plan</Text>
          <Text style={styles.emptyText}>
            Start with the ready-made judge scenario or enter your own buyer requirements.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={createDemoPlan}>
            <Text style={styles.primaryButtonText}>Run judge demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/buyer')}>
            <Text style={styles.secondaryButtonText}>Create my own order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const complete = plan.fulfilledKg >= plan.requestedKg;
  const status = plan.withinBudget ? 'READY TO APPROVE' : complete ? 'ABOVE PRICE TARGET' : 'PARTIAL SUPPLY';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="AI SUPPLY PLAN"
          title={complete ? 'Order assembled' : 'Best available pool'}
          description={`${plan.order.businessName} · ${plan.order.crop} delivery to ${plan.order.deliveryLocation}`}
        />

        <View style={[styles.statusCard, !plan.withinBudget && styles.statusCardWarning]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, !plan.withinBudget && styles.statusDotWarning]} />
            <Text style={[styles.statusLabel, !plan.withinBudget && styles.statusLabelWarning]}>{status}</Text>
          </View>
          <View style={styles.fillRow}>
            <Text style={styles.fillValue}>{formatKg(plan.fulfilledKg)}</Text>
            <Text style={styles.fillTarget}>of {formatKg(plan.requestedKg)} found</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(plan.fillRate * 100)}%` }]} />
          </View>
          <View style={styles.statusFooter}>
            <Text style={styles.statusFooterText}>{plan.selected.length} farms pooled</Text>
            <Text style={styles.statusFooterText}>{formatPrice(plan.cost.deliveredPerKg)} delivered</Text>
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricCard
            label="pool condition"
            value={
              plan.selected.length
                ? plan.selected.reduce(
                    (lowest, lot) =>
                      conditionRank[lot.harvest.condition] < conditionRank[lowest]
                        ? lot.harvest.condition
                        : lowest,
                    'Premium' as ConditionGrade,
                  )
                : 'n/a'
            }
            tone="green"
          />
          <MetricCard
            label="avg reliability"
            value={
              plan.selected.length
                ? `${Math.round(
                    plan.selected.reduce((sum, lot) => sum + lot.harvest.reliability, 0) /
                      plan.selected.length,
                  )}%`
                : 'n/a'
            }
          />
          <MetricCard label="route distance" value={`${plan.cost.routeKm} km`} tone="amber" />
        </View>

        {plan.rankedCombinations.length > 0 ? (
          <>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>HYBRID MATCHING</Text>
                <Text style={styles.sectionTitle}>Top ranked pools</Text>
              </View>
              <Text style={styles.sectionCount}>top {plan.rankedCombinations.length}</Text>
            </View>

            <View style={styles.pipelineCard}>
              <View style={styles.pipelineBadges}>
                <Text style={styles.rulesBadge}>RULES · FEASIBILITY</Text>
                <Text style={styles.pipelineArrow}>›</Text>
                <Text style={styles.mlBadge}>ML · RANKING</Text>
              </View>
              <Text style={styles.pipelineText}>
                Hard rules removed {plan.rejected.length} of{' '}
                {plan.rejected.length + plan.selected.length + plan.eligibleNotNeeded.length} farms
                (wrong variety, quality, timing or radius), then a trained model ranked every
                feasible pool by predicted fulfilment. The model never overrides a rule.
              </Text>
            </View>

            <Text style={styles.tapHint}>
              FarmPool recommends #1. Tap any pool to use it instead.
            </Text>

            {plan.rankedCombinations.map((combo) => (
              <CombinationCard
                key={combo.id}
                combo={combo}
                selected={combo.id === plan.selectedCombinationId}
                onSelect={() => chooseCombination(combo.id)}
              />
            ))}

            {plan.modelInfo ? (
              <Text style={styles.modelNote}>
                Ranked by {plan.modelInfo.modelType.replace('_', ' ')} ({plan.modelInfo.library},
                AUC {plan.modelInfo.auc.toFixed(2)}) trained on {plan.modelInfo.trainedRows}{' '}
                clearly-labelled synthetic fulfilment records. Same inputs always give the same
                ranking.
              </Text>
            ) : null}
          </>
        ) : null}

        <View style={styles.sectionHeadingRow}>
          <View>
            <Text style={styles.sectionEyebrow}>SELECTED SUPPLY</Text>
            <Text style={styles.sectionTitle}>Compatible lots</Text>
          </View>
          <Text style={styles.sectionCount}>{plan.selected.length} farms</Text>
        </View>

        {plan.selected.map((lot, index) => (
          <View key={lot.harvest.id} style={styles.farmCard}>
            <View style={styles.farmTop}>
              <View style={styles.farmNumber}>
                <Text style={styles.farmNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.farmNameWrap}>
                <Text style={styles.farmName}>{lot.harvest.farmerName}</Text>
                <Text style={styles.farmLocation}>{lot.harvest.location} · {lot.distanceKm} km away</Text>
              </View>
              <TouchableOpacity
                style={styles.scorePill}
                onPress={() =>
                  setExpandedLotId(expandedLotId === lot.harvest.id ? null : lot.harvest.id)
                }>
                <Text style={styles.scoreText}>
                  {lot.score}% match {expandedLotId === lot.harvest.id ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
            </View>

            {expandedLotId === lot.harvest.id ? (
              <View style={styles.breakdownCard}>
                {BREAKDOWN_LABELS.map(({ key, label }) => (
                  <View key={key} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{label}</Text>
                    <View style={styles.breakdownTrack}>
                      <View
                        style={[styles.breakdownFill, { width: `${lot.breakdown[key]}%` }]}
                      />
                    </View>
                    <Text style={styles.breakdownValue}>{lot.breakdown[key]}%</Text>
                  </View>
                ))}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Photo</Text>
                  <Text style={styles.breakdownPhoto}>
                    {lot.harvest.assessment.photoStatus === 'Accepted'
                      ? 'AI checked'
                      : lot.harvest.imageUri
                        ? 'Held until checked'
                        : 'None provided'}
                  </Text>
                </View>
                <Text style={styles.breakdownNote}>
                  Rules-based score for this farm. The pool ranking above uses the ML model.
                </Text>
              </View>
            ) : null}

            {lot.harvest.imageUri && lot.harvest.assessment.photoStatus === 'Accepted' ? (
              <Image source={{ uri: lot.harvest.imageUri }} style={styles.farmPhoto} />
            ) : lot.harvest.imageUri ? (
              <Text style={styles.photoHeld}>
                Seller added a photo. It shows here once it passes the photo check.
              </Text>
            ) : null}
            <View style={styles.farmStats}>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel} numberOfLines={1}>ALLOCATED</Text>
                <Text style={styles.farmStatValue}>{formatKg(lot.allocatedKg)}</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel} numberOfLines={1}>CONDITION</Text>
                <Text style={styles.farmStatValue}>{lot.harvest.condition}</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel} numberOfLines={1}>PRICE</Text>
                <Text style={styles.farmStatValue}>${lot.harvest.minimumPricePerKg.toFixed(2)}</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel} numberOfLines={1}>HARVEST</Text>
                <Text style={styles.farmStatValue}>{lot.harvest.harvestDate.slice(5)}</Text>
              </View>
            </View>
            <Text style={styles.farmFit}>
              ✓ Same variety · {lot.harvest.condition.toLowerCase()} condition (seller-provided) ·
              ready by {lot.harvest.harvestDate}
            </Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push({ pathname: '/chat', params: { harvestId: lot.harvest.id } })}>
              <Text style={styles.chatButtonText}>Chat with seller</Text>
              <Text style={styles.chatButtonArrow}>›</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.routeCard}>
          <View style={styles.sectionHeadingRowCompact}>
            <View>
              <Text style={styles.sectionEyebrow}>SHARED TRANSPORT</Text>
              <Text style={styles.cardTitle}>Consolidated collection run</Text>
            </View>
            <View style={styles.truckPill}>
              <Text style={styles.truckText}>{plan.cost.trucks} truck{plan.cost.trucks === 1 ? '' : 's'}</Text>
            </View>
          </View>
          <View style={styles.routeLine}>
            {plan.selected.map((lot, index) => (
              <View key={lot.harvest.id} style={styles.routeStop}>
                <View style={styles.routeMarker} />
                <View style={styles.routeCopy}>
                  <Text style={styles.routeName}>Stop {index + 1} · {lot.harvest.location}</Text>
                  <Text style={styles.routeDetail}>Collect {formatKg(lot.allocatedKg)}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.routeStop, styles.routeStopLast]}>
              <View style={[styles.routeMarker, styles.routeDestination]} />
              <View style={styles.routeCopy}>
                <Text style={styles.routeName}>Deliver · {plan.order.deliveryLocation}</Text>
                <Text style={styles.routeDetail}>{plan.cost.routeKm} km estimated multi-stop route</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.costCard}>
          <Text style={styles.sectionEyebrow}>TRANSPARENT COST MODEL</Text>
          <Text style={styles.cardTitle}>Delivered price explained</Text>
          <CostRow label="Produce paid to farmers" value={formatMoneyExact(plan.cost.produce)} />
          <CostRow label="Truck dispatch" value={formatMoneyExact(plan.cost.dispatch)} />
          <CostRow label={`${plan.cost.routeKm} km shared route`} value={formatMoneyExact(plan.cost.distance)} />
          <CostRow label="Cold chain" value={formatMoneyExact(plan.cost.coldChain)} />
          <CostRow label="Handling and consolidation" value={formatMoneyExact(plan.cost.handling)} />
          <CostRow label={`${plan.selected.length} physical quality checks`} value={formatMoneyExact(plan.cost.qualityTesting)} />
          <CostRow label="FarmPool coordination (2.5%)" value={formatMoneyExact(plan.cost.platform)} />
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL DELIVERED</Text>
              <Text style={styles.total}>{formatMoneyExact(plan.cost.total)}</Text>
            </View>
            <View style={styles.perKgBox}>
              <Text style={styles.perKg}>{formatPrice(plan.cost.deliveredPerKg)}</Text>
              <Text style={styles.perKgTarget}>target ≤ {formatPrice(plan.order.maximumDeliveredPricePerKg)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rejectedCard}>
          <Text style={styles.sectionEyebrow}>QUALITY FIREWALL</Text>
          <Text style={styles.cardTitle}>Why other farms were excluded</Text>
          {plan.rejected.length === 0 ? (
            <Text style={styles.noRejected}>Every available farm met this order’s quality rules.</Text>
          ) : (
            plan.rejected.map((evaluation) => (
              <View key={evaluation.harvest.id} style={styles.rejectedRow}>
                <View style={styles.rejectMark}>
                  <Text style={styles.rejectMarkText}>×</Text>
                </View>
                <View style={styles.rejectedCopy}>
                  <Text style={styles.rejectedName}>{evaluation.harvest.farmerName}</Text>
                  <Text style={styles.rejectedReason}>{evaluation.reasons.join(' · ')}</Text>
                </View>
              </View>
            ))
          )}
          {plan.eligibleNotNeeded.length > 0 ? (
            <Text style={styles.reserveText}>
              {plan.eligibleNotNeeded.length} additional compatible farm{plan.eligibleNotNeeded.length === 1 ? '' : 's'} kept in reserve.
            </Text>
          ) : null}
        </View>

        <View style={styles.assuranceCard}>
          <Text style={styles.assuranceTitle}>Final checkpoint before collection</Text>
          <Text style={styles.assuranceText}>
            A pooled sample is physically checked against the order before dispatch. Any failed
            lot is replaced from the compatible reserve, never silently blended in.
          </Text>
        </View>

        <TouchableOpacity
          disabled={!complete}
          style={[styles.primaryButton, !complete && styles.disabledButton]}
          onPress={approve}>
          <Text style={styles.primaryButtonText}>{plan.withinBudget ? 'Approve pooled order' : complete ? 'Review and approve plan' : 'More supply required'}</Text>
          {complete ? <Text style={styles.primaryButtonArrow}>›</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/buyer')}>
          <Text style={styles.secondaryButtonText}>Change order requirements</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.costRow}>
      <Text style={styles.costLabel}>{label}</Text>
      <Text style={styles.costValue}>{value}</Text>
    </View>
  );
}

function ScoreBar({ label, value, ml }: { label: string; value: number; ml?: boolean }) {
  return (
    <View style={styles.scoreBarRow}>
      <Text style={styles.scoreBarLabel}>{label}</Text>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            ml && styles.scoreBarFillMl,
            { width: `${Math.round(value * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.scoreBarValue}>{Math.round(value * 100)}%</Text>
      <Text style={[styles.scoreBarTag, ml && styles.scoreBarTagMl]}>{ml ? 'ML' : 'RULES'}</Text>
    </View>
  );
}

function CombinationCard({
  combo,
  selected,
  onSelect,
}: {
  combo: RankedCombination;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSelect}
      style={[styles.comboCard, selected && styles.comboCardSelected]}>
      <View style={styles.comboTop}>
        <View style={[styles.comboRank, selected && styles.comboRankSelected]}>
          <Text style={[styles.comboRankText, selected && styles.comboRankTextSelected]}>
            #{combo.rank}
          </Text>
        </View>
        <View style={styles.comboNameWrap}>
          <Text style={styles.comboFarms}>
            {combo.lots.map((lot) => lot.harvest.farmerName).join(' + ')}
          </Text>
          <Text style={styles.comboMeta}>
            {formatKg(combo.fulfilledKg)} · {formatPrice(combo.cost.deliveredPerKg)} delivered
            {combo.rank === 1 ? ' · AI pick' : ''}
            {combo.withinBudget ? '' : ' · over price target'}
          </Text>
        </View>
        <View style={styles.comboScoreWrap}>
          <Text style={styles.comboScore}>{Math.round(combo.finalScore * 100)}</Text>
          <Text style={[styles.comboScoreLabel, selected && styles.comboScoreLabelSelected]}>
            {selected ? 'SELECTED' : 'TAP TO USE'}
          </Text>
        </View>
      </View>

      <View style={styles.comboBars}>
        <ScoreBar label="Fulfilment" value={combo.fulfilmentProbability} ml />
        <ScoreBar label="Logistics" value={combo.logisticsScore} />
        <ScoreBar label="Buyer fit" value={combo.buyerFitScore} />
      </View>

      <View style={styles.factorRow}>
        {combo.topFactors.map((factor) => (
          <Text
            key={factor.feature}
            style={[styles.factorChip, factor.direction === 'negative' && styles.factorChipDown]}>
            {factor.direction === 'positive' ? '↑' : '↓'} {factor.label}
          </Text>
        ))}
      </View>
      <Text style={styles.comboWhy}>{combo.explanation}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 55 },
  empty: { flex: 1, justifyContent: 'center', padding: 24 },
  emptyEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  emptyTitle: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 8 },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 10 },
  statusCard: { backgroundColor: colors.primary, borderRadius: 23, padding: 19, marginTop: 24 },
  statusCardWarning: { backgroundColor: '#765614' },
  statusHeader: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime, marginRight: 7 },
  statusDotWarning: { backgroundColor: '#FFE1A1' },
  statusLabel: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  statusLabelWarning: { color: '#FFE1A1' },
  fillRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12 },
  fillValue: { color: colors.surface, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  fillTarget: { color: '#DAE7DD', fontSize: 13, marginLeft: 8 },
  progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: '100%', backgroundColor: colors.lime, borderRadius: 4 },
  statusFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  statusFooterText: { color: '#D9E7DC', fontSize: 11, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 31, marginBottom: 13 },
  sectionHeadingRowCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 5 },
  sectionCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pipelineCard: { backgroundColor: colors.ink, borderRadius: 19, padding: 15, marginBottom: 12 },
  pipelineBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesBadge: { color: colors.lime, backgroundColor: 'rgba(255,255,255,0.12)', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' },
  mlBadge: { color: colors.ink, backgroundColor: colors.lime, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' },
  pipelineArrow: { color: '#8FA394', fontSize: 14, fontWeight: '900' },
  pipelineText: { color: '#C6D2C8', fontSize: 11, lineHeight: 16, marginTop: 10 },
  comboCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  comboCardSelected: { borderColor: colors.primary },
  comboTop: { flexDirection: 'row', alignItems: 'center' },
  comboRank: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  comboRankSelected: { backgroundColor: colors.primary },
  comboRankText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  comboRankTextSelected: { color: colors.lime },
  comboNameWrap: { flex: 1, paddingHorizontal: 10 },
  comboFarms: { color: colors.ink, fontSize: 13, fontWeight: '900', lineHeight: 17 },
  comboMeta: { color: colors.faint, fontSize: 10, marginTop: 3 },
  comboScoreWrap: { alignItems: 'center' },
  comboScore: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  comboScoreLabel: { color: colors.faint, fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 1 },
  comboScoreLabelSelected: { color: colors.primary },
  tapHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 10, paddingHorizontal: 4 },
  comboBars: { backgroundColor: colors.background, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginTop: 12, gap: 7 },
  scoreBarRow: { flexDirection: 'row', alignItems: 'center' },
  scoreBarLabel: { width: 62, color: colors.muted, fontSize: 9, fontWeight: '800' },
  scoreBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginHorizontal: 7 },
  scoreBarFill: { height: '100%', borderRadius: 3, backgroundColor: colors.amber },
  scoreBarFillMl: { backgroundColor: colors.primary },
  scoreBarValue: { width: 32, color: colors.ink, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  scoreBarTag: { width: 38, color: colors.amber, fontSize: 7, fontWeight: '900', textAlign: 'right', letterSpacing: 0.4 },
  scoreBarTagMl: { color: colors.primary },
  factorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  factorChip: { color: colors.primaryDark, backgroundColor: colors.primarySoft, fontSize: 9, fontWeight: '800', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, overflow: 'hidden' },
  factorChipDown: { color: '#715112', backgroundColor: colors.amberSoft },
  comboWhy: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  modelNote: { color: colors.faint, fontSize: 9, lineHeight: 14, marginTop: 4, marginBottom: 6, paddingHorizontal: 4 },
  farmCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10 },
  farmTop: { flexDirection: 'row', alignItems: 'center' },
  farmNumber: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  farmNumberText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  farmNameWrap: { flex: 1, paddingHorizontal: 10 },
  farmName: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  farmLocation: { color: colors.faint, fontSize: 10, marginTop: 3 },
  scorePill: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  scoreText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900' },
  farmStats: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 14, paddingVertical: 11, marginTop: 13 },
  farmStat: { flex: 1, alignItems: 'center', paddingHorizontal: 3 },
  farmStatLabel: { color: colors.faint, fontSize: 7, fontWeight: '900', letterSpacing: 0.3, textAlign: 'center' },
  farmStatValue: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 3 },
  breakdownCard: { backgroundColor: colors.background, borderRadius: 14, padding: 12, marginTop: 12, gap: 7 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center' },
  breakdownLabel: { width: 88, color: colors.muted, fontSize: 10, fontWeight: '800' },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginHorizontal: 7 },
  breakdownFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  breakdownValue: { width: 36, color: colors.ink, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  breakdownPhoto: { flex: 1, color: colors.ink, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  breakdownNote: { color: colors.faint, fontSize: 9, lineHeight: 13, marginTop: 3 },
  farmPhoto: { width: '100%', height: 150, borderRadius: 14, marginTop: 12 },
  photoHeld: { color: colors.faint, fontSize: 10, lineHeight: 14, marginTop: 10 },
  farmFit: { color: colors.primary, fontSize: 10, lineHeight: 15, marginTop: 11, fontWeight: '700' },
  chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, paddingVertical: 11, marginTop: 12 },
  chatButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
  chatButtonArrow: { color: colors.primaryDark, fontSize: 16, fontWeight: '900', marginLeft: 6, marginTop: -1 },
  routeCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18, marginTop: 20 },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 5 },
  truckPill: { backgroundColor: colors.amberSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  truckText: { color: '#715112', fontSize: 10, fontWeight: '900' },
  routeLine: { marginTop: 17, paddingLeft: 7 },
  routeStop: { flexDirection: 'row', minHeight: 51, borderLeftColor: colors.primarySoft, borderLeftWidth: 2, paddingLeft: 20, marginLeft: 5 },
  routeStopLast: { borderLeftColor: 'transparent', minHeight: 35 },
  routeMarker: { position: 'absolute', left: -7, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderColor: colors.surface, borderWidth: 2 },
  routeDestination: { backgroundColor: colors.amber },
  routeCopy: { flex: 1, marginTop: -2 },
  routeName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  routeDetail: { color: colors.faint, fontSize: 10, marginTop: 3 },
  costCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18, marginTop: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 11 },
  costLabel: { color: colors.muted, fontSize: 12 },
  costValue: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 17 },
  totalLabel: { color: colors.faint, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  total: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 3 },
  perKgBox: { alignItems: 'flex-end' },
  perKg: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  perKgTarget: { color: colors.faint, fontSize: 8, marginTop: 3 },
  rejectedCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18, marginTop: 12 },
  noRejected: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 13 },
  rejectedRow: { flexDirection: 'row', marginTop: 14 },
  rejectMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rejectMarkText: { color: colors.danger, fontSize: 15, fontWeight: '900', marginTop: -2 },
  rejectedCopy: { flex: 1 },
  rejectedName: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  rejectedReason: { color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: 3 },
  reserveText: { color: colors.primary, fontSize: 10, fontWeight: '700', lineHeight: 15, marginTop: 15 },
  assuranceCard: { backgroundColor: colors.amberSoft, borderRadius: 18, padding: 16, marginTop: 12 },
  assuranceTitle: { color: '#715112', fontSize: 14, fontWeight: '900' },
  assuranceText: { color: '#735D2B', fontSize: 11, lineHeight: 17, marginTop: 5 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 58, backgroundColor: colors.primary, borderRadius: 17, marginTop: 22, paddingHorizontal: 18 },
  primaryButtonText: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  primaryButtonArrow: { position: 'absolute', right: 18, color: colors.lime, fontSize: 29 },
  disabledButton: { backgroundColor: colors.faint },
  secondaryButton: { alignItems: 'center', paddingVertical: 16 },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
