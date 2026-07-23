// Web Speech API wrapper for Hebrew voice recognition

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

export type SpeechRecognitionCallback = (result: SpeechRecognitionResult) => void;

// Check if browser supports speech recognition
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

// Create and configure Hebrew speech recognition
export function createHebrewSpeechRecognition(
  onResult: SpeechRecognitionCallback,
  onError?: (error: string) => void
): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionAPI();

  recognition.lang = 'he-IL';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const result = event.results[0][0];
    onResult({
      transcript: result.transcript,
      confidence: result.confidence
    });
  };

  recognition.onerror = (event: any) => {
    if (onError) {
      onError(event.error);
    }
  };

  return recognition;
}

// Parse Hebrew speech input to extract book/chapter/verse
// Expected patterns: "בראשית פרק א פסוק א" or "בראשית א א"
export interface ParsedReference {
  book?: string;
  chapter?: number;
  verse?: number;
}

export function parseHebrewReference(transcript: string): ParsedReference {
  const result: ParsedReference = {};
  
  // Normalize transcript
  const normalized = transcript.trim();
  
  // Try to match pattern: [book name] פרק [chapter] פסוק [verse]
  const fullPattern = /^(.+?)\s+(?:פרק\s+)?(\d+|[א-ת]+)\s+(?:פסוק\s+)?(\d+|[א-ת]+)$/;
  const match = normalized.match(fullPattern);
  
  if (match) {
    result.book = match[1].trim();
    result.chapter = hebrewToNumber(match[2]) || parseInt(match[2]);
    result.verse = hebrewToNumber(match[3]) || parseInt(match[3]);
  } else {
    // Try simpler pattern: just extract book name
    const words = normalized.split(/\s+/);
    if (words.length > 0) {
      result.book = words[0];
    }
  }
  
  return result;
}

// Convert Hebrew letters to numbers (א=1, ב=2, etc.)
function hebrewToNumber(hebrew: string): number | null {
  const hebrewNumerals: Record<string, number> = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
  };
  
  let sum = 0;
  for (const char of hebrew) {
    if (hebrewNumerals[char]) {
      sum += hebrewNumerals[char];
    } else {
      return null; // Invalid hebrew numeral
    }
  }
  
  return sum || null;
}
