import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '@/components/MetricCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoney, formatPrice } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function MatchesScreen() {
  const router = useRouter();
  const { plan, runDemo, approveDeal } = useFarmPool();

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
          <MetricCard label="pooled Brix" value={plan.weightedBrix.toFixed(1)} tone="green" />
          <MetricCard label="pooled defects" value={`${plan.weightedDefects.toFixed(1)}%`} />
          <MetricCard label="route distance" value={`${plan.cost.routeKm} km`} tone="amber" />
        </View>

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
              <View style={styles.scorePill}>
                <Text style={styles.scoreText}>{lot.score}%</Text>
              </View>
            </View>
            <View style={styles.farmStats}>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel}>ALLOCATED</Text>
                <Text style={styles.farmStatValue}>{formatKg(lot.allocatedKg)}</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel}>BRIX</Text>
                <Text style={styles.farmStatValue}>{lot.harvest.brix.toFixed(1)}</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel}>DEFECTS</Text>
                <Text style={styles.farmStatValue}>{lot.harvest.defectsPct.toFixed(1)}%</Text>
              </View>
              <View style={styles.farmStat}>
                <Text style={styles.farmStatLabel}>PRICE</Text>
                <Text style={styles.farmStatValue}>${lot.harvest.minimumPricePerKg.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={styles.farmFit}>✓ Same variety · {lot.harvest.firmness.toLowerCase()} firmness · ready by {lot.harvest.harvestDate}</Text>
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
          <CostRow label="Produce paid to farmers" value={formatMoney(plan.cost.produce)} />
          <CostRow label="Truck dispatch" value={formatMoney(plan.cost.dispatch)} />
          <CostRow label={`${plan.cost.routeKm} km shared route`} value={formatMoney(plan.cost.distance)} />
          <CostRow label="Cold chain" value={formatMoney(plan.cost.coldChain)} />
          <CostRow label="Handling and consolidation" value={formatMoney(plan.cost.handling)} />
          <CostRow label={`${plan.selected.length} physical quality checks`} value={formatMoney(plan.cost.qualityTesting)} />
          <CostRow label="FarmPool coordination (2.5%)" value={formatMoney(plan.cost.platform)} />
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>TOTAL DELIVERED</Text>
              <Text style={styles.total}>{formatMoney(plan.cost.total)}</Text>
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
            A pooled sample is physically checked for Brix, firmness and food-safety records. Any
            failed lot is replaced from the compatible reserve—never silently blended in.
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
  farmStat: { flex: 1, alignItems: 'center' },
  farmStatLabel: { color: colors.faint, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  farmStatValue: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 3 },
  farmFit: { color: colors.primary, fontSize: 10, lineHeight: 15, marginTop: 11, fontWeight: '700' },
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
