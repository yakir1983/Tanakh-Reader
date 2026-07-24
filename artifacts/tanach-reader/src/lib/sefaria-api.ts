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

/** Decode common HTML entities before DOM parsing */
function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(+n));
}

/**
 * Use the browser DOM to safely extract text from an HTML fragment.
 * This avoids any manual regex / string-slice on Hebrew Unicode.
 */
function domText(html: string): string {
  const el = document.createElement('span');
  el.innerHTML = decodeEntities(html);
  return el.textContent ?? '';
}

/**
 * Recursively flatten Sefaria's nested arrays into raw HTML strings.
 * Preserves all markup so parseDibur can use the DOM to extract structure.
 */
function flattenRaw(data: SefariaHe): string[] {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(data)) {
    return data.flatMap(item => flattenRaw(item));
  }
  return [];
}

// ── Rashi dibur structure ────────────────────────────────────────────────────

export interface RashiDibur {
  /** The "dibur hamatchil" opening word(s), unvocalised */
  heading: string;
  /** Rashi's commentary on that phrase, with full nikud */
  commentary: string;
}

/**
 * Parse a single Sefaria Rashi HTML segment, e.g.:
 *   "<b>תהו ובהו.</b> תֹּהוּ לְשׁוֹן תֵּמַהּ..."
 *
 * Uses DOMParser so Hebrew letters and nikud are never touched by regex.
 */
function parseDibur(rawHtml: string): RashiDibur | null {
  // Wrap in a span so the DOM treats it as a fragment
  const span = document.createElement('span');
  span.innerHTML = decodeEntities(rawHtml);

  // Pull the bold heading element
  const boldEl = span.querySelector('b, strong');
  let heading = '';
  if (boldEl) {
    heading = (boldEl.textContent ?? '').replace(/[.,:;]+$/, '').trim();
    boldEl.remove();          // remove from span so we get only the rest
  }

  // Everything left in the span is the commentary
  const commentary = (span.textContent ?? '').replace(/^\s*[.,:;]\s*/, '').trim();

  if (!heading && !commentary) return null;
  return { heading, commentary };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getBookIndex(englishName: string): Promise<number[]> {
  const res = await fetch(`https://www.sefaria.org/api/index/${englishName}`);
  if (!res.ok) throw new Error(`Failed to fetch index: ${englishName}`);
  const data: SefariaIndexResponse = await res.json();
  if (data.schema.lengths) return data.schema.lengths;
  if (data.schema.length)  return [data.schema.length];
  return [];
}

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
  if (segments.length === 0) return '';

  // Use DOM to safely extract plain text, then strip cantillation marks
  // (U+0591–U+05AF = taamei mikra). Frank Ruhl Libre lacks those glyphs
  // so they render as boxes. Nikud (U+05B0–U+05C7) is kept.
  const text = domText(segments[0]);
  return text.replace(/[\u0591-\u05AF]/g, '');
}

/**
 * Fetch Rashi commentary for a specific verse and return it as
 * an array of structured diburim, each with a bold heading and commentary.
 */
export async function getRashiDiburim(
  englishName: string,
  chapter: number,
  verse: number
): Promise<RashiDibur[]> {
  const url =
    `https://www.sefaria.org/api/texts/Rashi_on_${englishName}.${chapter}.${verse}?lang=he`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: SefariaTextResponse = await res.json();

    return flattenRaw(data.he)
      .map(parseDibur)
      .filter((d): d is RashiDibur => d !== null);
  } catch {
    return [];
  }
}
