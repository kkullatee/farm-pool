import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleSwitch } from '@/components/RoleSwitch';
import { useFarmPool } from '@/context/FarmPoolContext';
import { formatKg } from '@/lib/format';
import { colors, shadow } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { harvests, runDemo, role, orderRequests } = useFarmPool();
  const availableKg = harvests.reduce((sum, harvest) => sum + harvest.quantityKg, 0);
  const pendingRequests = orderRequests.filter((request) => request.status === 'Pending').length;

  function launchDemo() {
    runDemo();
    router.push('/matches');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetters}>FP</Text>
            </View>
            <View>
              <Text style={styles.logo}>FarmPool</Text>
              <Text style={styles.logoSub}>POOLED SUPPLY NETWORK</Text>
            </View>
          </View>
          <RoleSwitch />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ONE ORDER · MANY LOCAL FARMS</Text>
          <Text style={styles.heading}>Small farms.{"\n"}Bigger opportunities.</Text>
          <Text style={styles.description}>
            FarmPool verifies compatible harvests, pools supply and builds a transparent delivery
            plan that works for farmers and buyers.
          </Text>

          <TouchableOpacity style={styles.demoButton} activeOpacity={0.85} onPress={launchDemo}>
            <View style={styles.demoIcon}>
              <Text style={styles.demoIconText}>✦</Text>
            </View>
            <View style={styles.demoCopy}>
              <Text style={styles.demoTitle}>Run the 60-second judge demo</Text>
              <Text style={styles.demoText}>Pool 10,000 kg of mangoes for one buyer</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{harvests.length}</Text>
            <Text style={styles.metricLabel}>farms ready</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatKg(availableKg)}</Text>
            <Text style={styles.metricLabel}>listed supply</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{pendingRequests}</Text>
            <Text style={styles.metricLabel}>open requests</Text>
          </View>
        </View>

        <Text style={styles.question}>Choose your side of the market</Text>

        {role === 'seller' ? (
          <TouchableOpacity
            style={styles.requestsButton}
            activeOpacity={0.85}
            onPress={() => router.push('/seller-orders')}>
            <View style={styles.requestsIcon}>
              <Text style={styles.requestsIconText}>{pendingRequests > 0 ? pendingRequests : '✓'}</Text>
            </View>
            <View style={styles.roleCopy}>
              <Text style={styles.requestsTitle}>Order requests</Text>
              <Text style={styles.requestsText}>
                {pendingRequests > 0
                  ? `${pendingRequests} new request${pendingRequests === 1 ? '' : 's'} from buyers`
                  : 'No new requests right now'}
              </Text>
            </View>
            <Text style={styles.requestsArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => router.push('/farmer')}>
          <View style={styles.roleIconLight}>
            <Text style={styles.roleIconTextLight}>F</Text>
          </View>
          <View style={styles.roleCopy}>
            <Text style={styles.primaryTitle}>I’m a farmer</Text>
            <Text style={styles.primaryText}>List a harvest with photo, voice and quality data</Text>
          </View>
          <Text style={styles.primaryArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.85}
          onPress={() => router.push('/buyer')}>
          <View style={styles.roleIconDark}>
            <Text style={styles.roleIconTextDark}>B</Text>
          </View>
          <View style={styles.roleCopy}>
            <Text style={styles.secondaryTitle}>I’m a buyer</Text>
            <Text style={styles.secondaryText}>Create a large order and see a pooled supply plan</Text>
          </View>
          <Text style={styles.secondaryArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.utilityRow}>
          <TouchableOpacity
            style={styles.utilityButton}
            activeOpacity={0.85}
            onPress={() => router.push('/my-listings')}>
            <Text style={styles.utilityTitle}>My listings</Text>
            <Text style={styles.utilityText}>
              {role === 'seller' ? 'Lots you have on the market' : 'Every lot on the market'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.utilityButton}
            activeOpacity={0.85}
            onPress={() => router.push('/messages')}>
            <Text style={styles.utilityTitle}>Messages</Text>
            <Text style={styles.utilityText}>
              {role === 'seller' ? 'Buyer questions for your farm' : 'Your seller conversations'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.howCard}>
          <Text style={styles.howEyebrow}>HOW MATCHING WORKS</Text>
          <Text style={styles.howTitle}>What becomes possible</Text>
          {[
            ['01', 'Screens each lot', 'Photos plus simple seller-provided produce details.'],
            ['02', 'Protects taste consistency', 'Only groups the same crop, variety and quality profile.'],
            ['03', 'Builds the delivery', 'Selects farms, allocates quantity and prices a shared route.'],
            ['04', 'Explains every decision', 'Shows accepted and rejected farms with clear reasons.'],
          ].map(([number, title, copy]) => (
            <View key={number} style={styles.howRow}>
              <Text style={styles.howNumber}>{number}</Text>
              <View style={styles.howCopy}>
                <Text style={styles.howRowTitle}>{title}</Text>
                <Text style={styles.howRowText}>{copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Hackathon prototype · Demo farms and prices are fictional · Physical testing remains part
          of final quality assurance.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 48 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 13, marginRight: 10 },
  logoLetters: { color: colors.lime, fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  logo: { color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  logoSub: { color: colors.primary, fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  requestsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 19, padding: 16, marginBottom: 11 },
  requestsIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.lime },
  requestsIconText: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  requestsTitle: { color: colors.surface, fontSize: 17, fontWeight: '900' },
  requestsText: { color: '#BFC9C0', fontSize: 11, lineHeight: 15, marginTop: 3 },
  requestsArrow: { color: colors.lime, fontSize: 28 },
  hero: { marginTop: 42 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  heading: { color: colors.ink, fontSize: 43, fontWeight: '900', lineHeight: 47, letterSpacing: -1.7, marginTop: 10 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 16 },
  demoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 21, padding: 15, marginTop: 24, ...shadow },
  demoIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lime, borderRadius: 13 },
  demoIconText: { color: colors.primaryDark, fontSize: 22, fontWeight: '900' },
  demoCopy: { flex: 1, paddingHorizontal: 12 },
  demoTitle: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  demoText: { color: '#BFC9C0', fontSize: 11, lineHeight: 15, marginTop: 3 },
  arrow: { color: colors.lime, fontSize: 30, fontWeight: '500' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 19, paddingVertical: 18, paddingHorizontal: 8, marginTop: 17 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  metricLabel: { color: colors.faint, fontSize: 9, marginTop: 4 },
  metricDivider: { width: 1, height: 30, backgroundColor: colors.border },
  question: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 33, marginBottom: 13 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 19, padding: 16 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderColor: colors.line, borderWidth: 1, borderRadius: 19, padding: 16, marginTop: 11 },
  roleIconLight: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
  roleIconDark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface },
  roleIconTextLight: { color: colors.lime, fontSize: 16, fontWeight: '900' },
  roleIconTextDark: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  roleCopy: { flex: 1, paddingHorizontal: 13 },
  primaryTitle: { color: colors.surface, fontSize: 17, fontWeight: '900' },
  primaryText: { color: '#DCE8DE', fontSize: 11, lineHeight: 15, marginTop: 3 },
  secondaryTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' },
  secondaryText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  primaryArrow: { color: colors.lime, fontSize: 28 },
  secondaryArrow: { color: colors.primary, fontSize: 28 },
  utilityRow: { flexDirection: 'row', gap: 11, marginTop: 11 },
  utilityButton: { flex: 1, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 19, padding: 14 },
  utilityTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  utilityText: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  howCard: { backgroundColor: colors.surface, borderRadius: 23, padding: 19, marginTop: 31 },
  howEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  howTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 7, marginBottom: 5 },
  howRow: { flexDirection: 'row', paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 },
  howNumber: { color: colors.primary, fontSize: 12, fontWeight: '900', width: 34, paddingTop: 2 },
  howCopy: { flex: 1 },
  howRowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  howRowText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  disclaimer: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 22 },
});
