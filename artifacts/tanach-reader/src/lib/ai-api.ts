/**
 * Client-side helpers for the AI API endpoints.
 */

export async function fetchVerseTranslation(
  book: string,
  chapter: number,
  verse: number,
  verseText: string,
): Promise<string> {
  const res = await fetch('/api/ai/translate-verse', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, verse, verseText }),
  });
  if (!res.ok) throw new Error(`Translation request failed: ${res.status}`);
  const data = await res.json();
  return data.translation as string;
}

export async function fetchPsalmExplanation(
  psalmNumber: number,
  psalmText: string,
): Promise<string> {
  const res = await fetch('/api/ai/explain-psalm', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ psalmNumber, psalmText }),
  });
  if (!res.ok) throw new Error(`Psalm explanation failed: ${res.status}`);
  const data = await res.json();
  return data.explanation as string;
}

export async function fetchVerseExplanation(
  book: string,
  chapter: number,
  verse: number,
  verseText: string,
): Promise<string> {
  const res = await fetch('/api/ai/explain-verse', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, verse, verseText }),
  });
  if (!res.ok) throw new Error(`Explanation request failed: ${res.status}`);
  const data = await res.json();
  return data.explanation as string;
}
