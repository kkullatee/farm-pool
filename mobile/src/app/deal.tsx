import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoneyExact, formatPrice } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function DealScreen() {
  const router = useRouter();
  const { plan, dealApproved, approveDeal, resetDemo } = useFarmPool();

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
        <Text style={styles.eyebrow}>{dealApproved ? 'ORDER APPROVED' : 'PLAN READY'}</Text>
        <Text style={styles.title}>{dealApproved ? 'FarmPool is coordinating the deal.' : 'Approve to start coordination.'}</Text>
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
              <Text style={styles.approvedText}>{dealApproved ? 'APPROVED' : 'PENDING'}</Text>
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
        {plan.selected.map((lot) => (
          <View key={lot.harvest.id} style={styles.payoutCard}>
            <View style={styles.payoutMark}>
              <Text style={styles.payoutMarkText}>{lot.harvest.farmerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.payoutCopy}>
              <Text style={styles.payoutName}>{lot.harvest.farmerName}</Text>
              <Text style={styles.payoutDetail}>{formatKg(lot.allocatedKg)} · {lot.harvest.location}</Text>
            </View>
            <View style={styles.payoutValueWrap}>
              <Text style={styles.payoutValue}>{formatMoneyExact(lot.allocatedKg * lot.harvest.minimumPricePerKg)}</Text>
              <Text style={styles.payoutLabel}>farm payout</Text>
            </View>
          </View>
        ))}

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
