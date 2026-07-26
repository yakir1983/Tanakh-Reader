import { useMemo } from 'react';
import { CustomSelect } from '@/components/custom-select';
import { TANACH_BOOKS } from '@/lib/tanach-data';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';

interface NavigationBarProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVerse: number;
  chapterCount: number;
  verseCount: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  onVerseChange: (verse: number) => void;
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
}: NavigationBarProps) {
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
      <CustomSelect
        testId="select-book"
        value={selectedBook}
        groups={bookGroups}
        onChange={onBookChange}
      />
      <CustomSelect
        testId="select-chapter"
        value={String(selectedChapter)}
        options={chapterOptions}
        disabled={chapterCount === 0}
        onChange={v => onChapterChange(Number(v))}
      />
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
