import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatMoneyExact } from '@/lib/format';
import { colors, statusTint } from '@/lib/theme';
import { SellerResponse } from '@/lib/types';

const STATUS_STYLE: Record<SellerResponse, { bg: string; fg: string }> = {
  Pending: statusTint.Pending,
  Accepted: statusTint.Accepted,
  Declined: statusTint.Declined,
};

export function SellerOrders() {
  const router = useRouter();
  const { orderRequests, respondToRequest, harvests, activeSellerFarm, setActiveSellerFarm } =
    useFarmPool();
  const farms = [...new Set(harvests.map((harvest) => harvest.farmerName))];
  const myRequests = orderRequests.filter(
    (request) => request.farmerName === activeSellerFarm,
  );
  const pending = myRequests.filter((request) => request.status === 'Pending').length;
  const otherPending = orderRequests.filter(
    (request) => request.status === 'Pending' && request.farmerName !== activeSellerFarm,
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          showBack={false}
          title="Order requests"
          description={
            activeSellerFarm
              ? pending > 0
                ? `${pending} request${pending === 1 ? '' : 's'} waiting for ${activeSellerFarm}.`
                : `No open requests for ${activeSellerFarm}.`
              : 'Pick which farm you are demoing as.'
          }
        />

        <View style={{ marginTop: 20 }} />
        <SelectField
          label="Demo as"
          hint="one seller at a time"
          placeholder="Pick which farm you are"
          value={activeSellerFarm ?? ''}
          options={farms.map((farm) => ({ value: farm }))}
          onChange={(farm) => setActiveSellerFarm(farm)}
        />
        {otherPending > 0 ? (
          <Text style={styles.otherPendingNote}>
            {otherPending} more request{otherPending === 1 ? '' : 's'} for other farms. Switch the
            demo seller above to answer as them.
          </Text>
        ) : null}

        {!activeSellerFarm ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Pick a farm first</Text>
            <Text style={styles.emptyText}>
              In this one-device demo you answer for one seller at a time.
            </Text>
          </View>
        ) : myRequests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No requests for {activeSellerFarm}</Text>
            <Text style={styles.emptyText}>
              Requests appear here when a buyer approves a pooled order with this farm in it.
            </Text>
          </View>
        ) : (
          myRequests.map((request) => {
            const statusStyle = STATUS_STYLE[request.status];
            return (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardCopy}>
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
  otherPendingNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -8, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 22, marginTop: 18 },
  primaryButtonText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCopy: { flex: 1, paddingRight: 10 },
  actingAs: { color: colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  buyerName: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  lotLine: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, paddingVertical: 11, marginTop: 13 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.faint, fontSize: 7, fontWeight: '800', letterSpacing: 0.4 },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3 },
  deliveryLine: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 11 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  acceptButton: { flex: 1, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13 },
  acceptText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  declineButton: { flex: 1, alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: 10, paddingVertical: 13 },
  declineText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  answered: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  chatButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 10, paddingVertical: 11, marginTop: 10 },
  chatButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
});
