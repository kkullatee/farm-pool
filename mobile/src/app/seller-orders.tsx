import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoneyExact } from '@/lib/format';
import { colors } from '@/lib/theme';
import { SellerResponse } from '@/lib/types';

const STATUS_STYLE: Record<SellerResponse, { bg: string; fg: string }> = {
  Pending: { bg: '#FFF1CF', fg: '#715112' },
  Accepted: { bg: '#DCEBD8', fg: '#164D2B' },
  Declined: { bg: '#FBE3DE', fg: '#B44A3E' },
};

export default function SellerOrdersScreen() {
  const router = useRouter();
  const { orderRequests, respondToRequest } = useFarmPool();
  const pending = orderRequests.filter((request) => request.status === 'Pending').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="SELLER MODE"
          title="Order requests"
          description={
            pending > 0
              ? `${pending} request${pending === 1 ? '' : 's'} waiting for your answer.`
              : 'Requests appear here when a buyer approves a pooled order with your produce.'
          }
        />

        <View style={styles.demoNote}>
          <Text style={styles.demoNoteText}>
            Demo mode: this device acts as every seller. Each card names the farm you are
            answering for.
          </Text>
        </View>

        {orderRequests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No order requests yet</Text>
            <Text style={styles.emptyText}>
              Switch to buyer mode, approve a pooled order, then come back here.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
              <Text style={styles.primaryButtonText}>Back to FarmPool</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orderRequests.map((request) => {
            const statusStyle = STATUS_STYLE[request.status];
            return (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.actingAs}>YOU ARE {request.farmerName.toUpperCase()}</Text>
                    <Text style={styles.buyerName}>{request.buyerName}</Text>
                    <Text style={styles.lotLine}>
                      {request.crop} · {request.variety}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.fg }]}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>YOUR SHARE</Text>
                    <Text style={styles.statValue}>{formatKg(request.allocatedKg)}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>YOUR PRICE</Text>
                    <Text style={styles.statValue}>${request.pricePerKg.toFixed(2)}/kg</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>PAYOUT</Text>
                    <Text style={styles.statValue}>
                      {formatMoneyExact(request.allocatedKg * request.pricePerKg)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.deliveryLine}>
                  Deliver by {request.deliveryDate} · {request.deliveryLocation}
                </Text>

                {request.status === 'Pending' ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => respondToRequest(request.id, 'Accepted')}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineButton}
                      onPress={() => respondToRequest(request.id, 'Declined')}>
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.answered}>
                    {request.status === 'Accepted'
                      ? 'You accepted. The buyer can see this straight away.'
                      : 'You declined. The buyer will pick another pool or contact you.'}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() =>
                    router.push({ pathname: '/chat', params: { harvestId: request.harvestId } })
                  }>
                  <Text style={styles.chatButtonText}>Chat with buyer</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 55 },
  demoNote: { backgroundColor: colors.primarySoft, borderRadius: 15, padding: 13, marginTop: 22 },
  demoNoteText: { color: '#47684F', fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, backgroundColor: colors.primary, borderRadius: 15, paddingHorizontal: 22, marginTop: 18 },
  primaryButtonText: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginTop: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCopy: { flex: 1, paddingRight: 10 },
  actingAs: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  buyerName: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 4 },
  lotLine: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 14, paddingVertical: 11, marginTop: 13 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.faint, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 3 },
  deliveryLine: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 11 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  acceptButton: { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 13 },
  acceptText: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  declineButton: { flex: 1, alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: 13, paddingVertical: 13 },
  declineText: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  answered: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  chatButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 13, paddingVertical: 11, marginTop: 10 },
  chatButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
});
