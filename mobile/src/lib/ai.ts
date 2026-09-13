import { ConditionGrade, QualityAssessment, VoiceListing } from './types';

type AnalysisInput = {
  crop: string;
  variety: string;
  condition: ConditionGrade;
  notes: string;
  imageUri: string | null;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

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
  if (!apiUrl) return localAssessment(input);

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
    return { ...result, source: 'openai' };
  } catch {
    return localAssessment(input);
  }
}

/** Demo fallback so the voice flow always works, clearly labeled as a sample. */
function demoVoiceListing(): VoiceListing {
  return {
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
 * (ElevenLabs, or OpenAI as fallback) and extracts listing fields with Claude.
 * Falls back to a clearly labeled sample when no backend is configured, so the
 * demo flow always works.
 */
export async function voiceToListing(uri: string): Promise<VoiceListing> {
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
      transcript_source: 'elevenlabs' | 'openai' | 'unavailable';
      extraction_source: 'claude' | 'unavailable';
    };
    if (!result.transcript) return demoVoiceListing();
    return {
      transcript: result.transcript,
      extraction: result.extraction,
      transcriptSource: result.transcript_source,
      extractionSource: result.extraction_source,
    };
  } catch {
    return demoVoiceListing();
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
