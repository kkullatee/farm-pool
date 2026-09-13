import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProduceThumb } from '@/components/ProduceThumb';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VisualAssessmentSummary } from '@/components/VisualAssessmentSummary';
import { useFarmPool } from '@/context/FarmPoolContext';
import { farmLabel, formatKg, formatPrice } from '@/lib/format';
import { colors, statusTint } from '@/lib/theme';
import { Harvest } from '@/lib/types';

function listingStatus(harvest: Harvest): { text: string; bg: string; fg: string } {
  if (harvest.needsReview) {
    return { text: 'Catalog review', bg: statusTint.Pending.bg, fg: statusTint.Pending.fg };
  }
  if (harvest.assessment.photoStatus === 'Retake required') {
    return { text: 'Photo retake needed', bg: colors.dangerSoft, fg: colors.danger };
  }
  if (
    harvest.assessment.photoStatus === 'Manual review' ||
    harvest.assessment.visualAssessment?.verificationStatus === 'needs-review'
  ) {
    return { text: 'Photo review', bg: colors.amberSoft, fg: colors.amber };
  }
  return { text: 'Listed', bg: statusTint.Accepted.bg, fg: statusTint.Accepted.fg };
}

export default function MyListingsScreen() {
  const router = useRouter();
  const { harvests, role, activeSellerFarm } = useFarmPool();

  // Buyers browse every listing; a seller sees only the farm they demo as.
  const visible =
    role === 'seller' && activeSellerFarm
      ? harvests.filter((harvest) => harvest.farmerName === activeSellerFarm)
      : harvests;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={role === 'seller' && activeSellerFarm ? `${activeSellerFarm} listings` : 'Listings'}
          description={
            role === 'seller' && !activeSellerFarm
              ? 'Pick a demo seller in Account to filter to one farm.'
              : `${visible.length} lot${visible.length === 1 ? '' : 's'} currently on the market.`
          }
        />

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyText}>List a harvest and it will appear here.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/farmer')}>
              <Text style={styles.primaryButtonText}>List a harvest</Text>
            </TouchableOpacity>
          </View>
        ) : (
          visible.map((harvest) => {
            const status = listingStatus(harvest);
            return (
              <View key={harvest.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <ProduceThumb harvest={harvest} size={44} />
                  <View style={styles.cardCopy}>
                    <Text style={styles.farmName}>{farmLabel(harvest, harvests)}</Text>
                    <Text style={styles.cropLine}>
                      {harvest.crop} · {harvest.variety}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.fg }]}>
                      {status.text.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>QUANTITY</Text>
                    <Text style={styles.statValue}>
                      {formatKg(harvest.quantityKg)}
                      {harvest.quantityEstimated ? ' (est.)' : ''}
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>CONDITION</Text>
                    <Text style={styles.statValue}>{harvest.condition}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>MIN PRICE</Text>
                    <Text style={styles.statValue}>{formatPrice(harvest.minimumPricePerKg)}</Text>
                  </View>
                </View>

                <Text style={styles.metaLine}>
                  Harvest {harvest.harvestDate} · {harvest.location} ·{' '}
                  {harvest.verification ?? 'Self-reported'}
                </Text>
                <VisualAssessmentSummary harvest={harvest} compact />
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
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  primaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 22, marginTop: 18 },
  primaryButtonText: { color: colors.cream, fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginTop: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardCopy: { flex: 1, paddingRight: 10 },
  farmName: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  cropLine: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, paddingVertical: 11, marginTop: 13 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.faint, fontSize: 7, fontWeight: '800', letterSpacing: 0.4 },
  statValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3 },
  metaLine: { color: colors.faint, fontSize: 11, lineHeight: 16, marginTop: 11 },
});
