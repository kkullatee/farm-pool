import { useRouter } from "expo-router";

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>AI AGRICULTURE NETWORK</Text>
      </View>

      <Text style={styles.logo}>FarmPool</Text>

      <Text style={styles.heading}>
        Small farms.{"\n"}Bigger opportunities.
      </Text>

      <Text style={styles.description}>
        Combine compatible harvests from nearby farms and fulfil large buyer
        orders together.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>How FarmPool works</Text>

        <Text style={styles.step}>1. Farmers register their harvest</Text>
        <Text style={styles.step}>2. AI checks quality and location</Text>
        <Text style={styles.step}>3. Compatible farms are grouped</Text>
        <Text style={styles.step}>4. Transport costs are calculated</Text>
      </View>

      <Text style={styles.question}>How would you like to continue?</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={() => router.push("/farmer")}
>
        <Text style={styles.primaryButtonTitle}>I’m a farmer</Text>
        <Text style={styles.primaryButtonText}>
          Register produce and join a supply group
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.8}
        onPress={() => router.push("/buyer")}
      >
        <Text style={styles.secondaryButtonTitle}>I’m a buyer</Text>
        <Text style={styles.secondaryButtonText}>
          Find reliable, quality-matched produce
        </Text>
      </TouchableOpacity>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureNumber}>01</Text>
          <Text style={styles.featureText}>Quality matched</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureNumber}>02</Text>
          <Text style={styles.featureText}>Transport optimised</Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureNumber}>03</Text>
          <Text style={styles.featureText}>Fully traceable</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },
  container: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#DDEBD6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  badgeText: {
    color: "#35613D",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  logo: {
    color: "#1F6B3A",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 26,
  },
  heading: {
    color: "#17231A",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48,
    marginTop: 12,
  },
  description: {
    color: "#59645B",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 16,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 28,
  },
  summaryTitle: {
    color: "#17231A",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  step: {
    color: "#59645B",
    fontSize: 15,
    marginVertical: 5,
  },
  question: {
    color: "#17231A",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 30,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#1F6B3A",
    borderRadius: 18,
    padding: 20,
  },
  primaryButtonTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#DCEADF",
    fontSize: 14,
    marginTop: 5,
  },
  secondaryButton: {
    backgroundColor: "#E7EFE3",
    borderColor: "#B7CDB3",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    marginTop: 12,
  },
  secondaryButtonTitle: {
    color: "#245A35",
    fontSize: 19,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#58715E",
    fontSize: 14,
    marginTop: 5,
  },
  features: {
    marginTop: 28,
    gap: 12,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureNumber: {
    color: "#78A67C",
    fontSize: 13,
    fontWeight: "800",
    width: 35,
  },
  featureText: {
    color: "#4C5950",
    fontSize: 14,
  },
});