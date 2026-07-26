// Web Speech API wrapper for Hebrew voice recognition

import { TANACH_BOOKS, type TanachBook } from './tanach-data';

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}
export type SpeechRecognitionCallback = (r: SpeechRecognitionResult) => void;

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
}

export function createHebrewSpeechRecognition(
  onResult: SpeechRecognitionCallback,
  onError?: (error: string) => void
): any {
  if (!isSpeechRecognitionSupported()) return null;

  const API =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new API();
  rec.lang = 'he-IL';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3; // get more alternatives for better matching

  rec.onresult = (event: any) => {
    // Try all alternatives, return the one that parses best
    const results: SpeechRecognitionResult[] = [];
    for (let i = 0; i < event.results[0].length; i++) {
      results.push({
        transcript: event.results[0][i].transcript,
        confidence: event.results[0][i].confidence,
      });
    }
    // Prefer the alternative that contains a recognisable book name
    const best =
      results.find(r => findBookInText(normalise(r.transcript)) !== null) ??
      results[0];
    onResult(best);
  };

  rec.onerror = (event: any) => {
    onError?.(event.error as string);
  };

  return rec;
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Voice-engine substitutions: maps common mis-recognitions to canonical forms.
 * Ordered longest-first so multi-word patterns match before single words.
 */
const SUBSTITUTIONS: [RegExp, string][] = [
  // Divine names
  [/אלוקינו/g, 'אלהינו'],
  [/אלוקיכם/g, 'אלהיכם'],
  [/אלוקיהם/g, 'אלהיהם'],
  [/אלוקיך/g,  'אלהיך'],
  [/אלוקים/g,  'אלהים'],
  [/ה׳/g,      'יהוה'],
  [/השם/g,     'יהוה'],

  // Ordinal suffixes the voice engine sometimes adds
  [/ראשון/g,   'א'],
  [/שני/g,     'ב'],
  [/שנייה/g,   'ב'],
];

/** Normalise a transcript: apply substitutions then strip nikud/cantillation */
export function normalise(text: string): string {
  let s = text.trim();
  for (const [pat, rep] of SUBSTITUTIONS) s = s.replace(pat, rep);
  // Strip nikud (U+05B0–U+05C7) and cantillation (U+0591–U+05AF)
  s = s.replace(/[\u0591-\u05C7]/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ── Book matching ─────────────────────────────────────────────────────────────

/**
 * Aliases so the voice engine's output can map to canonical book names.
 * Keys are normalised (no nikud). Values are the `hebrew` field in TANACH_BOOKS.
 */
const BOOK_ALIASES: Record<string, string> = {
  // Torah
  'בראשית': 'בראשית',
  'שמות':   'שמות',
  'ויקרא':  'ויקרא',
  'במדבר':  'במדבר',
  'דברים':  'דברים',

  // Nevi'im doubles
  'שמואל א': 'שמואל א',
  'שמואל ב': 'שמואל ב',
  'שמואל':   'שמואל א',  // default to alef when unlabelled
  'מלכים א': 'מלכים א',
  'מלכים ב': 'מלכים ב',
  'מלכים':   'מלכים א',

  // Ketuvim doubles
  'דברי הימים א': 'דברי הימים א',
  'דברי הימים ב': 'דברי הימים ב',
  'דברי הימים':   'דברי הימים א',
  'דברי':          'דברי הימים א',

  // Common alternates
  'שיר השירים': 'שיר השירים',
  'שיר':        'שיר השירים',
  'תהלים':      'תהלים',
  'מזמור':      'תהלים',
  'קהלת':       'קהלת',
  'קהלת':       'קהלת',
  'אסתר':       'אסתר',
};

/**
 * Try to find a known book name inside normalised transcript text.
 * Returns the TanachBook if found, otherwise null.
 * Tries multi-word aliases first (longest match wins).
 */
export function findBookInText(normalisedText: string): TanachBook | null {
  // Sort aliases longest-first so "שמואל א" is tried before "שמואל"
  const sorted = Object.entries(BOOK_ALIASES).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [alias, canonical] of sorted) {
    if (normalisedText.includes(alias)) {
      const book = TANACH_BOOKS.find(b => b.hebrew === canonical);
      if (book) return book;
    }
  }

  // Fallback: check every book's own Hebrew name
  const byLength = [...TANACH_BOOKS].sort(
    (a, b) => b.hebrew.length - a.hebrew.length
  );
  for (const book of byLength) {
    if (normalisedText.includes(book.hebrew)) return book;
  }
  return null;
}

// ── Number parsing ────────────────────────────────────────────────────────────

const HEBREW_WORDS: Record<string, number> = {
  'אחת': 1, 'אחד': 1, 'ראשון': 1, 'ראשונה': 1,
  'שתיים': 2, 'שניים': 2, 'שני': 2, 'שנייה': 2,
  'שלוש': 3, 'שלש': 3, 'שלישי': 3,
  'ארבע': 4, 'רביעי': 4,
  'חמש': 5, 'חמישי': 5,
  'שש': 6, 'שישי': 6,
  'שבע': 7, 'שביעי': 7,
  'שמונה': 8, 'שמיני': 8,
  'תשע': 9, 'תשיעי': 9,
  'עשר': 10, 'עשרה': 10, 'עשירי': 10,
};

const GEMATRIA: Record<string, number> = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
  'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
  'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50,
  'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
};

function parseNum(token: string): number | null {
  // Arabic digit
  const n = parseInt(token, 10);
  if (!isNaN(n) && n > 0) return n;

  // Spoken Hebrew word (e.g. "שלוש")
  if (HEBREW_WORDS[token]) return HEBREW_WORDS[token];

  // Hebrew gematria string (e.g. "כב" = 22)
  let sum = 0;
  for (const ch of token) {
    if (!GEMATRIA[ch]) return null;
    sum += GEMATRIA[ch];
  }
  return sum > 0 ? sum : null;
}

// ── Reference parser ──────────────────────────────────────────────────────────

export interface ParsedReference {
  book?: TanachBook;
  chapter?: number;
  verse?: number;
}

/**
 * Parse a raw Hebrew voice transcript into a structured reference.
 * Handles patterns like:
 *   "בראשית פרק א פסוק א"
 *   "מלכים א פרק שלושה"
 *   "תהלים כג ד"
 */
export function parseHebrewReference(rawTranscript: string): ParsedReference {
  const norm = normalise(rawTranscript);
  const result: ParsedReference = {};

  // Find book
  result.book = findBookInText(norm) ?? undefined;

  // After stripping the book name from the text, look for chapter + verse
  let rest = norm;
  if (result.book) {
    // Remove the matched book name from rest to avoid re-parsing
    rest = rest.replace(result.book.hebrew, '').trim();
    // Also strip known aliases
    for (const alias of Object.keys(BOOK_ALIASES)) {
      rest = rest.replace(alias, '').trim();
    }
  }

  // Patterns: "פרק X פסוק Y" or just consecutive tokens after book name
  const chapterMatch = rest.match(/פרק\s+([^\s]+)/);
  const verseMatch   = rest.match(/פסוק\s+([^\s]+)/);

  if (chapterMatch) result.chapter = parseNum(chapterMatch[1]) ?? undefined;
  if (verseMatch)   result.verse   = parseNum(verseMatch[1])   ?? undefined;

  // Fallback: if no explicit "פרק"/"פסוק", try two bare tokens
  if (!result.chapter && !result.verse) {
    const tokens = rest
      .replace(/[^\u05D0-\u05EA\d\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens[0]) result.chapter = parseNum(tokens[0]) ?? undefined;
    if (tokens[1]) result.verse   = parseNum(tokens[1]) ?? undefined;
  }

  return result;
}
