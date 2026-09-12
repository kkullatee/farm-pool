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
import { FormField } from '@/components/FormField';
import { PhotoCapture } from '@/components/PhotoCapture';
import { ScreenHeader } from '@/components/ScreenHeader';
import { VoiceNote } from '@/components/VoiceNote';
import { useFarmPool } from '@/context/FarmPoolContext';
import { coordinatesFor } from '@/data/demo';
import { analyseProduce, transcribeVoice } from '@/lib/ai';
import { colors } from '@/lib/theme';
import { Firmness } from '@/lib/types';

type FormState = {
  farmerName: string;
  crop: string;
  variety: string;
  quantity: string;
  location: string;
  harvestDate: string;
  minimumPrice: string;
  brix: string;
  defects: string;
  firmness: Firmness;
  notes: string;
};

const emptyForm: FormState = {
  farmerName: '',
  crop: '',
  variety: '',
  quantity: '',
  location: '',
  harvestDate: '',
  minimumPrice: '',
  brix: '',
  defects: '',
  firmness: 'Medium',
  notes: '',
};

export default function FarmerScreen() {
  const router = useRouter();
  const { registerHarvest } = useFarmPool();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function fillDemo() {
    setForm({
      farmerName: 'Riverbend Family Farm',
      crop: 'Mango',
      variety: 'Kensington Pride',
      quantity: '1800',
      location: 'Mareeba, QLD',
      harvestDate: '2026-09-21',
      minimumPrice: '3.05',
      brix: '14.7',
      defects: '2.5',
      firmness: 'Medium',
      notes: 'Uniform medium fruit, hand-picked this morning and pre-cooled on farm.',
    });
  }

  async function submitHarvest() {
    const quantityKg = Number(form.quantity);
    const minimumPricePerKg = Number(form.minimumPrice);
    const brix = Number(form.brix);
    const defectsPct = Number(form.defects);

    if (
      !form.farmerName.trim() ||
      !form.crop.trim() ||
      !form.variety.trim() ||
      !form.location.trim() ||
      !form.harvestDate.trim() ||
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0 ||
      !Number.isFinite(minimumPricePerKg) ||
      minimumPricePerKg <= 0 ||
      !Number.isFinite(brix) ||
      brix <= 0 ||
      !Number.isFinite(defectsPct) ||
      defectsPct < 0 ||
      defectsPct > 100
    ) {
      Alert.alert('Check the form', 'Complete every required field with a valid number.');
      return;
    }

    setSubmitting(true);
    try {
      const voiceTranscript = await transcribeVoice(voiceUri);
      const notes = [form.notes.trim(), voiceTranscript].filter(Boolean).join(' ');
      const assessment = await analyseProduce({
        crop: form.crop.trim(),
        variety: form.variety.trim(),
        brix,
        defectsPct,
        firmness: form.firmness,
        notes,
        imageUri,
      });

      registerHarvest({
        farmerName: form.farmerName.trim(),
        crop: form.crop.trim(),
        variety: form.variety.trim(),
        quantityKg,
        location: form.location.trim(),
        coordinates: coordinatesFor(form.location),
        harvestDate: form.harvestDate.trim(),
        minimumPricePerKg,
        brix,
        defectsPct,
        firmness: form.firmness,
        reliability: 88,
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
            description="Give buyers a comparable quality profile—not just a photo and a promise."
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
            value={form.farmerName}
            onChangeText={(value) => updateField('farmerName', value)}
          />
          <FormField
            label="Farm location *"
            hint="town, state"
            placeholder="Mareeba, QLD"
            value={form.location}
            onChangeText={(value) => updateField('location', value)}
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
            label="Available quantity *"
            hint="kilograms"
            placeholder="1800"
            keyboardType="numeric"
            value={form.quantity}
            onChangeText={(value) => updateField('quantity', value)}
          />
          <FormField
            label="Expected harvest date *"
            hint="YYYY-MM-DD"
            placeholder="2026-09-21"
            autoCapitalize="none"
            value={form.harvestDate}
            onChangeText={(value) => updateField('harvestDate', value)}
          />
          <FormField
            label="Minimum farm-gate price *"
            hint="AUD per kg"
            placeholder="3.05"
            keyboardType="decimal-pad"
            value={form.minimumPrice}
            onChangeText={(value) => updateField('minimumPrice', value)}
          />

          <Text style={styles.sectionTitle}>Taste and quality profile</Text>
          <View style={styles.qualityNotice}>
            <Text style={styles.qualityNoticeTitle}>Why this matters</Text>
            <Text style={styles.qualityNoticeText}>
              Fruit from different places can taste different. FarmPool uses measured Brix,
              firmness, variety and defects to avoid mixing incompatible lots.
            </Text>
          </View>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <FormField
                label="Sugar level *"
                hint="°Brix"
                placeholder="14.7"
                keyboardType="decimal-pad"
                value={form.brix}
                onChangeText={(value) => updateField('brix', value)}
              />
            </View>
            <View style={styles.column}>
              <FormField
                label="Visible defects *"
                hint="percent"
                placeholder="2.5"
                keyboardType="decimal-pad"
                value={form.defects}
                onChangeText={(value) => updateField('defects', value)}
              />
            </View>
          </View>
          <ChoicePills
            label="Firmness *"
            options={['Soft', 'Medium', 'Firm'] as const}
            value={form.firmness}
            onChange={(value) => updateField('firmness', value)}
          />
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
            The AI screen supports—not replaces—physical sampling, food-safety checks and a final
            buyer inspection.
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
  qualityNotice: { backgroundColor: colors.primarySoft, borderRadius: 17, padding: 16, marginBottom: 17 },
  qualityNoticeTitle: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  qualityNoticeText: { color: '#47684F', fontSize: 13, lineHeight: 19, marginTop: 5 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 17, marginTop: 14, paddingHorizontal: 17 },
  submitText: { color: colors.surface, fontSize: 16, fontWeight: '900' },
  submitArrow: { position: 'absolute', right: 18, color: colors.lime, fontSize: 29 },
  disabled: { opacity: 0.62 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 12, marginTop: 13 },
});
