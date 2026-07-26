import { useMemo } from 'react';
import { CustomSelect } from '@/components/custom-select';
import { TANACH_BOOKS } from '@/lib/tanach-data';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';
import { getParashiyot } from '@/lib/parashiyot';

interface NavigationBarProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  chapterCount: number;
  verseCount: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  onVerseChange: (verse: number) => void;
  /** Called when user picks a parasha; sets both chapter and verse at once. */
  onParashaChange: (chapter: number, verse: number) => void;
}

const bookGroups = [
  { label: 'תורה',    options: TANACH_BOOKS.filter(b => b.section === 'Torah').map(b => ({ value: b.english, label: b.hebrew })) },
  { label: 'נביאים', options: TANACH_BOOKS.filter(b => b.section === "Nevi'im").map(b => ({ value: b.english, label: b.hebrew })) },
  { label: 'כתובים', options: TANACH_BOOKS.filter(b => b.section === 'Ketuvim').map(b => ({ value: b.english, label: b.hebrew })) },
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
  // ── Parashiyot (Torah only) ──────────────────────────────────────────────
  const parashiyot = useMemo(() => getParashiyot(selectedBook), [selectedBook]);

  const parashaOptions = useMemo(() => {
    if (!parashiyot) return null;
    return parashiyot.map((p, i) => ({
      value: String(i),
      label: p.hebrew,
    }));
  }, [parashiyot]);

  // Determine which parasha is currently active (last one whose chapter ≤ selectedChapter)
  const activeParashaIndex = useMemo(() => {
    if (!parashiyot) return null;
    let best = 0;
    for (let i = 0; i < parashiyot.length; i++) {
      if (parashiyot[i].chapter <= selectedChapter) best = i;
      else break;
    }
    return best;
  }, [parashiyot, selectedChapter]);

  // ── Chapter / verse options ──────────────────────────────────────────────
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
      {/* Book + Parasha row */}
      <div className="flex gap-2" dir="rtl">
        <div className={parashaOptions ? 'flex-1 min-w-0' : 'w-full'}>
          <CustomSelect
            testId="select-book"
            value={selectedBook}
            groups={bookGroups}
            onChange={onBookChange}
          />
        </div>

        {/* Parasha (Torah only) — sits next to book in same row */}
        {parashaOptions && activeParashaIndex !== null && (
          <div className="flex-1 min-w-0">
            <CustomSelect
              testId="select-parasha"
              value={String(activeParashaIndex)}
              options={parashaOptions}
              onChange={v => {
                const p = parashiyot![Number(v)];
                if (p) onParashaChange(p.chapter, p.verse);
              }}
            />
          </div>
        )}
      </div>

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
