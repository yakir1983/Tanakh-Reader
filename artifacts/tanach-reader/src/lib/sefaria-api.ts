// Sefaria API client

interface SefariaIndexResponse {
  schema: {
    lengths?: number[];
    length?: number;
  };
}

interface SefariaTextResponse {
  he: string | string[];
  text: string | string[];
}

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

// Strip Hebrew cantillation marks (taamei mikra, U+0591–U+05AF)
// Keep nikud (vowel points U+05B0–U+05C7) for correct reading
function stripCantillation(text: string): string {
  // U+0591–U+05AF are cantillation marks (trope)
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0591-\u05AF]/g, '');
}

// Extract first non-empty string from array or string
function extractText(data: string | string[]): string {
  if (Array.isArray(data)) {
    const nonEmpty = data.find(s => s && s.trim());
    return nonEmpty ? stripCantillation(stripHtml(nonEmpty)) : '';
  }
  return stripCantillation(stripHtml(data || ''));
}

export async function getBookIndex(englishName: string): Promise<number[]> {
  const response = await fetch(`https://www.sefaria.org/api/index/${englishName}`);
  if (!response.ok) throw new Error(`Failed to fetch book index for ${englishName}`);
  
  const data: SefariaIndexResponse = await response.json();
  
  // Return verse counts per chapter
  if (data.schema.lengths) {
    return data.schema.lengths;
  }
  
  // Fallback: if only total length, return single chapter
  if (data.schema.length) {
    return [data.schema.length];
  }
  
  return [];
}

export async function getVerseText(englishName: string, chapter: number, verse: number): Promise<string> {
  const url = `https://www.sefaria.org/api/texts/${englishName}.${chapter}.${verse}?lang=he`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch verse ${englishName} ${chapter}:${verse}`);
  
  const data: SefariaTextResponse = await response.json();
  return extractText(data.he);
}

export async function getRashiCommentary(englishName: string, chapter: number, verse: number): Promise<string | null> {
  const url = `https://www.sefaria.org/api/texts/Rashi_on_${englishName}.${chapter}.${verse}?lang=he`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data: SefariaTextResponse = await response.json();
    const text = extractText(data.he);
    
    return text || null;
  } catch {
    return null;
  }
}
