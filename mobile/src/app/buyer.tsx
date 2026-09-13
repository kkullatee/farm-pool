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
import { DateField } from '@/components/DateField';
import { FormField } from '@/components/FormField';
import { QuantityField } from '@/components/QuantityField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { useFarmPool } from '@/context/FarmPoolContext';
import { CROPS, OTHER_VARIETY, QuantityUnit, cropInfo, isEstimatedUnit, toKg } from '@/data/crops';
import { coordinatesFor, demoOrder } from '@/data/demo';
import { newId } from '@/lib/ids';
import { colors } from '@/lib/theme';
import { MinimumCondition } from '@/lib/types';
import { FieldErrors, validateOrder } from '@/lib/validation';

type FormState = {
  businessName: string;
  crop: string;
  variety: string;
  otherVariety: string;
  quantity: string;
  quantityUnit: QuantityUnit;
  deliveryLocation: string;
  deliveryDate: string;
  maximumDeliveredPrice: string;
  minimumCondition: MinimumCondition;
};

const emptyForm: FormState = {
  businessName: '',
  crop: '',
  variety: '',
  otherVariety: '',
  quantity: '',
  quantityUnit: 'kg',
  deliveryLocation: '',
  deliveryDate: '',
  maximumDeliveredPrice: '',
  minimumCondition: 'Any',
};

export default function BuyerScreen() {
  const router = useRouter();
  const { createOrderAndMatch } = useFarmPool();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  const selectedCrop = cropInfo(form.crop);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function changeCrop(crop: string) {
    setForm((current) => ({ ...current, crop, variety: '', otherVariety: '' }));
    setErrors((current) => ({ ...current, crop: '', variety: '', otherVariety: '' }));
  }

  function fillDemo() {
    setErrors({});
    setForm({
      businessName: demoOrder.businessName,
      crop: demoOrder.crop,
      variety: demoOrder.variety,
      otherVariety: '',
      quantity: String(demoOrder.quantityKg),
      quantityUnit: 'kg',
      deliveryLocation: demoOrder.deliveryLocation,
      deliveryDate: demoOrder.deliveryDate,
      maximumDeliveredPrice: String(demoOrder.maximumDeliveredPricePerKg),
      minimumCondition: demoOrder.minimumCondition,
    });
  }

  function findSupply() {
    const enteredQuantity = Number(form.quantity);
    const quantityKg = Number.isFinite(enteredQuantity)
      ? toKg(enteredQuantity, form.quantityUnit, selectedCrop)
      : 0;

    const { errors: nextErrors, warnings } = validateOrder({
      businessName: form.businessName,
      crop: form.crop,
      variety: form.variety,
      otherVariety: form.otherVariety,
      quantityRaw: form.quantity,
      quantityKg,
      quantityEstimated: isEstimatedUnit(form.quantityUnit),
      deliveryLocation: form.deliveryLocation,
      deliveryDate: form.deliveryDate,
      maxPriceRaw: form.maximumDeliveredPrice,
      cropInfo: selectedCrop,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      Alert.alert('Check the order', 'Fix the highlighted fields to continue.');
      return;
    }
    setErrors({});

    const orderId = newId('order');
    if (warnings.length > 0) {
      Alert.alert(
        'Please double-check',
        warnings.map((warning) => `• ${warning}`).join('\n\n'),
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Find supply anyway', onPress: () => match(orderId, quantityKg) },
        ],
      );
      return;
    }
    match(orderId, quantityKg);
  }

  function match(orderId: string, quantityKg: number) {
    createOrderAndMatch({
      id: orderId,
      businessName: form.businessName.trim(),
      crop: form.crop.trim(),
      variety: (form.variety === OTHER_VARIETY ? form.otherVariety : form.variety).trim(),
      quantityKg: Math.round(quantityKg),
      deliveryLocation: form.deliveryLocation.trim(),
      coordinates: coordinatesFor(form.deliveryLocation),
      deliveryDate: form.deliveryDate.trim(),
      maximumDeliveredPricePerKg: Number(form.maximumDeliveredPrice),
      minimumCondition: form.minimumCondition,
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
            error={errors.businessName}
            value={form.businessName}
            onChangeText={(value) => updateField('businessName', value)}
          />
          <SelectField
            label="Crop *"
            hint="search the catalog"
            placeholder="Search and pick the crop"
            searchable
            error={errors.crop}
            value={form.crop}
            options={CROPS.map((crop) => ({ value: crop.name, caption: crop.category }))}
            onChange={changeCrop}
          />
          <SelectField
            label="Variety *"
            hint={selectedCrop ? undefined : 'pick the crop first'}
            placeholder={selectedCrop ? 'Pick the variety' : 'Pick the crop first'}
            disabled={!selectedCrop}
            error={errors.variety}
            value={form.variety}
            options={[
              ...(selectedCrop?.varieties.map((variety) => ({ value: variety })) ?? []),
              { value: OTHER_VARIETY, caption: 'Type a variety not in the list' },
            ]}
            onChange={(value) => updateField('variety', value)}
          />
          {form.variety === OTHER_VARIETY ? (
            <FormField
              label="Type the variety *"
              placeholder="e.g. Nam Doc Mai"
              error={errors.otherVariety}
              value={form.otherVariety}
              onChangeText={(value) => updateField('otherVariety', value)}
            />
          ) : null}
          <QuantityField
            label="Quantity required *"
            error={errors.quantity}
            value={form.quantity}
            unit={form.quantityUnit}
            crop={selectedCrop}
            onChangeValue={(value) => updateField('quantity', value)}
            onChangeUnit={(unit) => updateField('quantityUnit', unit)}
          />
          <FormField
            label="Delivery location *"
            hint="distribution centre"
            placeholder="Cairns Distribution Centre, QLD"
            error={errors.deliveryLocation}
            value={form.deliveryLocation}
            onChangeText={(value) => updateField('deliveryLocation', value)}
          />
          <DateField
            label="Required delivery date *"
            hint="tap to pick"
            placeholder="Pick a delivery date"
            error={errors.deliveryDate}
            value={form.deliveryDate}
            onChange={(value) => updateField('deliveryDate', value)}
          />
          <FormField
            label="Maximum delivered price *"
            hint="AUD per kg"
            placeholder="5.20"
            keyboardType="decimal-pad"
            error={errors.maxPrice}
            value={form.maximumDeliveredPrice}
            onChangeText={(value) => updateField('maximumDeliveredPrice', value)}
          />

          <Text style={styles.sectionTitle}>Quality preference</Text>
          <ChoicePills
            label="Minimum condition"
            options={['Any', 'Standard', 'Premium'] as const}
            value={form.minimumCondition}
            onChange={(value) => updateField('minimumCondition', value)}
          />
          <Text style={styles.conditionHint}>
            Condition is seller-provided. You can chat with each matched seller before you approve
            the order.
          </Text>

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
  demoFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 18 },
  demoFillIcon: { color: colors.tan, fontSize: 21, fontWeight: '800', marginRight: 12 },
  demoFillCopy: { flex: 1 },
  demoFillTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  demoFillText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  demoFillArrow: { color: colors.tan, fontSize: 28 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 29, marginBottom: 14 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  conditionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -6, marginBottom: 16 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 12, marginTop: 14, paddingHorizontal: 18 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '800' },
  submitArrow: { position: 'absolute', right: 18, color: '#F5EFE2', fontSize: 29 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 13, paddingHorizontal: 15 },
});
