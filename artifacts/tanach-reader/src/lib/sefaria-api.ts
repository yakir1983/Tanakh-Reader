// Sefaria API client

interface SefariaIndexResponse {
  schema: {
    lengths?: number[];
    length?: number;
  };
}

// The Sefaria `he` field can be string | string[] | string[][]
type SefariaHe = string | SefariaHe[];

interface SefariaTextResponse {
  he: SefariaHe;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively flatten Sefaria nested arrays into flat string[].
 * Each string may contain raw HTML (e.g. <b>word</b> commentary…).
 * We do NOT touch the content — callers decide what to do with it.
 */
function flattenRaw(data: SefariaHe): string[] {
  if (typeof data === 'string') {
    const t = data.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(data)) return data.flatMap(flattenRaw);
  return [];
}

/**
 * Extract plain text from an HTML string using the browser DOM.
 * Never touches Hebrew letters or nikud with regex.
 */
function htmlToPlainText(html: string): string {
  const el = document.createElement('span');
  el.innerHTML = html;
  return el.textContent ?? '';
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getBookIndex(englishName: string): Promise<number[]> {
  const res = await fetch(`https://www.sefaria.org/api/index/${englishName}`);
  if (!res.ok) throw new Error(`Failed to fetch index: ${englishName}`);
  const data: SefariaIndexResponse = await res.json();
  if (data.schema.lengths) return data.schema.lengths;
  if (data.schema.length) return [data.schema.length];
  return [];
}

/**
 * Fetch the Hebrew text of a single verse.
 * Returns plain text (nikud preserved, cantillation stripped so
 * Frank Ruhl Libre doesn't show boxes for unsupported glyphs).
 */
export async function getVerseText(
  englishName: string,
  chapter: number,
  verse: number
): Promise<string> {
  const url = `https://www.sefaria.org/api/texts/${englishName}.${chapter}.${verse}?lang=he`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch verse ${englishName} ${chapter}:${verse}`);
  const data: SefariaTextResponse = await res.json();

  const segments = flattenRaw(data.he);
  if (!segments.length) return '';

  // Use DOM to safely get text content (strips any HTML tags from verse)
  const plain = htmlToPlainText(segments[0]);
  // Strip cantillation marks (U+0591–U+05AF) — Frank Ruhl Libre lacks those glyphs
  // Nikud (U+05B0–U+05C7) is preserved
  return plain.replace(/[\u0591-\u05AF]/g, '');
}

/**
 * Fetch Rashi commentary for a verse and return raw HTML segments.
 *
 * Each segment is a string like:
 *   "<b>בראשית.</b> אָמַר רַבִּי יִצְחָק…"
 *
 * We return them as-is so the UI can render with dangerouslySetInnerHTML
 * — zero string manipulation, zero risk of breaking Hebrew Unicode.
 */
export async function getRashiSegments(
  englishName: string,
  chapter: number,
  verse: number
): Promise<string[]> {
  const url = `https://www.sefaria.org/api/texts/Rashi_on_${englishName}.${chapter}.${verse}?lang=he`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: SefariaTextResponse = await res.json();
    return flattenRaw(data.he).filter(s => s.length > 0);
  } catch {
    return [];
  }
}

/**
 * Extract plain text from Rashi HTML segments (for TTS).
 */
export function rashiSegmentsToPlainText(segments: string[]): string {
  return segments
    .map(htmlToPlainText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
