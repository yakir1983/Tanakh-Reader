/**
 * Identifies Biblical Aramaic sections in Tanach.
 *
 * Known Aramaic passages:
 *   Daniel  2:4b – 7:28   (chapters 3–6 entirely; 2:4 onward; 7:1–28)
 *   Ezra    4:8 – 6:18    (diplomatic correspondence)
 *   Ezra    7:12 – 7:26   (Artaxerxes' decree)
 *
 * Other isolated Aramaic words (Jer 10:11, Gen 31:47) are single verses and
 * not worth flagging for automatic translation.
 */
export function isAramaicVerse(book: string, chapter: number, verse: number): boolean {
  if (book === 'Daniel') {
    if (chapter === 2 && verse >= 4) return true;
    if (chapter >= 3 && chapter <= 6)  return true;
    if (chapter === 7 && verse <= 28)  return true;
    return false;
  }

  if (book === 'Ezra') {
    if (chapter === 4 && verse >= 8)                        return true;
    if (chapter === 5)                                       return true;
    if (chapter === 6 && verse <= 18)                       return true;
    if (chapter === 7 && verse >= 12 && verse <= 26)        return true;
    return false;
  }

  return false;
}
