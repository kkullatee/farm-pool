import { ConditionGrade, QualityAssessment } from './types';

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
