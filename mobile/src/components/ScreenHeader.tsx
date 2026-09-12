import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/lib/theme';

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  showBack?: boolean;
};

export function ScreenHeader({ eyebrow, title, description, showBack = true }: Props) {
  const router = useRouter();

  return (
    <View>
      {showBack && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 18,
    marginBottom: 18,
  },
  backText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.1,
    lineHeight: 41,
    marginTop: 8,
  },
  description: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
});

