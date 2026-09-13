import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleSwitch } from '@/components/RoleSwitch';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { useFarmPool } from '@/context/FarmPoolContext';
import { colors, radius } from '@/lib/theme';

export default function AccountScreen() {
  const router = useRouter();
  const { role, harvests, activeSellerFarm, setActiveSellerFarm, runDemo, resetDemo } =
    useFarmPool();
  const farms = [...new Set(harvests.map((harvest) => harvest.farmerName))];

  function confirmReset() {
    Alert.alert('Reset demo data', 'This clears all orders, listings, messages and outcomes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetDemo() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Account" />

        <Text style={styles.sectionTitle}>Market side</Text>
        <View style={styles.card}>
          <Text style={styles.helpText}>
            This demo runs both sides of the marketplace on one device.
          </Text>
          <View style={styles.switchWrap}>
            <RoleSwitch />
          </View>
        </View>

        {role === 'seller' ? (
          <>
            <Text style={styles.sectionTitle}>Selling as</Text>
            <View style={styles.card}>
              <SelectField
                label="Farm"
                hint="one seller at a time"
                placeholder="Pick which farm you are"
                value={activeSellerFarm ?? ''}
                options={farms.map((farm) => ({ value: farm }))}
                onChange={(farm) => setActiveSellerFarm(farm)}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/how-it-works')}>
            <Text style={styles.linkRowText}>How FarmPool works</Text>
            <Text style={styles.linkRowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Demo tools</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => {
              runDemo();
              router.push('/matches');
            }}>
            <Text style={styles.linkRowText}>Load sample scenario</Text>
            <Text style={styles.linkRowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowDivider]} onPress={confirmReset}>
            <Text style={styles.dangerText}>Reset demo data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Hackathon prototype. Demo farms and prices are fictional.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', paddingVertical: 6 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  helpText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  switchWrap: { alignItems: 'flex-start' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  linkRowDivider: { borderTopColor: colors.line, borderTopWidth: 1 },
  linkRowText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  linkRowArrow: { color: colors.faint, fontSize: 20 },
  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  footnote: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
