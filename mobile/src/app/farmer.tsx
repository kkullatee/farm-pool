import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
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
import { PhotoCapture } from '@/components/PhotoCapture';
import { QuantityField } from '@/components/QuantityField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { VoiceNote } from '@/components/VoiceNote';
import { useFarmPool } from '@/context/FarmPoolContext';
import { CROPS, OTHER_VARIETY, QuantityUnit, cropInfo, isEstimatedUnit, toKg } from '@/data/crops';
import { coordinatesFor } from '@/data/demo';
import { analyseProduce, transcribeVoice } from '@/lib/ai';
import { colors } from '@/lib/theme';
import { ConditionGrade } from '@/lib/types';
import { FieldErrors, validateHarvest } from '@/lib/validation';

type FormState = {
  farmerName: string;
  crop: string;
  variety: string;
  otherVariety: string;
  quantity: string;
  quantityUnit: QuantityUnit;
  location: string;
  harvestDate: string;
  minimumPrice: string;
  condition: ConditionGrade;
  notes: string;
};

const emptyForm: FormState = {
  farmerName: '',
  crop: '',
  variety: '',
  otherVariety: '',
  quantity: '',
  quantityUnit: 'kg',
  location: '',
  harvestDate: '',
  minimumPrice: '',
  condition: 'Standard',
  notes: '',
};

export default function FarmerScreen() {
  const router = useRouter();
  const { registerHarvest } = useFarmPool();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCrop = cropInfo(form.crop);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function changeCrop(crop: string) {
    // Variety options depend on the crop, so a crop change resets the variety.
    setForm((current) => ({ ...current, crop, variety: '', otherVariety: '' }));
    setErrors((current) => ({ ...current, crop: '', variety: '', otherVariety: '' }));
  }

  function fillDemo() {
    setErrors({});
    setForm({
      farmerName: 'Riverbend Family Farm',
      crop: 'Mango',
      variety: 'Kensington Pride',
      otherVariety: '',
      quantity: '1800',
      quantityUnit: 'kg',
      location: 'Mareeba, QLD',
      harvestDate: '2026-09-21',
      minimumPrice: '3.05',
      condition: 'Premium',
      notes: 'Uniform medium fruit, hand-picked this morning and pre-cooled on farm.',
    });
  }

  async function submitHarvest() {
    const enteredQuantity = Number(form.quantity);
    const quantityKg = Number.isFinite(enteredQuantity)
      ? toKg(enteredQuantity, form.quantityUnit, selectedCrop)
      : 0;
    const quantityEstimated = isEstimatedUnit(form.quantityUnit);

    const { errors: nextErrors, warnings } = validateHarvest({
      farmerName: form.farmerName,
      crop: form.crop,
      variety: form.variety,
      otherVariety: form.otherVariety,
      quantityRaw: form.quantity,
      quantityKg,
      quantityEstimated,
      location: form.location,
      harvestDate: form.harvestDate,
      priceRaw: form.minimumPrice,
      cropInfo: selectedCrop,
    });

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      Alert.alert('Check the form', 'Fix the highlighted fields to continue.');
      return;
    }
    setErrors({});

    if (warnings.length > 0) {
      // Unusual values warn but never auto-reject — the farmer decides.
      Alert.alert(
        'Please double-check',
        `${warnings.map((warning) => `• ${warning}`).join('\n\n')}\n\nYou can add context in the notes field.`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Submit anyway', onPress: () => void register(quantityKg, quantityEstimated) },
        ],
      );
      return;
    }
    await register(quantityKg, quantityEstimated);
  }

  async function register(quantityKg: number, quantityEstimated: boolean) {
    const isOtherVariety = form.variety === OTHER_VARIETY;
    const variety = isOtherVariety ? form.otherVariety.trim() : form.variety;

    setSubmitting(true);
    try {
      const voiceTranscript = await transcribeVoice(voiceUri);
      const notes = [form.notes.trim(), voiceTranscript].filter(Boolean).join(' ');
      const assessment = await analyseProduce({
        crop: form.crop.trim(),
        variety,
        condition: form.condition,
        notes,
        imageUri,
      });

      registerHarvest({
        farmerName: form.farmerName.trim(),
        crop: form.crop.trim(),
        variety,
        quantityKg: Math.round(quantityKg),
        location: form.location.trim(),
        coordinates: coordinatesFor(form.location),
        harvestDate: form.harvestDate.trim(),
        minimumPricePerKg: Number(form.minimumPrice),
        condition: form.condition,
        reliability: 88,
        needsReview: isOtherVariety,
        quantityEstimated,
        imageUri,
        voiceUri,
        notes,
        assessment,
      });
      router.push('/farmer-result');
    } finally {
      setSubmitting(false);
    }
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
            eyebrow="FARMER ONBOARDING"
            title="List a harvest"
            description="Give buyers a clear quality profile, not just a photo and a promise."
          />

          <TouchableOpacity style={styles.demoFill} onPress={fillDemo}>
            <Text style={styles.demoFillIcon}>✦</Text>
            <View style={styles.demoFillCopy}>
              <Text style={styles.demoFillTitle}>Fill with demo farm data</Text>
              <Text style={styles.demoFillText}>Fastest way to test the full flow</Text>
            </View>
            <Text style={styles.demoFillArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Produce evidence</Text>
          <PhotoCapture value={imageUri} onChange={setImageUri} />
          <View style={styles.voiceWrap}>
            <VoiceNote value={voiceUri} onChange={setVoiceUri} />
          </View>

          <Text style={styles.sectionTitle}>Farm and harvest</Text>
          <FormField
            label="Farmer or farm name *"
            placeholder="Riverbend Family Farm"
            error={errors.farmerName}
            value={form.farmerName}
            onChangeText={(value) => updateField('farmerName', value)}
          />
          <FormField
            label="Farm location *"
            hint="town, state"
            placeholder="Mareeba, QLD"
            error={errors.location}
            value={form.location}
            onChangeText={(value) => updateField('location', value)}
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
              { value: OTHER_VARIETY, caption: 'Not listed, needs review' },
            ]}
            onChange={(value) => updateField('variety', value)}
          />
          {form.variety === OTHER_VARIETY ? (
            <>
              <FormField
                label="Type the variety *"
                placeholder="e.g. Nam Doc Mai"
                error={errors.otherVariety}
                value={form.otherVariety}
                onChangeText={(value) => updateField('otherVariety', value)}
              />
              <View style={styles.reviewNotice}>
                <Text style={styles.reviewNoticeText}>
                  New varieties are checked by our team before buyers can rely on them.
                </Text>
              </View>
            </>
          ) : null}
          <QuantityField
            label="Available quantity *"
            error={errors.quantity}
            value={form.quantity}
            unit={form.quantityUnit}
            crop={selectedCrop}
            onChangeValue={(value) => updateField('quantity', value)}
            onChangeUnit={(unit) => updateField('quantityUnit', unit)}
          />
          <DateField
            label="Expected harvest date *"
            hint="tap to pick"
            placeholder="Pick the harvest date"
            error={errors.harvestDate}
            value={form.harvestDate}
            onChange={(value) => updateField('harvestDate', value)}
          />
          <FormField
            label="Minimum farm-gate price *"
            hint="AUD per kg"
            placeholder="3.05"
            keyboardType="decimal-pad"
            error={errors.price}
            value={form.minimumPrice}
            onChangeText={(value) => updateField('minimumPrice', value)}
          />

          <Text style={styles.sectionTitle}>Condition</Text>
          <ChoicePills
            label="Overall condition *"
            options={['Premium', 'Standard', 'Economy'] as const}
            value={form.condition}
            onChange={(value) => updateField('condition', value)}
          />
          <Text style={styles.conditionHint}>
            Your honest call on the batch. Buyers see it as seller-provided and can chat with you
            before confirming.
          </Text>
          <FormField
            label="Notes"
            hint="optional"
            placeholder="Size, colour, storage, certifications or anything the buyer should know"
            multiline
            value={form.notes}
            onChangeText={(value) => updateField('notes', value)}
          />

          <TouchableOpacity
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.disabled]}
            activeOpacity={0.85}
            onPress={submitHarvest}>
            {submitting ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Text style={styles.submitText}>Analyse and register harvest</Text>
                <Text style={styles.submitArrow}>›</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.footnote}>
            The AI screen supports physical sampling, food safety checks and a final buyer
            inspection. It does not replace them.
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
  demoFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.ink, borderRadius: 18, padding: 14, marginTop: 24 },
  demoFillIcon: { color: colors.lime, fontSize: 21, width: 31 },
  demoFillCopy: { flex: 1 },
  demoFillTitle: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  demoFillText: { color: '#BFC9C0', fontSize: 11, marginTop: 3 },
  demoFillArrow: { color: colors.lime, fontSize: 27 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 29, marginBottom: 13 },
  voiceWrap: { marginTop: 11 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  reviewNotice: { backgroundColor: colors.amberSoft, borderRadius: 13, padding: 12, marginTop: -6, marginBottom: 16 },
  reviewNoticeText: { color: '#715112', fontSize: 11, lineHeight: 16 },
  conditionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -6, marginBottom: 16 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 17, marginTop: 14, paddingHorizontal: 17 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  submitArrow: { position: 'absolute', right: 18, color: colors.lime, fontSize: 29 },
  disabled: { opacity: 0.62 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 12, marginTop: 13 },
});
