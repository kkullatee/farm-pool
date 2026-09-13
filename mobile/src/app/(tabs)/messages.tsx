import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProduceThumb } from '@/components/ProduceThumb';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFarmPool } from '@/context/FarmPoolContext';
import { farmLabel } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function MessagesScreen() {
  const router = useRouter();
  const { harvests, chats, role, order, activeSellerFarm } = useFarmPool();

  // A conversation exists once either side has sent a message about a lot.
  const conversations = Object.entries(chats)
    .map(([harvestId, messages]) => ({
      harvest: harvests.find((entry) => entry.id === harvestId),
      messages,
    }))
    .filter(
      (entry): entry is { harvest: NonNullable<typeof entry.harvest>; messages: typeof entry.messages } =>
        Boolean(entry.harvest) && entry.messages.length > 0,
    )
    // Buyers see every conversation; a seller only sees their own farm's.
    .filter(
      (entry) =>
        role === 'buyer' || !activeSellerFarm || entry.harvest.farmerName === activeSellerFarm,
    )
    .sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1].sentAt;
      const lastB = b.messages[b.messages.length - 1].sentAt;
      return lastB.localeCompare(lastA);
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          showBack={false}
          title="Messages"
          description={
            role === 'buyer'
              ? 'Your conversations with sellers, one per lot.'
              : activeSellerFarm
                ? `Conversations for ${activeSellerFarm}.`
                : 'Pick a demo seller in Account to see that farm’s messages.'
          }
        />

        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              {role === 'buyer'
                ? 'Open a pooled match and tap Chat with seller to start a conversation.'
                : 'Buyer questions about your lots will appear here.'}
            </Text>
          </View>
        ) : (
          conversations.map(({ harvest, messages }) => {
            const last = messages[messages.length - 1];
            const counterpart =
              role === 'buyer' ? farmLabel(harvest, harvests) : (order?.businessName ?? 'Buyer');
            return (
              <TouchableOpacity
                key={harvest.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({ pathname: '/chat', params: { harvestId: harvest.id } })
                }>
                <ProduceThumb harvest={harvest} size={44} />
                <View style={styles.cardCopy}>
                  <Text style={styles.name}>{counterpart}</Text>
                  <Text style={styles.lotLine}>
                    {harvest.crop} · {harvest.variety}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {last.sender === 'buyer' ? 'Buyer: ' : 'Seller: '}
                    {last.text}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
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
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginTop: 12 },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' },
  cardCopy: { flex: 1, paddingHorizontal: 12 },
  name: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  lotLine: { color: colors.faint, fontSize: 10, marginTop: 2 },
  preview: { color: colors.muted, fontSize: 12, marginTop: 4 },
  arrow: { color: colors.primary, fontSize: 26 },
});
