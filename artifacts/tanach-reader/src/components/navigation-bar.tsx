import { useMemo } from 'react';
import { CustomSelect } from '@/components/custom-select';
import { TANACH_BOOKS } from '@/lib/tanach-data';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';
import { PARASHIYOT } from '@/lib/parashiyot';

interface NavigationBarProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  chapterCount: number;
  verseCount: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  onVerseChange: (verse: number) => void;
  /** Called when user picks a parasha — includes the book so Torah → Torah navigation works. */
  onParashaChange: (englishBook: string, chapter: number, verse: number) => void;
}

// ── Unified "book / parasha" option values ────────────────────────────────────
// Books:     "b:Genesis"
// Parashiyot: "p:Genesis:0"
const combinedGroups = [
  {
    label: 'תורה',
    options: TANACH_BOOKS
      .filter(b => b.section === 'Torah')
      .map(b => ({ value: `b:${b.english}`, label: b.hebrew })),
  },
  {
    label: 'פרשות השבוע',
    options: Object.entries(PARASHIYOT).flatMap(([bookEng, parshas]) =>
      parshas.map((p, i) => ({ value: `p:${bookEng}:${i}`, label: p.hebrew }))
    ),
  },
  {
    label: 'נביאים',
    options: TANACH_BOOKS
      .filter(b => b.section === "Nevi'im")
      .map(b => ({ value: `b:${b.english}`, label: b.hebrew })),
  },
  {
    label: 'כתובים',
    options: TANACH_BOOKS
      .filter(b => b.section === 'Ketuvim')
      .map(b => ({ value: `b:${b.english}`, label: b.hebrew })),
  },
];

export function NavigationBar({
  selectedBook,
  selectedChapter,
  selectedVerse,
  chapterCount,
  verseCount,
  onBookChange,
  onChapterChange,
  onVerseChange,
  onParashaChange,
}: NavigationBarProps) {
  // Determine which parasha is active (for Torah books)
  const parashiyot = PARASHIYOT[selectedBook] ?? null;
  const activeParashaIndex = useMemo(() => {
    if (!parashiyot) return null;
    let best = 0;
    for (let i = 0; i < parashiyot.length; i++) {
      if (parashiyot[i].chapter <= selectedChapter) best = i;
      else break;
    }
    return best;
  }, [parashiyot, selectedChapter]);

  // Current value for the combined selector
  const combinedValue = useMemo(() => {
    if (parashiyot && activeParashaIndex !== null) {
      return `p:${selectedBook}:${activeParashaIndex}`;
    }
    return `b:${selectedBook}`;
  }, [parashiyot, selectedBook, activeParashaIndex]);

  // Handle combined selection
  const handleCombined = (v: string) => {
    if (v.startsWith('b:')) {
      onBookChange(v.slice(2));
    } else {
      // p:BookEnglish:Index
      const [, bookEng, idxStr] = v.split(':');
      const p = PARASHIYOT[bookEng]?.[Number(idxStr)];
      if (p) onParashaChange(bookEng, p.chapter, p.verse);
    }
  };

  // Chapter / verse options
  const chapterOptions = useMemo(
    () => Array.from({ length: chapterCount }, (_, i) => ({
      value: String(i + 1),
      label: `פרק ${toHebrewNumeral(i + 1)}`,
    })),
    [chapterCount],
  );

  const verseOptions = useMemo(
    () => Array.from({ length: verseCount }, (_, i) => ({
      value: String(i + 1),
      label: `פסוק ${toHebrewNumeral(i + 1)}`,
    })),
    [verseCount],
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto px-4">
      {/* Unified book + parasha selector */}
      <CustomSelect
        testId="select-book"
        value={combinedValue}
        groups={combinedGroups}
        onChange={handleCombined}
      />

      {/* Chapter */}
      <CustomSelect
        testId="select-chapter"
        value={String(selectedChapter)}
        options={chapterOptions}
        disabled={chapterCount === 0}
        onChange={v => onChapterChange(Number(v))}
      />

      {/* Verse */}
      <CustomSelect
        testId="select-verse"
        value={String(selectedVerse)}
        options={verseOptions}
        disabled={verseCount === 0}
        onChange={v => onVerseChange(Number(v))}
      />
    </div>
  );
}
