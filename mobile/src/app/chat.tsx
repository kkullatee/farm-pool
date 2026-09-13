import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg } from '@/lib/format';
import { colors } from '@/lib/theme';

const QUICK_PROMPTS = [
  'Can you send more details about the produce?',
  'How ripe is this batch?',
  'Are there any visible defects?',
  'When was this harvested?',
  'Can you provide recent photos?',
];

export default function ChatScreen() {
  const router = useRouter();
  const { harvestId } = useLocalSearchParams<{ harvestId: string }>();
  const { harvests, chats, sendChatMessage } = useFarmPool();
  const [draft, setDraft] = useState('');

  const harvest = harvests.find((entry) => entry.id === harvestId);
  const messages = harvestId ? (chats[harvestId] ?? []) : [];

  if (!harvest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Lot not found</Text>
          <TouchableOpacity style={styles.sendButton} onPress={() => router.back()}>
            <Text style={styles.sendText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function send(text: string) {
    sendChatMessage(harvest!.id, text);
    setDraft('');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerName}>{harvest.farmerName}</Text>
            <Text style={styles.headerLot}>
              {harvest.crop} · {harvest.variety} · {formatKg(harvest.quantityKg)} ·{' '}
              {harvest.condition} (seller-provided)
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Ask the seller anything before you approve the pool: ripeness, defects, photos,
              storage. Replies show here.
            </Text>
          </View>

          {harvest.imageUri && harvest.assessment.photoStatus === 'Accepted' ? (
            <Image source={{ uri: harvest.imageUri }} style={styles.lotPhoto} />
          ) : null}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.sender === 'buyer' ? styles.buyerBubble : styles.sellerBubble]}>
              <Text
                style={[
                  styles.bubbleText,
                  message.sender === 'buyer' ? styles.buyerBubbleText : styles.sellerBubbleText,
                ]}>
                {message.text}
              </Text>
            </View>
          ))}
          {messages.length > 0 ? (
            <Text style={styles.sentNote}>Sent to {harvest.farmerName}.</Text>
          ) : null}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.promptRow}
          contentContainerStyle={styles.promptContent}
          keyboardShouldPersistTaps="handled">
          {QUICK_PROMPTS.map((prompt) => (
            <TouchableOpacity key={prompt} style={styles.promptChip} onPress={() => send(prompt)}>
              <Text style={styles.promptText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor={colors.faint}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !draft.trim() && styles.sendDisabled]}
            disabled={!draft.trim()}
            onPress={() => send(draft)}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  emptyTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 24, fontWeight: '900', marginTop: -3 },
  headerCopy: { flex: 1, paddingHorizontal: 11 },
  headerName: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  headerLot: { color: colors.faint, fontSize: 10, marginTop: 3 },
  thread: { flex: 1 },
  threadContent: { padding: 16, paddingBottom: 10 },
  noticeCard: { backgroundColor: colors.primarySoft, borderRadius: 15, padding: 13, marginBottom: 14 },
  noticeText: { color: '#47684F', fontSize: 12, lineHeight: 18 },
  lotPhoto: { width: '100%', height: 160, borderRadius: 15, marginBottom: 14 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 8 },
  buyerBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  sellerBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  buyerBubbleText: { color: colors.surface },
  sellerBubbleText: { color: colors.ink },
  sentNote: { color: colors.faint, fontSize: 10, textAlign: 'right', marginTop: 2 },
  promptRow: { flexGrow: 0 },
  promptContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 7 },
  promptChip: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  promptText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    color: colors.ink,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    maxHeight: 110,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.surface, fontSize: 14, fontWeight: '900' },
});
