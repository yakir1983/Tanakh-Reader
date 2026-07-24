// Web Speech API wrapper for Hebrew voice recognition

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;

export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function createHebrewSpeechRecognition(
  onResult: SpeechRecognitionCallback,
  onError?: (error: string) => void
): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionAPI();

  recognition.lang = 'he-IL';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const result = event.results[0][0];
    onResult({
      transcript: result.transcript,
      confidence: result.confidence,
    });
  };

  recognition.onerror = (event: any) => {
    if (onError) onError(event.error);
  };

  return recognition;
}

// ── Normalization ────────────────────────────────────────────────────────────

/**
 * Common substitutions for voice-recognition output:
 * voice engines often say "אלוקים" for "אלהים" etc.
 */
const VOICE_SUBSTITUTIONS: [RegExp, string][] = [
  [/אלוקים/g,   'אלהים'],
  [/אלוקינו/g,  'אלהינו'],
  [/אלוקיך/g,   'אלהיך'],
  [/אלוקיכם/g,  'אלהיכם'],
  [/אלוקיהם/g,  'אלהיהם'],
  [/השם/g,      'יהוה'],
  [/ה׳/g,       'יהוה'],
  [/שני/g,      'שניים'],
];

/**
 * Normalize a Hebrew voice transcript for reference matching:
 * apply substitutions, strip nikud + cantillation, collapse spaces.
 */
export function normalizeHebrewTranscript(text: string): string {
  let out = text.trim();
  for (const [from, to] of VOICE_SUBSTITUTIONS) {
    out = out.replace(from, to);
  }
  // Strip nikud (U+05B0-U+05C7) and cantillation (U+0591-U+05AF)
  out = out.replace(/[\u0591-\u05C7]/g, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}

// ── Reference parsing ────────────────────────────────────────────────────────

export interface ParsedReference {
  book?: string;
  chapter?: number;
  verse?: number;
}

export function parseHebrewReference(rawTranscript: string): ParsedReference {
  const transcript = normalizeHebrewTranscript(rawTranscript);
  const result: ParsedReference = {};

  // Pattern: [book] פרק [chapter] פסוק [verse]
  const fullPattern =
    /^(.+?)\s+(?:פרק\s+)?(\d+|[א-ת]+)\s+(?:פסוק\s+)?(\d+|[א-ת]+)$/;
  const match = transcript.match(fullPattern);

  if (match) {
    result.book    = match[1].trim();
    result.chapter = (hebrewToNumber(match[2]) ?? parseInt(match[2])) || undefined;
    result.verse   = (hebrewToNumber(match[3]) ?? parseInt(match[3])) || undefined;
  } else {
    const words = transcript.split(/\s+/);
    if (words.length > 0) result.book = words[0];
  }

  return result;
}

// Convert a single Hebrew numeral string to an integer (א=1 … ת=400)
function hebrewToNumber(hebrew: string): number | null {
  const MAP: Record<string, number> = {
    'א': 1,  'ב': 2,  'ג': 3,  'ד': 4,  'ה': 5,
    'ו': 6,  'ז': 7,  'ח': 8,  'ט': 9,  'י': 10,
    'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60,
    'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100,'ר': 200,
    'ש': 300,'ת': 400,
  };
  let sum = 0;
  for (const ch of hebrew) {
    if (!MAP[ch]) return null;
    sum += MAP[ch];
  }
  return sum || null;
}
