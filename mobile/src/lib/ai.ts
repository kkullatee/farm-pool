import { ConditionGrade, QualityAssessment, VoiceListing } from './types';

export const backendUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? null;

type AnalysisInput = {
  crop: string;
  variety: string;
  condition: ConditionGrade;
  notes: string;
  imageUri: string | null;
};

const apiUrl = backendUrl;

function localAssessment(input: AnalysisInput): QualityAssessment {
  const byCondition: Record<ConditionGrade, { grade: QualityAssessment['grade']; score: number }> =
    {
      Premium: { grade: 'Premium', score: 91 },
      Standard: { grade: 'Standard', score: 82 },
      Economy: { grade: 'Processing', score: 68 },
    };
  const { grade, score } = byCondition[input.condition];

  const observations = [
    input.imageUri ? 'Produce image captured for visual review' : 'No image supplied; confidence reduced',
    `Condition reported by the seller: ${input.condition}`,
  ];

  return {
    grade,
    visualScore: score,
    confidence: input.imageUri ? 0.84 : 0.64,
    observations,
    warning:
      'This is a preliminary screen based on seller-provided details. Buyers can ask the seller for more before confirming.',
    source: 'demo',
    // Without the AI check the photo cannot be verified, so it waits for manual
    // review and is never shown to buyers.
    photoStatus: input.imageUri ? 'Manual review' : 'No photo',
    photoChecks: input.imageUri
      ? ['AI photo check unavailable, photo held for manual review']
      : ['No photo supplied'],
  };
}

export async function analyseProduce(input: AnalysisInput): Promise<QualityAssessment> {
  if (!apiUrl) return { ...localAssessment(input), aiStatus: 'demo-fallback' };

  try {
    const body = new FormData();
    body.append('crop', input.crop);
    body.append('variety', input.variety);
    body.append('condition', input.condition);
    body.append('notes', input.notes);
    if (input.imageUri) {
      body.append(
        'file',
        {
          uri: input.imageUri,
          name: 'produce.jpg',
          type: 'image/jpeg',
        } as unknown as Blob,
      );
    }

    const response = await fetch(`${apiUrl}/analyse-produce`, {
      method: 'POST',
      body,
    });
    if (!response.ok) throw new Error(`Analysis failed with ${response.status}`);
    const result = (await response.json()) as QualityAssessment;
    // The backend answers with source 'anthropic' when the vision model really
    // ran, and 'demo' when it could not (no key, model error). Keep that
    // distinction visible instead of pretending both are the same.
    if (result.source === 'anthropic') return { ...result, aiStatus: 'live' };
    return { ...result, aiStatus: 'vision-unavailable' };
  } catch {
    return { ...localAssessment(input), aiStatus: 'backend-unreachable' };
  }
}

/** Demo fallback so the voice flow always works, clearly labeled as a sample. */
export function demoVoiceListing(): VoiceListing {
  return {
    status: 'demo',
    note: 'Sample data. No backend is configured, so this is not your recording.',
    transcript:
      'Sample transcript: about two thousand kilos of Kensington Pride mangoes from Mareeba, ' +
      'ready around the twenty first, asking three dollars a kilo, top quality batch.',
    extraction: {
      crop: 'Mango',
      variety: 'Kensington Pride',
      quantity: 2000,
      unit: 'kg',
      location: 'Mareeba, QLD',
      harvest_date: null,
      price_per_kg: 3,
      condition: 'Premium',
      notes: 'Farmer says it is a top quality batch.',
      uncertain: ['condition'],
      missing: ['harvest_date'],
    },
    transcriptSource: 'demo',
    extractionSource: 'demo',
  };
}

/**
 * Voice to listing: sends the recording to the backend, which transcribes it
 * (ElevenLabs) and extracts listing fields with Claude.
 * Falls back to a clearly labeled sample when no backend is configured, so the
 * demo flow always works.
 */
export async function voiceToListing(uri: string): Promise<VoiceListing> {
  // No backend configured: the demo sample is intentional and says so.
  if (!apiUrl) return demoVoiceListing();

  try {
    const body = new FormData();
    body.append(
      'file',
      {
        uri,
        name: 'harvest-note.m4a',
        type: 'audio/m4a',
      } as unknown as Blob,
    );
    const response = await fetch(`${apiUrl}/voice-to-listing`, { method: 'POST', body });
    if (!response.ok) throw new Error(`Voice listing failed with ${response.status}`);
    const result = (await response.json()) as {
      transcript: string | null;
      extraction: VoiceListing['extraction'];
      transcript_source: 'elevenlabs' | 'unavailable';
      extraction_source: 'claude' | 'unavailable';
    };

    // Backend reached but transcription failed: never substitute the sample.
    if (!result.transcript) {
      return {
        status: 'stt-failed',
        note: 'The backend is running but transcription failed. Check the ElevenLabs key in backend/.env.',
        transcript: null,
        extraction: null,
        transcriptSource: 'unavailable',
        extractionSource: 'unavailable',
      };
    }

    // Real transcript but extraction failed: show the words, fill nothing.
    if (!result.extraction) {
      return {
        status: 'extraction-failed',
        note: 'Transcribed live, but field extraction failed. Check the Anthropic key in backend/.env and fill the form manually.',
        transcript: result.transcript,
        extraction: null,
        transcriptSource: result.transcript_source,
        extractionSource: 'unavailable',
      };
    }

    return {
      status: 'live',
      note: `Live transcription (${result.transcript_source}) and extraction (${result.extraction_source}).`,
      transcript: result.transcript,
      extraction: result.extraction,
      transcriptSource: result.transcript_source,
      extractionSource: result.extraction_source,
    };
  } catch {
    return {
      status: 'backend-unreachable',
      note: `Could not reach the backend at ${apiUrl}. Check that the server is running and the phone is on the same Wi-Fi.`,
      transcript: null,
      extraction: null,
      transcriptSource: 'unavailable',
      extractionSource: 'unavailable',
    };
  }
}

export async function transcribeVoice(uri: string | null): Promise<string | null> {
  if (!apiUrl || !uri) return null;

  try {
    const body = new FormData();
    body.append(
      'file',
      {
        uri,
        name: 'harvest-note.m4a',
        type: 'audio/m4a',
      } as unknown as Blob,
    );
    const response = await fetch(`${apiUrl}/transcribe`, { method: 'POST', body });
    if (!response.ok) return null;
    const result = (await response.json()) as { text?: string };
    return result.text ?? null;
  } catch {
    return null;
  }
}
