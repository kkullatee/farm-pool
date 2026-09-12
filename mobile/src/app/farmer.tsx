import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function FarmerScreen() {
  const router = useRouter();

  const [form, setForm] = useState({
    farmerName: "",
    crop: "",
    variety: "",
    quantity: "",
    location: "",
    harvestDate: "",
    minimumPrice: "",
    brix: "",
    defects: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submitHarvest() {
    if (!form.crop || !form.quantity || !form.location) {
      Alert.alert(
        "Missing information",
        "Please enter the crop, quantity and farm location."
      );
      return;
    }

    Alert.alert(
      "Harvest registered",
      `${form.quantity} kg of ${form.crop} has been added to FarmPool.`,
      [{ text: "Done", onPress: () => router.back() }]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.eyebrow}>FARMER REGISTRATION</Text>
        <Text style={styles.heading}>Register your harvest</Text>

        <Text style={styles.description}>
          Tell FarmPool what you expect to harvest. The AI will look for
          compatible farms and suitable buyers.
        </Text>

        <Text style={styles.sectionTitle}>Farm information</Text>

        <Input
          label="Farmer or farm name"
          placeholder="Example: Green Valley Farm"
          value={form.farmerName}
          onChangeText={(value) => updateField("farmerName", value)}
        />

        <Input
          label="Farm location *"
          placeholder="Example: Mildura, Victoria"
          value={form.location}
          onChangeText={(value) => updateField("location", value)}
        />

        <Text style={styles.sectionTitle}>Harvest information</Text>

        <Input
          label="Crop type *"
          placeholder="Example: Mango"
          value={form.crop}
          onChangeText={(value) => updateField("crop", value)}
        />

        <Input
          label="Variety"
          placeholder="Example: Kensington Pride"
          value={form.variety}
          onChangeText={(value) => updateField("variety", value)}
        />

        <Input
          label="Available quantity in kilograms *"
          placeholder="Example: 500"
          keyboardType="numeric"
          value={form.quantity}
          onChangeText={(value) => updateField("quantity", value)}
        />

        <Input
          label="Expected harvest date"
          placeholder="Example: 20 September 2026"
          value={form.harvestDate}
          onChangeText={(value) => updateField("harvestDate", value)}
        />

        <Input
          label="Minimum price per kilogram"
          placeholder="Example: 3.50"
          keyboardType="decimal-pad"
          value={form.minimumPrice}
          onChangeText={(value) => updateField("minimumPrice", value)}
        />

        <Text style={styles.sectionTitle}>Quality information</Text>

        <View style={styles.qualityNotice}>
          <Text style={styles.qualityNoticeTitle}>Why we collect this</Text>
          <Text style={styles.qualityNoticeText}>
            FarmPool only combines produce with compatible varieties, taste
            measurements and quality.
          </Text>
        </View>

        <Input
          label="Sugar level/Brix"
          placeholder="Example: 14"
          keyboardType="decimal-pad"
          value={form.brix}
          onChangeText={(value) => updateField("brix", value)}
        />

        <Input
          label="Estimated visible defects (%)"
          placeholder="Example: 3"
          keyboardType="decimal-pad"
          value={form.defects}
          onChangeText={(value) => updateField("defects", value)}
        />

        <TouchableOpacity
          style={styles.submitButton}
          activeOpacity={0.8}
          onPress={submitHarvest}
        >
          <Text style={styles.submitButtonText}>Register harvest</Text>
        </TouchableOpacity>

        <Text style={styles.required}>* Required information</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type InputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
};

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
}: InputProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#929C94"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },
  container: {
    paddingTop: 65,
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  back: {
    color: "#1F6B3A",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 28,
  },
  eyebrow: {
    color: "#56845F",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  heading: {
    color: "#17231A",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 8,
  },
  description: {
    color: "#59645B",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#17231A",
    fontSize: 19,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 17,
  },
  label: {
    color: "#354139",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D7E0D5",
    borderWidth: 1,
    borderRadius: 14,
    color: "#17231A",
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  qualityNotice: {
    backgroundColor: "#DFECDD",
    borderRadius: 16,
    padding: 17,
    marginBottom: 18,
  },
  qualityNoticeTitle: {
    color: "#245A35",
    fontSize: 15,
    fontWeight: "700",
  },
  qualityNoticeText: {
    color: "#55705C",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: "#1F6B3A",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 17,
    marginTop: 22,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  required: {
    color: "#788179",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
  },
});