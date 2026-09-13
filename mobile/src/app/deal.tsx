import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoneyExact, formatPrice, lotCode } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function DealScreen() {
  const router = useRouter();
  const { plan, dealApproved, approveDeal, resetDemo, orderRequests, recordOutcome, fulfilmentLog } =
    useFarmPool();

  // Requests only describe the CURRENT approval. After the buyer picks a
  // different pool, approval resets and old statuses must not leak onto the
  // new pool's farms.
  const requests =
    plan && dealApproved ? orderRequests.filter((r) => r.orderId === plan.order.id) : [];
  const outcomeRecorded = plan ? fulfilmentLog.some((r) => r.orderId === plan.order.id) : false;
  const requestFor = (harvestId: string) => requests.find((r) => r.harvestId === harvestId);
  const allAccepted = requests.length > 0 && requests.every((r) => r.status === 'Accepted');
  const anyDeclined = requests.some((r) => r.status === 'Declined');

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No pooled order yet</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.primaryButtonText}>Start at FarmPool</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function startAgain() {
    resetDemo();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <Text style={styles.successCheck}>✓</Text>
        </View>
        <Text style={styles.eyebrow}>
          {!dealApproved
            ? 'PLAN READY'
            : allAccepted
              ? 'ORDER CONFIRMED'
              : anyDeclined
                ? 'ACTION NEEDED'
                : 'AWAITING SELLER CONFIRMATIONS'}
        </Text>
        <Text style={styles.title}>
          {!dealApproved
            ? 'Approve to start coordination.'
            : allAccepted
              ? 'All sellers confirmed. FarmPool is coordinating the deal.'
              : anyDeclined
                ? 'A seller declined. Pick another pool or talk to them.'
                : 'Each seller has been asked to confirm their share.'}
        </Text>
        <Text style={styles.description}>
          One buyer agreement is now translated into clear farm allocations, checks, collection
          stops and payment records.
        </Text>

        <View style={styles.orderCard}>
          <View style={styles.orderTop}>
            <View>
              <Text style={styles.cardEyebrow}>ORDER SUMMARY</Text>
              <Text style={styles.orderName}>{plan.order.businessName}</Text>
            </View>
            <View style={styles.approvedPill}>
              <Text style={styles.approvedText}>
                {!dealApproved
                  ? 'PENDING'
                  : allAccepted
                    ? 'CONFIRMED'
                    : anyDeclined
                      ? 'ACTION NEEDED'
                      : 'AWAITING SELLERS'}
              </Text>
            </View>
          </View>
          <View style={styles.orderStats}>
            <View style={styles.orderStat}>
              <Text style={styles.orderStatValue}>{formatKg(plan.fulfilledKg)}</Text>
              <Text style={styles.orderStatLabel}>{plan.order.crop} pooled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.orderStat}>
              <Text style={styles.orderStatValue}>{formatPrice(plan.cost.deliveredPerKg)}</Text>
              <Text style={styles.orderStatLabel}>delivered price</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.orderStat}>
              <Text style={styles.orderStatValue}>{plan.order.deliveryDate.slice(5)}</Text>
              <Text style={styles.orderStatLabel}>delivery date</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Farmer commitments</Text>
        {plan.selected.map((lot, index) => (
          <View key={lot.harvest.id} style={styles.payoutCard}>
            <View style={styles.payoutMark}>
              <Text style={styles.payoutMarkText}>{lot.harvest.farmerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.payoutCopy}>
              <View style={styles.payoutNameRow}>
                <Text style={styles.payoutName}>{lot.harvest.farmerName}</Text>
                {requestFor(lot.harvest.id) ? (
                  <View
                    style={[
                      styles.sellerStatusPill,
                      requestFor(lot.harvest.id)!.status === 'Accepted' && styles.sellerStatusAccepted,
                      requestFor(lot.harvest.id)!.status === 'Declined' && styles.sellerStatusDeclined,
                    ]}>
                    <Text
                      style={[
                        styles.sellerStatusText,
                        requestFor(lot.harvest.id)!.status === 'Accepted' && styles.sellerStatusTextAccepted,
                        requestFor(lot.harvest.id)!.status === 'Declined' && styles.sellerStatusTextDeclined,
                      ]}>
                      {requestFor(lot.harvest.id)!.status}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.payoutDetail}>{formatKg(lot.allocatedKg)} · {lot.harvest.location}</Text>
              <Text style={styles.payoutLot}>{lotCode(lot.harvest.id, index + 1)} · scanned at pickup and delivery</Text>
            </View>
            <View style={styles.payoutValueWrap}>
              <Text style={styles.payoutValue}>{formatMoneyExact(lot.allocatedKg * lot.harvest.minimumPricePerKg)}</Text>
              <Text style={styles.payoutLabel}>farm payout</Text>
            </View>
          </View>
        ))}

        {dealApproved && !allAccepted && !anyDeclined ? (
          <View style={styles.switchHint}>
            <Text style={styles.switchHintText}>
              Waiting on sellers. In this demo, switch to Seller mode on the home screen to answer
              the requests yourself.
            </Text>
          </View>
        ) : null}

        {dealApproved && allAccepted ? (
          <View style={styles.outcomeCard}>
            <Text style={styles.inspectionEyebrow}>AFTER DELIVERY (DEMO)</Text>
            <Text style={styles.inspectionTitle}>Close out this order</Text>
            {outcomeRecorded ? (
              <Text style={styles.outcomeDone}>
                Outcome logged. Completed orders are stored in the same format as the model’s
                training data, so real history replaces the synthetic set over time.
              </Text>
            ) : (
              <>
                <Text style={styles.inspectionText}>
                  Record how it went. This writes a training record in the exact schema the
                  ranking model learns from.
                </Text>
                <View style={styles.outcomeActions}>
                  <TouchableOpacity
                    style={styles.outcomeGood}
                    onPress={() =>
                      recordOutcome({ fulfilled: true, onTime: true, sellerDropout: false })
                    }>
                    <Text style={styles.outcomeGoodText}>Delivered in full</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.outcomeBad}
                    onPress={() =>
                      recordOutcome({ fulfilled: false, onTime: false, sellerDropout: true })
                    }>
                    <Text style={styles.outcomeBadText}>Not fulfilled</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : null}

        {anyDeclined ? (
          <View style={styles.declinedCard}>
            <Text style={styles.declinedTitle}>A seller declined their share</Text>
            <Text style={styles.declinedText}>
              The order is not stuck. Pick a different pool from the supply plan (the reserve farms
              are still available), or chat with the seller to sort it out. Approving a new pool
              sends fresh requests.
            </Text>
            <TouchableOpacity
              style={styles.declinedButton}
              onPress={() => router.replace('/matches')}>
              <Text style={styles.declinedButtonText}>Pick another pool</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inspectionCard}>
          <Text style={styles.inspectionEyebrow}>PICKUP CHECK (SAMPLE RECORD)</Text>
          <Text style={styles.inspectionTitle}>Every lot is checked before it joins the pool</Text>
          {plan.selected.map((lot, index) => (
            <View key={lot.harvest.id} style={styles.inspectionRow}>
              <Text style={styles.inspectionLot}>{lotCode(lot.harvest.id, index + 1)}</Text>
              <Text style={styles.inspectionStatus}>Scheduled at pickup</Text>
            </View>
          ))}
          <Text style={styles.inspectionText}>
            The checkpoint team records who inspected each lot, what was used to check it, and the
            result. A failed lot is removed and replaced from the reserve, and both the buyer and
            the farmer are told. Payment releases only after the buyer accepts the delivery.
            Reliability scores update after every completed order.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Autonomous workflow</Text>
        <View style={styles.timelineCard}>
          <TimelineStep
            number="1"
            title="Confirm each farmer"
            copy="Quantity, harvest date and collection window are sent for confirmation."
            state="NOW"
          />
          <TimelineStep
            number="2"
            title="Book shared transport"
            copy={`${plan.cost.trucks} refrigerated truck${plan.cost.trucks === 1 ? '' : 's'} across an estimated ${plan.cost.routeKm} km route.`}
            state="NEXT"
          />
          <TimelineStep
            number="3"
            title="Verify the pooled sample"
            copy={`Check the pooled sample matches the order${plan.order.minimumCondition === 'Any' ? '' : ` and is ${plan.order.minimumCondition.toLowerCase()} condition or better`}.`}
            state="GATE"
          />
          <TimelineStep
            number="4"
            title="Deliver and release payments"
            copy={`Deliver to ${plan.order.deliveryLocation}; preserve traceability for every lot.`}
            state="FINAL"
            last
          />
        </View>

        <View style={styles.impactCard}>
          <Text style={styles.impactEyebrow}>THE NEW CAPABILITY</Text>
          <Text style={styles.impactTitle}>Many small farms can behave like one reliable supplier.</Text>
          <Text style={styles.impactText}>
            The buyer receives one quality-controlled order and one delivery plan. Farmers retain
            their identity, price and traceability instead of disappearing inside a blended load.
          </Text>
        </View>

        {!dealApproved ? (
          <TouchableOpacity style={styles.primaryButton} onPress={approveDeal}>
            <Text style={styles.primaryButtonText}>Approve pooled order</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={startAgain}>
            <Text style={styles.primaryButtonText}>Finish demo and start again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/matches')}>
          <Text style={styles.secondaryButtonText}>Review the supply plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert(
              'Report a problem',
              'Tell us what went wrong with this order. For lot questions, chat with the seller from the supply plan. FarmPool holds payment until the problem is resolved.',
            )
          }>
          <Text style={styles.disputeText}>Report a problem</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineStep({
  number,
  title,
  copy,
  state,
  last = false,
}: {
  number: string;
  title: string;
  copy: string;
  state: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.timelineStep, last && styles.timelineStepLast]}>
      <View style={styles.timelineNumber}>
        <Text style={styles.timelineNumberText}>{number}</Text>
      </View>
      <View style={styles.timelineCopy}>
        <View style={styles.timelineTitleRow}>
          <Text style={styles.timelineTitle}>{title}</Text>
          <Text style={styles.timelineState}>{state}</Text>
        </View>
        <Text style={styles.timelineText}>{copy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 55 },
  empty: { flex: 1, justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 28, fontWeight: '900', marginBottom: 20 },
  successIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  successCheck: { color: colors.lime, fontSize: 30, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 22 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 41, letterSpacing: -1.1, fontWeight: '900', marginTop: 8 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 12 },
  orderCard: { backgroundColor: colors.ink, borderRadius: 23, padding: 18, marginTop: 24 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  orderName: { color: colors.surface, fontSize: 17, fontWeight: '900', marginTop: 4, maxWidth: 220 },
  approvedPill: { backgroundColor: colors.lime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  approvedText: { color: colors.primaryDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  orderStats: { flexDirection: 'row', alignItems: 'center', marginTop: 19 },
  orderStat: { flex: 1 },
  orderStatValue: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  orderStatLabel: { color: '#AEBBAF', fontSize: 8, marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: '#3D4A40', marginHorizontal: 8 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 29, marginBottom: 12 },
  payoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 17, padding: 14, marginBottom: 8 },
  payoutMark: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  payoutMarkText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  payoutCopy: { flex: 1, paddingHorizontal: 10 },
  payoutName: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  payoutDetail: { color: colors.faint, fontSize: 9, marginTop: 3 },
  payoutNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sellerStatusPill: { backgroundColor: colors.amberSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  sellerStatusAccepted: { backgroundColor: colors.primarySoft },
  sellerStatusDeclined: { backgroundColor: colors.dangerSoft },
  sellerStatusText: { color: '#715112', fontSize: 8, fontWeight: '900' },
  sellerStatusTextAccepted: { color: colors.primaryDark },
  sellerStatusTextDeclined: { color: colors.danger },
  switchHint: { backgroundColor: colors.amberSoft, borderRadius: 15, padding: 13, marginTop: 4, marginBottom: 8 },
  switchHintText: { color: '#715112', fontSize: 12, lineHeight: 18 },
  declinedCard: { backgroundColor: colors.dangerSoft, borderRadius: 17, padding: 15, marginTop: 4, marginBottom: 8 },
  declinedTitle: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  declinedText: { color: '#7A4A42', fontSize: 12, lineHeight: 18, marginTop: 5 },
  declinedButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 11, marginTop: 11 },
  declinedButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  outcomeCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18, marginTop: 4, marginBottom: 8 },
  outcomeActions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  outcomeGood: { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 12 },
  outcomeGoodText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  outcomeBad: { flex: 1, alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: 13, paddingVertical: 12 },
  outcomeBadText: { color: colors.danger, fontSize: 13, fontWeight: '900' },
  outcomeDone: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  payoutLot: { color: colors.primary, fontSize: 9, fontWeight: '700', marginTop: 3 },
  inspectionCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18, marginTop: 4 },
  inspectionEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  inspectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 5, marginBottom: 8 },
  inspectionRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 9 },
  inspectionLot: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  inspectionStatus: { color: colors.amber, fontSize: 11, fontWeight: '800' },
  inspectionText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 11 },
  disputeText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  payoutValueWrap: { alignItems: 'flex-end' },
  payoutValue: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  payoutLabel: { color: colors.faint, fontSize: 8, marginTop: 3 },
  timelineCard: { backgroundColor: colors.surface, borderRadius: 21, padding: 18 },
  timelineStep: { flexDirection: 'row', minHeight: 93, borderLeftColor: colors.primarySoft, borderLeftWidth: 2, marginLeft: 13, paddingLeft: 28 },
  timelineStepLast: { borderLeftColor: 'transparent', minHeight: 72 },
  timelineNumber: { position: 'absolute', left: -16, top: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, borderColor: colors.surface, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  timelineNumberText: { color: colors.surface, fontSize: 10, fontWeight: '900' },
  timelineCopy: { flex: 1, paddingTop: 2 },
  timelineTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  timelineState: { color: colors.primary, backgroundColor: colors.primarySoft, fontSize: 7, fontWeight: '900', letterSpacing: 0.6, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5 },
  timelineText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  impactCard: { backgroundColor: colors.primarySoft, borderRadius: 21, padding: 18, marginTop: 14 },
  impactEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  impactTitle: { color: colors.primaryDark, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 6 },
  impactText: { color: '#506956', fontSize: 12, lineHeight: 18, marginTop: 7 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 17, marginTop: 22, paddingHorizontal: 17 },
  primaryButtonText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', paddingVertical: 16 },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
});
