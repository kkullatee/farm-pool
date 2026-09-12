import { Firmness, QualityAssessment } from './types';

type AnalysisInput = {
  crop: string;
  variety: string;
  brix: number;
  defectsPct: number;
  firmness: Firmness;
  notes: string;
  imageUri: string | null;
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

function localAssessment(input: AnalysisInput): QualityAssessment {
  const visualScore = Math.max(
    45,
    Math.min(97, Math.round(86 + (input.brix - 14) * 3 - input.defectsPct * 1.4)),
  );
  const grade =
    input.brix >= 14.5 && input.defectsPct <= 3
      ? 'Premium'
      : input.brix >= 12 && input.defectsPct <= 7
        ? 'Standard'
        : 'Processing';

  const observations = [
    input.imageUri ? 'Produce image captured for visual review' : 'No image supplied; confidence reduced',
    `${input.brix.toFixed(1)} Brix entered by the farmer`,
    `${input.defectsPct.toFixed(1)}% visible defects reported`,
    `${input.firmness} firmness profile`,
  ];

  return {
    grade,
    visualScore,
    confidence: input.imageUri ? 0.84 : 0.64,
    observations,
    warning:
      'This is a preliminary screen. Taste and safety require a physical sample and verified measurements.',
    source: 'demo',
  };
}

export async function analyseProduce(input: AnalysisInput): Promise<QualityAssessment> {
  if (!apiUrl) return localAssessment(input);

  try {
    const body = new FormData();
    body.append('crop', input.crop);
    body.append('variety', input.variety);
    body.append('brix', String(input.brix));
    body.append('defects_pct', String(input.defectsPct));
    body.append('firmness', input.firmness);
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
