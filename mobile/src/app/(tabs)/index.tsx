import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProduceThumb } from '@/components/ProduceThumb';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg, formatPrice } from '@/lib/format';
import { colors, radius, statusTint } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const {
    role,
    setRole,
    harvests,
    plan,
    dealApproved,
    orderRequests,
    chats,
    activeSellerFarm,
    runDemo,
  } = useFarmPool();

  const requests =
    plan && dealApproved ? orderRequests.filter((r) => r.orderId === plan.order.id) : [];
  const allAccepted = requests.length > 0 && requests.every((r) => r.status === 'Accepted');
  const anyDeclined = requests.some((r) => r.status === 'Declined');
  const orderStatus = !plan
    ? null
    : !dealApproved
      ? 'Plan ready'
      : allAccepted
        ? 'Confirmed'
        : anyDeclined
          ? 'Action needed'
          : 'Awaiting sellers';
  const orderTint =
    orderStatus === 'Confirmed'
      ? statusTint.Accepted
      : orderStatus === 'Action needed'
        ? statusTint.Declined
        : statusTint.Pending;

  const pendingRequests = orderRequests.filter((r) => r.status === 'Pending');

  const conversations = Object.entries(chats)
    .map(([harvestId, messages]) => ({
      harvest: harvests.find((h) => h.id === harvestId),
      last: messages[messages.length - 1],
    }))
    .filter((entry) => entry.harvest && entry.last)
    .sort((a, b) => b.last.sentAt.localeCompare(a.last.sentAt))
    .slice(0, 2);

  function goBuy() {
    setRole('buyer');
    router.push('/buyer');
  }

  function goSell() {
    setRole('seller');
    router.push('/farmer');
  }

  function openOrder() {
    setRole('buyer');
    router.push('/orders');
  }

  function openRequests() {
    setRole('seller');
    router.push('/orders');
  }

  function loadSample() {
    runDemo();
    router.push('/matches');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>FP</Text>
            </View>
            <Text style={styles.wordmark}>FarmPool</Text>
          </View>
          <TouchableOpacity style={styles.roleChip} onPress={() => router.push('/account')}>
            <Text style={styles.roleChipText}>
              {role === 'buyer' ? 'Buyer' : (activeSellerFarm ?? 'Seller')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroHeading}>Small farms.{'\n'}Bigger opportunities.</Text>
          <Text style={styles.heroSub}>
            Pool fragmented farm supply into reliable commercial orders.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choose your side of the market</Text>
        <TouchableOpacity style={styles.roleCardPrimary} activeOpacity={0.85} onPress={goSell}>
          <View style={styles.roleIconLight}>
            <Text style={styles.roleIconTextLight}>F</Text>
          </View>
          <View style={styles.roleCopy}>
            <Text style={styles.roleTitlePrimary}>I’m a farmer</Text>
            <Text style={styles.roleTextPrimary}>List a harvest for pooled orders</Text>
          </View>
          <Text style={styles.roleArrowPrimary}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roleCardSecondary} activeOpacity={0.85} onPress={goBuy}>
          <View style={styles.roleIconDark}>
            <Text style={styles.roleIconTextDark}>B</Text>
          </View>
          <View style={styles.roleCopy}>
            <Text style={styles.roleTitleSecondary}>I’m a buyer</Text>
            <Text style={styles.roleTextSecondary}>Build one large order from many farms</Text>
          </View>
          <Text style={styles.roleArrowSecondary}>›</Text>
        </TouchableOpacity>

        {plan ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>Open order</Text>
              <TouchableOpacity onPress={openOrder}>
                <Text style={styles.sectionLink}>View</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.card} onPress={openOrder}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowTitle}>
                  {formatKg(plan.requestedKg)} {plan.order.crop}
                </Text>
                <View style={[styles.statusChip, { backgroundColor: orderTint.bg }]}>
                  <Text style={[styles.statusChipText, { color: orderTint.fg }]}>
                    {orderStatus}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowMeta}>
                {formatPrice(plan.cost.deliveredPerKg)} delivered · {plan.selected.length}{' '}
                suppliers · by {plan.order.deliveryDate}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.card, { marginTop: 22 }]}>
            <Text style={styles.emptyText}>No open orders yet.</Text>
            <TouchableOpacity onPress={loadSample}>
              <Text style={styles.linkText}>Load sample scenario</Text>
            </TouchableOpacity>
          </View>
        )}

        {pendingRequests.length > 0 || harvests.length > 0 ? (
          <View style={styles.bandCard}>
            <TouchableOpacity style={styles.listRow} onPress={openRequests}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowTitle}>Order requests</Text>
                <Text style={styles.rowValue}>
                  {pendingRequests.length > 0 ? `${pendingRequests.length} pending` : 'None open'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.listRow, styles.listRowDivider]}
              onPress={() => router.push('/listings')}>
              <View style={styles.rowBetween}>
                <Text style={styles.rowTitle}>Listings on the market</Text>
                <Text style={styles.rowValue}>{harvests.length}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {conversations.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>Recent activity</Text>
              <TouchableOpacity onPress={() => router.push('/messages')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              {conversations.map(({ harvest, last }, index) => (
                <TouchableOpacity
                  key={harvest!.id}
                  style={[styles.listRow, styles.thumbRow, index > 0 && styles.listRowDivider]}
                  onPress={() =>
                    router.push({ pathname: '/chat', params: { harvestId: harvest!.id } })
                  }>
                  <ProduceThumb harvest={harvest!} size={40} />
                  <View style={styles.thumbRowBody}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.rowTitle}>{harvest!.farmerName}</Text>
                      <Text style={styles.rowMeta}>{harvest!.crop}</Text>
                    </View>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {last.sender === 'buyer' ? 'Buyer: ' : 'Seller: '}
                      {last.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { color: '#F5EFE2', fontSize: 12, fontWeight: '800', letterSpacing: -0.3 },
  wordmark: { color: colors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  roleChip: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  roleChipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  hero: { marginTop: 20, marginBottom: 4 },
  heroHeading: {
    color: colors.ink,
    fontSize: 37,
    fontWeight: '800',
    lineHeight: 41,
    letterSpacing: -1.4,
  },
  heroSub: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  sectionTitleInRow: { marginTop: 0, marginBottom: 0 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
  },
  sectionLink: { color: colors.tan, fontSize: 12, fontWeight: '700' },
  roleCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    padding: 16,
  },
  roleCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 16,
    marginTop: 9,
  },
  roleIconLight: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  roleIconDark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  roleIconTextLight: { color: '#F5EFE2', fontSize: 16, fontWeight: '800' },
  roleIconTextDark: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  roleCopy: { flex: 1, paddingHorizontal: 13 },
  roleTitlePrimary: { color: '#F5EFE2', fontSize: 17, fontWeight: '800' },
  roleTextPrimary: { color: '#CBDCC9', fontSize: 12, marginTop: 3 },
  roleTitleSecondary: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' },
  roleTextSecondary: { color: colors.muted, fontSize: 12, marginTop: 3 },
  roleArrowPrimary: { color: '#F5EFE2', fontSize: 26 },
  roleArrowSecondary: { color: colors.primary, fontSize: 26 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bandCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  listRow: { paddingVertical: 10 },
  listRowDivider: { borderTopColor: colors.line, borderTopWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  rowValue: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  statusChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  thumbRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbRowBody: { flex: 1 },
  emptyText: { color: colors.muted, fontSize: 13 },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginTop: 8 },
});
