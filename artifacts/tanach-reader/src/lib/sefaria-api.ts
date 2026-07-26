// Sefaria API client
import { TANACH_BOOKS } from './tanach-data';

// ── Types ─────────────────────────────────────────────────────────────────────

type SefariaHe = string | SefariaHe[];

interface SefariaTextResponse {
  he: SefariaHe;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Flatten Sefaria nested arrays → flat string[] (preserves HTML, no manipulation). */
function flattenRaw(data: SefariaHe): string[] {
  if (typeof data === 'string') {
    const t = data.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(data)) return data.flatMap(flattenRaw);
  return [];
}

/** First-level items of the `he` array (each item may itself be string | string[]). */
function topLevel(data: SefariaHe): SefariaHe[] {
  if (Array.isArray(data)) return data as SefariaHe[];
  return [];
}

/** Strip cantillation (U+0591–U+05AF) via DOM; preserves nikud (U+05B0–U+05C7). */
function stripCantillation(html: string): string {
  const el = document.createElement('span');
  el.innerHTML = html;
  const text = el.textContent ?? '';
  return text.replace(/[\u0591-\u05AF]/g, '');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Book structure: returns array of verse-counts per chapter.
 * e.g. Genesis → [31, 25, 24, ...] (50 items)
 */
export async function getBookIndex(englishName: string): Promise<number[]> {
  const res = await fetch(`https://www.sefaria.org/api/shape/${englishName}`);
  if (!res.ok) throw new Error(`Failed to fetch shape: ${englishName}`);
  const data = await res.json();
  const entry = Array.isArray(data) ? data[0] : data;
  if (Array.isArray(entry?.chapters)) return entry.chapters as number[];
  return [];
}

/**
 * Fetch ALL verses of a chapter in one network call.
 * Returns plain-text string[] indexed 0…N-1 (verse 1 = index 0).
 * Cantillation stripped; nikud preserved.
 */
export async function getChapterVerses(
  englishName: string,
  chapter: number,
): Promise<string[]> {
  const url = `https://www.sefaria.org/api/texts/${englishName}.${chapter}?lang=he&context=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chapter ${englishName} ${chapter}`);
  const data: SefariaTextResponse = await res.json();

  // `he` is a string[] at chapter level — one entry per verse
  const items = topLevel(data.he);
  return items.map(item => {
    const raw = typeof item === 'string' ? item : flattenRaw(item).join(' ');
    return stripCantillation(raw);
  });
}

/**
 * Fetch Rashi HTML segments for a single verse.
 * Returns string[] where each item is "<b>dibur</b> commentary…".
 * Rendered with dangerouslySetInnerHTML — zero string manipulation.
 */
/**
 * Build a Sefaria-compatible ref slug for a book name.
 * Spaces → underscores so "I Samuel" becomes "I_Samuel" in the URL.
 * Sefaria accepts both spaces (URL-encoded) and underscores; underscores are safer.
 */
function sefariaSlug(englishName: string): string {
  return englishName.replace(/ /g, '_');
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  refHebrew: string;   // display ref in Hebrew (from Sefaria)
  book: string;        // english book name for navigation
  chapter: number;
  verse: number;
  heText: string;      // Hebrew snippet, cantillation stripped
}

/** Parse a Sefaria ref string like "Genesis 1:1" or "I Samuel 3:4" */
function parseSefariaRef(ref: string): { book: string; chapter: number; verse: number } | null {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const [, bookName, ch, v] = m;
  const found = TANACH_BOOKS.find(b => b.english === bookName);
  if (!found) return null;
  return { book: bookName, chapter: Number(ch), verse: Number(v) };
}

function stripHtmlTags(html: string): string {
  const el = document.createElement('span');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/[\u0591-\u05AF]/g, '').trim();
}

/**
 * Search Tanach via Sefaria full-text search.
 * Returns up to 8 results with ref, book, chapter, verse, and a Hebrew snippet.
 */
export async function searchTanach(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    query,
    type: 'text',
    field: 'he',
    size: '8',
    slop: '5',
    'filters[]': 'Tanakh',
  });
  try {
    const res = await fetch(`https://www.sefaria.org/api/search-wrapper?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const hits: any[] = data?.hits?.hits ?? [];
    return hits.flatMap(h => {
      const src = h._source ?? {};
      const ref: string  = src.ref ?? '';
      const heRaw: string = src.he ?? src.exact ?? '';
      const parsed = parseSefariaRef(ref);
      if (!parsed) return [];
      // Prefer the Hebrew ref Sefaria provides; fall back to the English ref
      const refHebrew: string = src.heRef ?? ref;
      const heText = stripHtmlTags(heRaw).slice(0, 120);
      return [{ refHebrew, ...parsed, heText }];
    });
  } catch {
    return [];
  }
}

export async function getRashiSegments(
  englishName: string,
  chapter: number,
  verse: number,
): Promise<string[]> {
  const ref = `Rashi_on_${sefariaSlug(englishName)}`;
  const url = `https://www.sefaria.org/api/texts/${ref}.${chapter}.${verse}?lang=he&context=0`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: SefariaTextResponse = await res.json();
    return flattenRaw(data.he).filter(s => s.length > 0);
  } catch {
    return [];
  }
}
