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

/** Strip all HTML tags */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Strip cantillation marks (U+0591–U+05AF) and stray BiDi/control chars.
 * Nikud (U+05B0–U+05C7) is always preserved.
 */
function cleanHebrewText(text: string): string {
  return text
    .replace(/[\u0591-\u05AF]/g, '')                    // cantillation / trope
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '') // BiDi / zero-width
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Recursively flatten any depth of string arrays into raw HTML strings.
 * Does NOT strip HTML — callers decide what to do with markup.
 */
function flattenRaw(data: SefariaHe): string[] {
  if (typeof data === 'string') {
    const decoded = decodeEntities(data).trim();
    return decoded ? [decoded] : [];
  }
  if (Array.isArray(data)) {
    return data.flatMap(item => flattenRaw(item));
  }
  return [];
}

// ── Rashi dibur structure ────────────────────────────────────────────────────

export interface RashiDibur {
  /** The "dibur hamatchil" — the opening word(s) from the verse (unvocalised) */
  heading: string;
  /** Rashi's commentary on that word/phrase, with nikud */
  commentary: string;
}

/**
 * Parse a single Sefaria Rashi HTML string such as:
 *   "<b>בראשית.</b> אָמַר רַבִּי יִצְחָק..."
 * into a structured RashiDibur.
 */
function parseDibur(raw: string): RashiDibur | null {
  // Extract text inside <b>...</b> as heading
  const boldMatch = raw.match(/^<b>([\s\S]*?)<\/b>\s*/i);
  if (boldMatch) {
    const heading = cleanHebrewText(stripHtml(boldMatch[1])).replace(/[.:–\-]+$/, '').trim();
    const rest = raw.slice(boldMatch[0].length);
    const commentary = cleanHebrewText(stripHtml(rest));
    if (heading || commentary) return { heading, commentary };
    return null;
  }
  // No bold tag — treat whole segment as commentary with empty heading
  const commentary = cleanHebrewText(stripHtml(raw));
  return commentary ? { heading: '', commentary } : null;
}

/**
 * Recursively flatten any depth of string arrays into raw HTML strings.
 * Handles verse (string[]) and Rashi (string[][]).
 */
function flattenHe(data: SefariaHe): string[] {
  if (typeof data === 'string') {
    const cleaned = cleanHebrewText(stripHtml(decodeEntities(data)));
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(data)) {
    return data.flatMap(item => flattenHe(item));
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
  const segments = flattenHe(data.he);
  return segments[0] ?? '';
}

/**
 * Fetch Rashi commentary for a single verse and parse it into
 * structured diburim (one per Rashi comment on that verse).
 */
export async function getRashiDiburim(
  englishName: string,
  chapter: number,
  verse: number
): Promise<RashiDibur[]> {
  const url = `https://www.sefaria.org/api/texts/Rashi_on_${englishName}.${chapter}.${verse}?lang=he`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data: SefariaTextResponse = await response.json();

    // flattenRaw preserves <b> tags; parseDibur splits heading from commentary
    const rawSegments = flattenRaw(data.he);
    const diburim = rawSegments
      .map(parseDibur)
      .filter((d): d is RashiDibur => d !== null && (d.heading !== '' || d.commentary !== ''));

    return diburim;
  } catch {
    return [];
  }
}
