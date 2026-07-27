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
