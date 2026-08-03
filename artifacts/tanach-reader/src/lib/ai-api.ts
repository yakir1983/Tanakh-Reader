/**
 * Client-side helpers for the AI API endpoints.
 * Extracts the Hebrew error message from 429 rate-limit responses.
 */
import { getApiBase, fetchWithRetry } from './api-base';

async function handleResponse(res: Response): Promise<any> {
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'הגעת למכסת השאלות. נסה שוב מאוחר יותר.');
  }
  if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
  return res.json();
}

export async function fetchVerseTranslation(
  book: string,
  chapter: number,
  verse: number,
  verseText: string,
): Promise<string> {
  const res = await fetchWithRetry(`${getApiBase()}/api/ai/translate-verse`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, verse, verseText }),
  });
  const data = await handleResponse(res);
  return data.translation as string;
}

export async function fetchPsalmExplanation(
  psalmNumber: number,
  psalmText: string,
): Promise<string> {
  const res = await fetchWithRetry(`${getApiBase()}/api/ai/explain-psalm`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ psalmNumber, psalmText }),
  });
  const data = await handleResponse(res);
  return data.explanation as string;
}

export async function fetchVerseExplanation(
  book: string,
  chapter: number,
  verse: number,
  verseText: string,
): Promise<string> {
  const res = await fetchWithRetry(`${getApiBase()}/api/ai/explain-verse`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, verse, verseText }),
  });
  const data = await handleResponse(res);
  return data.explanation as string;
}
