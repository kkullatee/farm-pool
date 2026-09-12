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

export default function BuyerScreen() {
  const router = useRouter();

  const [form, setForm] = useState({
    businessName: "",
    crop: "",
    variety: "",
    quantity: "",
    deliveryLocation: "",
    deliveryDate: "",
    maximumPrice: "",
    minimumBrix: "",
    maximumDefects: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submitOrder() {
    if (!form.crop || !form.quantity || !form.deliveryLocation) {
      Alert.alert(
        "Missing information",
        "Please enter the crop, quantity and delivery location."
      );
      return;
    }

    Alert.alert(
      "Order created",
      `FarmPool will search for ${form.quantity} kg of ${form.crop}.`,
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

        <Text style={styles.eyebrow}>BUYER ORDER</Text>
        <Text style={styles.heading}>Find your produce</Text>

        <Text style={styles.description}>
          Describe what you need. FarmPool will find farms that meet your
          quality, price and delivery requirements.
        </Text>

        <Text style={styles.sectionTitle}>Business details</Text>

        <Input
          label="Business name"
          placeholder="Example: FreshMart"
          value={form.businessName}
          onChangeText={(value) => updateField("businessName", value)}
        />

        <Input
          label="Delivery location *"
          placeholder="Example: Melbourne, Victoria"
          value={form.deliveryLocation}
          onChangeText={(value) => updateField("deliveryLocation", value)}
        />

        <Text style={styles.sectionTitle}>Produce required</Text>

        <Input
          label="Crop type *"
          placeholder="Example: Mango"
          value={form.crop}
          onChangeText={(value) => updateField("crop", value)}
        />

        <Input
          label="Preferred variety"
          placeholder="Example: Kensington Pride"
          value={form.variety}
          onChangeText={(value) => updateField("variety", value)}
        />

        <Input
          label="Quantity required in kilograms *"
          placeholder="Example: 10000"
          keyboardType="numeric"
          value={form.quantity}
          onChangeText={(value) => updateField("quantity", value)}
        />

        <Input
          label="Required delivery date"
          placeholder="Example: 30 September 2026"
          value={form.deliveryDate}
          onChangeText={(value) => updateField("deliveryDate", value)}
        />

        <Input
          label="Maximum delivered price per kilogram"
          placeholder="Example: 5.50"
          keyboardType="decimal-pad"
          value={form.maximumPrice}
          onChangeText={(value) => updateField("maximumPrice", value)}
        />

        <Text style={styles.sectionTitle}>Quality requirements</Text>

        <Input
          label="Minimum sugar level/Brix"
          placeholder="Example: 14"
          keyboardType="decimal-pad"
          value={form.minimumBrix}
          onChangeText={(value) => updateField("minimumBrix", value)}
        />

        <Input
          label="Maximum visible defects (%)"
          placeholder="Example: 5"
          keyboardType="decimal-pad"
          value={form.maximumDefects}
          onChangeText={(value) => updateField("maximumDefects", value)}
        />

        <TouchableOpacity
          style={styles.submitButton}
          activeOpacity={0.8}
          onPress={submitOrder}
        >
          <Text style={styles.submitButtonText}>Create buyer order</Text>
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
  submitButton: {
    backgroundColor: "#1F6B3A",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 17,
    marginTop: 24,
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