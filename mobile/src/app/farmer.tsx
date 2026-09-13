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
  TextInput,
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
import {
  CROPS,
  OTHER_VARIETY,
  QuantityUnit,
  UNKNOWN_QUALITY_VALUE,
  cropInfo,
  isEstimatedUnit,
  qualityQuestionsForCrop,
  toKg,
} from '@/data/crops';
import { coordinatesFor } from '@/data/demo';
import {
  analyseProduce,
  demoVoiceListing,
  extractListingFromTranscript,
  transcribeVoice,
  voiceToListing,
} from '@/lib/ai';
import { colors } from '@/lib/theme';
import { ConditionGrade, QualityAnswer, VoiceField, VoiceListing } from '@/lib/types';
import { FieldErrors, validateHarvest } from '@/lib/validation';

const VOICE_FIELD_LABELS: Record<VoiceField, string> = {
  crop: 'crop',
  variety: 'variety',
  quantity: 'quantity',
  unit: 'unit',
  location: 'location',
  harvest_date: 'harvest date',
  price_per_kg: 'price',
  condition: 'condition',
  notes: 'notes',
};

const voiceFieldLabel = (field: string) =>
  VOICE_FIELD_LABELS[field as VoiceField] ?? field.replace('_', ' ');
const CONFIDENT_FIELD_THRESHOLD = 0.75;
const VOICE_PROGRESS = [
  'Transcribing the recording',
  "Understanding the farmer's description",
  'Checking listing plausibility',
  'Identifying missing evidence',
];
const SUBMIT_PROGRESS = [
  'Checking listing plausibility',
  'Examining the produce photo',
  'Identifying missing evidence',
];

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
  const { registerHarvest, harvests } = useFarmPool();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceResult, setVoiceResult] = useState<VoiceListing | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [voiceProgress, setVoiceProgress] = useState<string | null>(null);
  const [voiceAutofill, setVoiceAutofill] = useState<{
    applied: VoiceField[];
    skipped: VoiceField[];
  }>({ applied: [], skipped: [] });
  const [manualFields, setManualFields] = useState<Set<keyof FormState>>(new Set());
  const [qualityResponses, setQualityResponses] = useState<Record<string, string>>({});
  const [submitProgress, setSubmitProgress] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedCrop = cropInfo(form.crop);
  const qualityQuestions = qualityQuestionsForCrop(selectedCrop);
  const voiceConfidenceFields = voiceResult?.extraction
    ? (Object.keys(VOICE_FIELD_LABELS) as VoiceField[]).filter(
        (field) => voiceResult.extraction?.field_confidence[field] !== null,
      )
    : [];
  const transcriptChanged = Boolean(
    voiceResult?.transcript && transcriptDraft.trim() !== voiceResult.transcript.trim(),
  );

  function updateField<Key extends keyof FormState>(
    field: Key,
    value: FormState[Key],
    source: 'manual' | 'ai' = 'manual',
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    if (source === 'manual') {
      setManualFields((current) => new Set(current).add(field));
    }
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  }

  function changeCrop(crop: string, source: 'manual' | 'ai' = 'manual') {
    // Variety options depend on the crop, so a crop change resets the variety.
    setForm((current) => ({ ...current, crop, variety: '', otherVariety: '' }));
    setQualityResponses({});
    if (source === 'manual') {
      setManualFields((current) => {
        const next = new Set(current);
        next.add('crop');
        next.add('variety');
        next.add('otherVariety');
        return next;
      });
    }
    setErrors((current) => ({ ...current, crop: '', variety: '', otherVariety: '' }));
  }

  function startProgress(
    steps: string[],
    setter: (value: string | null) => void,
    intervalMs = 1100,
  ) {
    let index = 0;
    setter(steps[index]);
    return setInterval(() => {
      index = Math.min(index + 1, steps.length - 1);
      setter(steps[index]);
    }, intervalMs);
  }

  function formFieldForVoice(field: VoiceField): keyof FormState | null {
    switch (field) {
      case 'crop':
        return 'crop';
      case 'variety':
        return 'variety';
      case 'quantity':
        return 'quantity';
      case 'unit':
        return 'quantityUnit';
      case 'location':
        return 'location';
      case 'harvest_date':
        return 'harvestDate';
      case 'price_per_kg':
        return 'minimumPrice';
      case 'condition':
        return 'condition';
      case 'notes':
        return 'notes';
    }
  }

  function confidenceFor(result: VoiceListing, field: VoiceField) {
    return result.extraction?.field_confidence[field] ?? null;
  }

  function canAutoUse(result: VoiceListing, field: VoiceField) {
    const extraction = result.extraction;
    if (!extraction) return false;
    const confidence = confidenceFor(result, field) ?? 0;
    return (
      confidence >= CONFIDENT_FIELD_THRESHOLD &&
      !extraction.uncertain.includes(field) &&
      !extraction.ambiguous.includes(field)
    );
  }

  function applyExtraction(result: VoiceListing, options?: { allowManualOverwrite?: boolean }) {
    setVoiceResult(result);
    if (result.transcript) setTranscriptDraft(result.transcript);
    const extraction = result.extraction;
    const applied: VoiceField[] = [];
    const skipped: VoiceField[] = [];
    setVoiceAutofill({ applied, skipped });
    if (!extraction) {
      return;
    }

    const allowManualOverwrite = Boolean(options?.allowManualOverwrite);
    const next = { ...form };
    const shouldWrite = (field: VoiceField) => {
      const formField = formFieldForVoice(field);
      if (!formField) return false;
      if (manualFields.has(formField) && !allowManualOverwrite) {
        skipped.push(field);
        return false;
      }
      return true;
    };
    const applyField = (field: VoiceField, write: () => boolean) => {
      if (!canAutoUse(result, field)) return;
      if (!shouldWrite(field)) return;
      if (write()) applied.push(field);
    };

    setErrors({});
    applyField('crop', () => {
      if (!extraction.crop) return false;
      const info = cropInfo(extraction.crop);
      if (!info) return false;
      const cropChanged = next.crop !== info.name;
      next.crop = info.name;
      if (cropChanged && !manualFields.has('variety') && !manualFields.has('otherVariety')) {
        next.variety = '';
        next.otherVariety = '';
      }
      setQualityResponses({});
      return true;
    });
    applyField('quantity', () => {
      if (!extraction.quantity) return false;
      next.quantity = String(extraction.quantity);
      return true;
    });
    applyField('unit', () => {
      if (!extraction.unit) return false;
      next.quantityUnit = extraction.unit;
      return true;
    });
    applyField('location', () => {
      if (!extraction.location) return false;
      next.location = extraction.location;
      return true;
    });
    applyField('harvest_date', () => {
      if (!extraction.harvest_date) return false;
      next.harvestDate = extraction.harvest_date;
      return true;
    });
    applyField('price_per_kg', () => {
      if (!extraction.price_per_kg) return false;
      next.minimumPrice = String(extraction.price_per_kg);
      return true;
    });
    applyField('condition', () => {
      if (!extraction.condition) return false;
      next.condition = extraction.condition;
      return true;
    });
    applyField('notes', () => {
      if (!extraction.notes) return false;
      next.notes = extraction.notes;
      return true;
    });
    applyField('variety', () => {
      if (!extraction.variety) return false;
      const info = cropInfo(next.crop);
      if (!info) return false;
      const wanted = extraction.variety.trim().toLowerCase();
      const match = info.varieties.find((option) => option.toLowerCase() === wanted);
      if (match) {
        next.variety = match;
        next.otherVariety = '';
      } else {
        next.variety = OTHER_VARIETY;
        next.otherVariety = extraction.variety!.trim();
      }
      return true;
    });

    setForm(next);
    setVoiceAutofill({ applied, skipped });
  }

  async function fillFromVoice() {
    if (!voiceUri) return;
    setVoiceBusy(true);
    const timer = startProgress(VOICE_PROGRESS, setVoiceProgress);
    try {
      applyExtraction(await voiceToListing(voiceUri));
    } finally {
      clearInterval(timer);
      setVoiceProgress(null);
      setVoiceBusy(false);
    }
  }

  async function rereadTranscript() {
    setVoiceBusy(true);
    const timer = startProgress(
      ['Understanding the corrected transcript', 'Checking listing plausibility', 'Identifying missing evidence'],
      setVoiceProgress,
    );
    try {
      applyExtraction(await extractListingFromTranscript(transcriptDraft));
    } finally {
      clearInterval(timer);
      setVoiceProgress(null);
      setVoiceBusy(false);
    }
  }

  function confirmApplySkippedVoiceFields() {
    if (!voiceResult) return;
    Alert.alert(
      'Overwrite edited fields?',
      'FarmPool will replace the fields you already changed with the AI suggestions from the transcript.',
      [
        { text: 'Keep my edits', style: 'cancel' },
        {
          text: 'Apply suggestions',
          onPress: () => applyExtraction(voiceResult, { allowManualOverwrite: true }),
        },
      ],
    );
  }

  function updateQualityAnswer(id: string, value: string) {
    setQualityResponses((current) => ({ ...current, [id]: value }));
  }

  function qualityAnswersFromForm(): QualityAnswer[] {
    return qualityQuestions.reduce<QualityAnswer[]>((answers, question) => {
        const raw = qualityResponses[question.id]?.trim();
        if (!raw) return answers;
        answers.push({
          id: question.id,
          label: question.label,
          value: raw,
          ...(question.unit ? { unit: question.unit } : {}),
          selfReported: true as const,
        });
        return answers;
      }, []);
  }

  function fillDemo() {
    setErrors({});
    setManualFields(new Set());
    setQualityResponses({});
    setVoiceResult(null);
    setTranscriptDraft('');
    setVoiceAutofill({ applied: [], skipped: [] });
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
      existingListings: harvests,
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
    const timer = startProgress(SUBMIT_PROGRESS, setSubmitProgress);
    try {
      const voiceTranscript = voiceResult?.transcript ?? (await transcribeVoice(voiceUri));
      const qualityAnswers = qualityAnswersFromForm();
      const qualitySummary =
        qualityAnswers.length > 0
          ? `Self-reported quality details: ${qualityAnswers
              .map((answer) => `${answer.label}: ${answer.value}${answer.unit ? ` ${answer.unit}` : ''}`)
              .join('; ')}.`
          : '';
      const notes = [form.notes.trim(), qualitySummary, voiceTranscript].filter(Boolean).join(' ');
      const assessment = await analyseProduce({
        crop: form.crop.trim(),
        variety,
        condition: form.condition,
        notes,
        imageUri,
      });
      if (
        imageUri &&
        (assessment.photoStatus === 'Retake required' ||
          (assessment.visualAssessment?.requiresAnotherPhoto &&
            assessment.visualAssessment.verificationStatus === 'unverified'))
      ) {
        Alert.alert(
          'Retake the produce photo',
          assessment.visualAssessment?.retakeReason ??
            (assessment.photoChecks ?? []).join('. ') ??
            'FarmPool could not use this photo for the listing.',
        );
        return;
      }

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
        verification: 'Self-reported',
        reliability: 88,
        needsReview: isOtherVariety,
        quantityEstimated,
        imageUri,
        photoReference: imageUri
          ? {
              uri: imageUri,
              storage: 'local-device',
              note:
                'Prototype storage: this photo URI is local to this device. TODO: replace with durable cross-device object storage before production.',
            }
          : null,
        voiceUri,
        notes,
        qualityAnswers,
        assessment,
      });
      router.push('/farmer-result');
    } finally {
      clearInterval(timer);
      setSubmitProgress(null);
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
            title="Talk to FarmPool"
            description="Describe the harvest in your own words, then review the fields before anything is saved."
          />

          <TouchableOpacity style={styles.demoFill} onPress={fillDemo}>
            <View style={styles.demoFillCopy}>
              <Text style={styles.demoFillTitle}>Fill with demo farm data</Text>
              <Text style={styles.demoFillText}>Fastest way to test the full flow</Text>
            </View>
            <Text style={styles.demoFillArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Produce evidence</Text>
          <PhotoCapture value={imageUri} onChange={setImageUri} />
          <View style={styles.voiceWrap}>
            <VoiceNote
              value={voiceUri}
              onChange={(uri) => {
                setVoiceUri(uri);
                if (!uri) {
                  setVoiceResult(null);
                  setTranscriptDraft('');
                  setVoiceAutofill({ applied: [], skipped: [] });
                }
              }}
            />
          </View>

          {voiceUri ? (
            <TouchableOpacity
              style={styles.voiceFillButton}
              disabled={voiceBusy}
              onPress={fillFromVoice}>
              {voiceBusy ? (
                <ActivityIndicator color={colors.primaryDark} />
              ) : (
                <Text style={styles.voiceFillText}>Talk to FarmPool</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {voiceProgress ? (
            <View style={styles.aiProgressCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiProgressText}>{voiceProgress}</Text>
            </View>
          ) : null}

          {voiceResult && voiceResult.status !== 'live' && voiceResult.status !== 'demo' ? (
            <View style={styles.voiceErrorCard}>
              <Text style={styles.voiceErrorTitle}>
                {voiceResult.status === 'backend-unreachable'
                  ? 'Backend not reachable'
                  : voiceResult.status === 'stt-failed'
                    ? 'Transcription failed'
                    : 'Field extraction failed'}
              </Text>
              <Text style={styles.voiceErrorText}>{voiceResult.note}</Text>
              {voiceResult.status !== 'extraction-failed' ? (
                <TouchableOpacity
                  style={styles.voiceSampleButton}
                  onPress={() => applyExtraction(demoVoiceListing())}>
                  <Text style={styles.voiceSampleText}>Use sample data instead</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {voiceResult?.transcript ? (
            <View style={styles.voiceCard}>
              <Text style={styles.voiceEyebrow}>
                {voiceResult.status === 'demo'
                  ? 'SAMPLE TRANSCRIPT (DEMO FALLBACK, NOT YOUR RECORDING)'
                  : voiceResult.status === 'extraction-failed'
                    ? 'LIVE TRANSCRIPT (FIELDS NOT FILLED)'
                    : 'WHAT WE HEARD (LIVE)'}
              </Text>
              <TextInput
                style={styles.transcriptInput}
                multiline
                value={transcriptDraft}
                placeholder="Correct the transcript"
                placeholderTextColor={colors.faint}
                onChangeText={setTranscriptDraft}
              />
              <TouchableOpacity
                style={[styles.rereadButton, (!transcriptDraft.trim() || voiceBusy) && styles.disabled]}
                disabled={!transcriptDraft.trim() || voiceBusy}
                onPress={rereadTranscript}>
                <Text style={styles.rereadButtonText}>
                  {transcriptChanged ? 'Read corrected transcript' : 'Read transcript again'}
                </Text>
              </TouchableOpacity>
              {voiceAutofill.applied.length > 0 ? (
                <Text style={styles.voiceCheck}>
                  Filled with high confidence:{' '}
                  {voiceAutofill.applied.map(voiceFieldLabel).join(', ')}.
                </Text>
              ) : null}
              {voiceAutofill.skipped.length > 0 ? (
                <View style={styles.voiceSkippedCard}>
                  <Text style={styles.voiceSkippedText}>
                    Kept your edits for:{' '}
                    {voiceAutofill.skipped.map(voiceFieldLabel).join(', ')}.
                  </Text>
                  <TouchableOpacity
                    style={styles.voiceSampleButton}
                    onPress={confirmApplySkippedVoiceFields}>
                    <Text style={styles.voiceSampleText}>Apply skipped suggestions</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {voiceConfidenceFields.length > 0 ? (
                <View style={styles.confidenceGrid}>
                  {voiceConfidenceFields.map((field) => (
                    <Text key={field} style={styles.confidenceChip}>
                      {voiceFieldLabel(field)}{' '}
                      {Math.round((voiceResult.extraction?.field_confidence[field] ?? 0) * 100)}%
                    </Text>
                  ))}
                </View>
              ) : null}
              {voiceResult.extraction && voiceResult.extraction.uncertain.length > 0 ? (
                <Text style={styles.voiceCheck}>
                  Double-check: {voiceResult.extraction.uncertain.map(voiceFieldLabel).join(', ')}
                </Text>
              ) : null}
              {voiceResult.extraction && voiceResult.extraction.ambiguous.length > 0 ? (
                <Text style={styles.voiceCheck}>
                  Ambiguous: {voiceResult.extraction.ambiguous.map(voiceFieldLabel).join(', ')}.
                </Text>
              ) : null}
              {voiceResult.extraction && voiceResult.extraction.conflicts.length > 0 ? (
                <Text style={styles.voiceConflict}>
                  Conflict: {voiceResult.extraction.conflicts.join(' ')}
                </Text>
              ) : null}
              {voiceResult.extraction && voiceResult.extraction.missing.length > 0 ? (
                <Text style={styles.voiceCheck}>
                  Still needed: {voiceResult.extraction.missing.map(voiceFieldLabel).join(', ')}.
                  Add them below.
                </Text>
              ) : null}
              {voiceResult.extraction && voiceResult.extraction.follow_up_questions.length > 0 ? (
                <View style={styles.followUpCard}>
                  <Text style={styles.followUpTitle}>FarmPool needs</Text>
                  {voiceResult.extraction.follow_up_questions.map((question) => (
                    <Text key={question} style={styles.followUpQuestion}>
                      {question}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={styles.voiceFootnote}>
                Review every filled field before you submit. Nothing is saved until you do.
              </Text>
            </View>
          ) : null}

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
          <Text style={styles.qualitySectionTitle}>
            {selectedCrop ? `${selectedCrop.name} quality details` : 'Crop quality details'}
          </Text>
          {selectedCrop ? (
            <>
              <Text style={styles.selfReportedHint}>
                Optional and self-reported. Choose unknown when you have not measured or checked it.
              </Text>
              {qualityQuestions.map((question) =>
                question.kind === 'choice' ? (
                  <SelectField
                    key={question.id}
                    label={question.label}
                    hint="self-reported"
                    placeholder={UNKNOWN_QUALITY_VALUE}
                    value={qualityResponses[question.id] ?? ''}
                    options={(question.options ?? [UNKNOWN_QUALITY_VALUE]).map((value) => ({
                      value,
                    }))}
                    onChange={(value) => updateQualityAnswer(question.id, value)}
                  />
                ) : (
                  <View key={question.id}>
                    <FormField
                      label={question.label}
                      hint={question.unit ? `${question.unit} · self-reported` : 'self-reported'}
                      placeholder={UNKNOWN_QUALITY_VALUE}
                      keyboardType="decimal-pad"
                      value={qualityResponses[question.id] ?? ''}
                      onChangeText={(value) => updateQualityAnswer(question.id, value)}
                    />
                    <TouchableOpacity
                      style={styles.unknownButton}
                      onPress={() => updateQualityAnswer(question.id, UNKNOWN_QUALITY_VALUE)}>
                      <Text style={styles.unknownButtonText}>{UNKNOWN_QUALITY_VALUE}</Text>
                    </TouchableOpacity>
                  </View>
                ),
              )}
            </>
          ) : (
            <Text style={styles.selfReportedHint}>
              Pick a crop to show the relevant quality questions.
            </Text>
          )}
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
          {submitProgress ? (
            <View style={styles.aiProgressCard}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiProgressText}>{submitProgress}</Text>
            </View>
          ) : null}
          <Text style={styles.footnote}>
            Photos are checked automatically. Physical sampling and a final buyer inspection
            still happen at pickup.
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
  demoFillIcon: { color: colors.tan, fontSize: 21, width: 31 },
  demoFillCopy: { flex: 1 },
  demoFillTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  demoFillText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  demoFillArrow: { color: colors.tan, fontSize: 27 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 29, marginBottom: 13 },
  voiceWrap: { marginTop: 11 },
  voiceFillButton: { alignItems: 'center', justifyContent: 'center', minHeight: 46, backgroundColor: colors.primarySoft, borderRadius: 10, marginTop: 10 },
  voiceFillText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  aiProgressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, gap: 9 },
  aiProgressText: { flex: 1, color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  voiceCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 },
  voiceEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  voiceTranscript: { color: colors.ink, fontSize: 13, lineHeight: 19, marginTop: 7 },
  transcriptInput: { color: colors.ink, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, fontSize: 13, lineHeight: 19, minHeight: 88, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, textAlignVertical: 'top' },
  rereadButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 10, paddingVertical: 10, marginTop: 9 },
  rereadButtonText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  voiceCheck: { color: colors.amber, backgroundColor: colors.amberSoft, fontSize: 11, lineHeight: 16, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8, overflow: 'hidden' },
  voiceConflict: { color: colors.danger, backgroundColor: colors.dangerSoft, fontSize: 11, lineHeight: 16, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8, overflow: 'hidden' },
  voiceSkippedCard: { backgroundColor: colors.background, borderRadius: 10, padding: 10, marginTop: 8 },
  voiceSkippedText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  confidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  confidenceChip: { color: colors.primaryDark, backgroundColor: colors.primarySoft, fontSize: 9, fontWeight: '800', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' },
  followUpCard: { backgroundColor: colors.primarySoft, borderRadius: 10, padding: 11, marginTop: 9 },
  followUpTitle: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  followUpQuestion: { color: colors.primaryDark, fontSize: 11, lineHeight: 16, marginTop: 3 },
  voiceFootnote: { color: colors.faint, fontSize: 10, lineHeight: 14, marginTop: 9 },
  voiceErrorCard: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 13, marginTop: 10 },
  voiceErrorTitle: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  voiceErrorText: { color: '#7A4A42', fontSize: 11, lineHeight: 16, marginTop: 4 },
  voiceSampleButton: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 11, paddingVertical: 9, marginTop: 9 },
  voiceSampleText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  reviewNotice: { backgroundColor: colors.amberSoft, borderRadius: 10, padding: 12, marginTop: -6, marginBottom: 16 },
  reviewNoticeText: { color: colors.amber, fontSize: 11, lineHeight: 16 },
  conditionHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -6, marginBottom: 16 },
  qualitySectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  selfReportedHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -2, marginBottom: 12 },
  unknownButton: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, marginTop: -8, marginBottom: 14 },
  unknownButtonText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 57, backgroundColor: colors.primary, borderRadius: 12, marginTop: 14, paddingHorizontal: 17 },
  submitText: { color: colors.cream, fontSize: 16, fontWeight: '800' },
  submitArrow: { position: 'absolute', right: 18, color: '#F2F8FD', fontSize: 29 },
  disabled: { opacity: 0.62 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 12, marginTop: 13 },
});
