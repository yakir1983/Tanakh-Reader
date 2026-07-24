// Sefaria API client

interface SefariaIndexResponse {
  schema: {
    lengths?: number[];
    length?: number;
  };
}

// The Sefaria `he` field can be a string, string[], or string[][]
// (Rashi returns nested arrays — one sub-array per dibur/comment)
type SefariaHe = string | SefariaHe[];

interface SefariaTextResponse {
  he: SefariaHe;
}

// ── Text cleaning helpers ────────────────────────────────────────────────────

/** Strip all HTML tags */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(parseInt(code, 10))
    );
}

/**
 * Strip cantillation marks (U+0591–U+05AF) and stray BiDi/control chars.
 * Nikud (U+05B0–U+05C7) is kept by default; pass stripNikud=true for Rashi.
 */
function cleanHebrewText(text: string, stripNikud = false): string {
  let out = text
    .replace(/[\u0591-\u05AF]/g, '')         // cantillation / trope
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // BiDi / zero-width
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (stripNikud) {
    out = out.replace(/[\u05B0-\u05C7]/g, ''); // vowel points
  }

  return out;
}

/**
 * Recursively flatten any depth of string arrays.
 * Handles verse (string[]) and Rashi (string[][]).
 */
function flattenHe(data: SefariaHe, stripNikud = false): string[] {
  if (typeof data === 'string') {
    const cleaned = cleanHebrewText(decodeEntities(stripHtml(data)), stripNikud);
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(data)) {
    return data.flatMap(item => flattenHe(item, stripNikud));
  }
  return [];
}

// ── Public API functions ─────────────────────────────────────────────────────

export async function getBookIndex(englishName: string): Promise<number[]> {
  const response = await fetch(
    `https://www.sefaria.org/api/index/${englishName}`
  );
  if (!response.ok) throw new Error(`Failed to fetch book index for ${englishName}`);
  const data: SefariaIndexResponse = await response.json();
  if (data.schema.lengths) return data.schema.lengths;
  if (data.schema.length) return [data.schema.length];
  return [];
}

export async function getVerseText(
  englishName: string,
  chapter: number,
  verse: number
): Promise<string> {
  const url = `https://www.sefaria.org/api/texts/${englishName}.${chapter}.${verse}?lang=he`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch verse ${englishName} ${chapter}:${verse}`);
  const data: SefariaTextResponse = await response.json();
  // Verse text: first non-empty segment, keep nikud
  const segments = flattenHe(data.he, false);
  return segments[0] ?? '';
}

export async function getRashiCommentary(
  englishName: string,
  chapter: number,
  verse: number
): Promise<string | null> {
  const url = `https://www.sefaria.org/api/texts/Rashi_on_${englishName}.${chapter}.${verse}?lang=he`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: SefariaTextResponse = await response.json();
    // Rashi: join ALL diburim for this verse; keep nikud for readability
    const segments = flattenHe(data.he, false);
    if (segments.length === 0) return null;
    return segments.join('\n');
  } catch {
    return null;
  }
}
