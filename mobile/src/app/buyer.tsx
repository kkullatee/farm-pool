import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoicePills } from '@/components/ChoicePills';
import { FormField } from '@/components/FormField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFarmPool } from '@/context/FarmPoolContext';
import { coordinatesFor, demoOrder } from '@/data/demo';
import { colors } from '@/lib/theme';
import { Firmness } from '@/lib/types';

type FormState = {
  businessName: string;
  crop: string;
  variety: string;
  quantity: string;
  deliveryLocation: string;
  deliveryDate: string;
  maximumDeliveredPrice: string;
  minimumBrix: string;
  maximumDefects: string;
  firmness: Firmness;
};

const emptyForm: FormState = {
  businessName: '',
  crop: '',
  variety: '',
  quantity: '',
  deliveryLocation: '',
  deliveryDate: '',
  maximumDeliveredPrice: '',
  minimumBrix: '',
  maximumDefects: '',
  firmness: 'Medium',
};

export default function BuyerScreen() {
  const router = useRouter();
  const { createOrderAndMatch } = useFarmPool();
  const [form, setForm] = useState<FormState>(emptyForm);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function fillDemo() {
    setForm({
      businessName: demoOrder.businessName,
      crop: demoOrder.crop,
      variety: demoOrder.variety,
      quantity: String(demoOrder.quantityKg),
      deliveryLocation: demoOrder.deliveryLocation,
      deliveryDate: demoOrder.deliveryDate,
      maximumDeliveredPrice: String(demoOrder.maximumDeliveredPricePerKg),
      minimumBrix: String(demoOrder.minimumBrix),
      maximumDefects: String(demoOrder.maximumDefectsPct),
      firmness: demoOrder.firmness,
    });
  }

  function findSupply() {
    const quantityKg = Number(form.quantity);
    const maximumDeliveredPricePerKg = Number(form.maximumDeliveredPrice);
    const minimumBrix = Number(form.minimumBrix);
    const maximumDefectsPct = Number(form.maximumDefects);

    if (
      !form.businessName.trim() ||
      !form.crop.trim() ||
      !form.variety.trim() ||
      !form.deliveryLocation.trim() ||
      !form.deliveryDate.trim() ||
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0 ||
      !Number.isFinite(maximumDeliveredPricePerKg) ||
      maximumDeliveredPricePerKg <= 0 ||
      !Number.isFinite(minimumBrix) ||
      minimumBrix <= 0 ||
      !Number.isFinite(maximumDefectsPct) ||
      maximumDefectsPct < 0 ||
      maximumDefectsPct > 100
    ) {
      Alert.alert('Check the order', 'Complete every required field with a valid value.');
      return;
    }

    createOrderAndMatch({
      id: `order-${Date.now()}`,
      businessName: form.businessName.trim(),
      crop: form.crop.trim(),
      variety: form.variety.trim(),
      quantityKg,
      deliveryLocation: form.deliveryLocation.trim(),
      coordinates: coordinatesFor(form.deliveryLocation),
      deliveryDate: form.deliveryDate.trim(),
      maximumDeliveredPricePerKg,
      minimumBrix,
      maximumDefectsPct,
      firmness: form.firmness,
    });
    router.push('/matches');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ScreenHeader
            eyebrow="BUYER ORDER"
            title="Build a pooled order"
            description="Describe the exact taste, quality, quantity and delivered-price target."
          />

          <TouchableOpacity style={styles.demoFill} onPress={fillDemo}>
            <Text style={styles.demoFillIcon}>✦</Text>
            <View style={styles.demoFillCopy}>
              <Text style={styles.demoFillTitle}>Load the judge demo order</Text>
              <Text style={styles.demoFillText}>10,000 kg to FreshMart Cairns</Text>
            </View>
            <Text style={styles.demoFillArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Order details</Text>
          <FormField
            label="Business name *"
            placeholder="FreshMart North Queensland"
            value={form.businessName}
            onChangeText={(value) => updateField('businessName', value)}
          />
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <FormField
                label="Crop *"
                placeholder="Mango"
                value={form.crop}
                onChangeText={(value) => updateField('crop', value)}
              />
            </View>
            <View style={styles.column}>
              <FormField
                label="Variety *"
                placeholder="Kensington Pride"
                value={form.variety}
                onChangeText={(value) => updateField('variety', value)}
              />
            </View>
          </View>
          <FormField
            label="Quantity required *"
            hint="kilograms"
            placeholder="10000"
            keyboardType="numeric"
            value={form.quantity}
            onChangeText={(value) => updateField('quantity', value)}
          />
          <FormField
            label="Delivery location *"
            hint="distribution centre"
            placeholder="Cairns Distribution Centre, QLD"
            value={form.deliveryLocation}
            onChangeText={(value) => updateField('deliveryLocation', value)}
          />
          <FormField
            label="Required delivery date *"
            hint="YYYY-MM-DD"
            placeholder="2026-09-24"
            autoCapitalize="none"
            value={form.deliveryDate}
            onChangeText={(value) => updateField('deliveryDate', value)}
          />
          <FormField
            label="Maximum delivered price *"
            hint="AUD per kg"
            placeholder="5.20"
            keyboardType="decimal-pad"
            value={form.maximumDeliveredPrice}
            onChangeText={(value) => updateField('maximumDeliveredPrice', value)}
          />

          <Text style={styles.sectionTitle}>Taste and acceptance rules</Text>
          <View style={styles.qualityNotice}>
            <Text style={styles.qualityNoticeTitle}>A measurable taste contract</Text>
            <Text style={styles.qualityNoticeText}>
              The matching engine will reject the wrong variety, sweetness band, firmness or defect
              level—even when the fruit looks similar in a photo.
            </Text>
          </View>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <FormField
                label="Minimum sweetness *"
                hint="°Brix"
                placeholder="14.0"
                keyboardType="decimal-pad"
                value={form.minimumBrix}
                onChangeText={(value) => updateField('minimumBrix', value)}
              />
            </View>
            <View style={styles.column}>
              <FormField
                label="Maximum defects *"
                hint="percent"
                placeholder="5"
                keyboardType="decimal-pad"
                value={form.maximumDefects}
                onChangeText={(value) => updateField('maximumDefects', value)}
              />
            </View>
          </View>
          <ChoicePills
            label="Required firmness *"
            options={['Soft', 'Medium', 'Firm'] as const}
            value={form.firmness}
            onChange={(value) => updateField('firmness', value)}
          />

          <TouchableOpacity style={styles.submitButton} activeOpacity={0.85} onPress={findSupply}>
            <Text style={styles.submitText}>Find compatible farms</Text>
            <Text style={styles.submitArrow}>›</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>
            FarmPool will show the full farm selection, rejected lots and every transport charge
            before you approve anything.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 55 },
  demoFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 19, padding: 15, marginTop: 24 },
  demoFillIcon: { color: colors.lime, fontSize: 21, fontWeight: '900', marginRight: 12 },
  demoFillCopy: { flex: 1 },
  demoFillTitle: { color: colors.surface, fontSize: 14, fontWeight: '900' },
  demoFillText: { color: '#BFC9C0', fontSize: 11, marginTop: 3 },
  demoFillArrow: { color: colors.lime, fontSize: 28 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 29, marginBottom: 14 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  qualityNotice: { backgroundColor: colors.primarySoft, borderRadius: 17, padding: 16, marginBottom: 17 },
  qualityNoticeTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  qualityNoticeText: { color: '#506956', fontSize: 12, lineHeight: 18, marginTop: 5 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 17, marginTop: 14, paddingHorizontal: 18 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  submitArrow: { position: 'absolute', right: 18, color: colors.lime, fontSize: 29 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13, paddingHorizontal: 15 },
});
