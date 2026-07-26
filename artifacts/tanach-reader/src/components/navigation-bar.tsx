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

const torah   = TANACH_BOOKS.filter(b => b.section === 'Torah');
const neviim  = TANACH_BOOKS.filter(b => b.section === "Nevi'im");
const ketuvim = TANACH_BOOKS.filter(b => b.section === 'Ketuvim');

const selectCls = [
  'w-full h-12 px-4 pe-8 rounded-xl',
  'border border-border bg-card text-foreground text-lg',
  'text-right appearance-none cursor-pointer',
  'focus:outline-none focus:ring-2 focus:ring-primary/40',
  'hover:bg-accent/20 transition-colors',
  'disabled:opacity-40 disabled:cursor-not-allowed',
].join(' ');

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
  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto px-4" dir="rtl">

      {/* ── ספר ── */}
      <div className="relative">
        <select
          dir="rtl"
          data-testid="select-book"
          value={selectedBook}
          onChange={e => onBookChange(e.target.value)}
          className={selectCls}
        >
          <optgroup label="תורה">
            {torah.map(b => <option key={b.english} value={b.english}>{b.hebrew}</option>)}
          </optgroup>
          <optgroup label="נביאים">
            {neviim.map(b => <option key={b.english} value={b.english}>{b.hebrew}</option>)}
          </optgroup>
          <optgroup label="כתובים">
            {ketuvim.map(b => <option key={b.english} value={b.english}>{b.hebrew}</option>)}
          </optgroup>
        </select>
        <Chevron />
      </div>

      {/* ── פרק ── */}
      <div className="relative">
        <select
          dir="rtl"
          data-testid="select-chapter"
          value={selectedChapter}
          disabled={chapterCount === 0}
          onChange={e => onChapterChange(Number(e.target.value))}
          className={selectCls}
        >
          {Array.from({ length: chapterCount }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>פרק {toHebrewNumeral(n)}</option>
          ))}
        </select>
        <Chevron />
      </div>

      {/* ── פסוק ── */}
      <div className="relative">
        <select
          dir="rtl"
          data-testid="select-verse"
          value={selectedVerse}
          disabled={verseCount === 0}
          onChange={e => onVerseChange(Number(e.target.value))}
          className={selectCls}
        >
          {Array.from({ length: verseCount }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>פסוק {toHebrewNumeral(n)}</option>
          ))}
        </select>
        <Chevron />
      </div>

    </div>
  );
}

function Chevron() {
  return (
    <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
      ▾
    </span>
  );
}
