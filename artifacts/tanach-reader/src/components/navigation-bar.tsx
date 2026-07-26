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

/** Small ◀ ▶ stepper — no dialog, works perfectly on mobile */
function Stepper({
  label,
  value,
  max,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
  testId?: string;
}) {
  const btnCls =
    'w-10 h-10 flex items-center justify-center rounded-lg border border-border ' +
    'bg-card text-primary text-lg font-bold select-none ' +
    'hover:bg-primary hover:text-primary-foreground active:scale-95 ' +
    'transition-all disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col items-center gap-1" dir="rtl" data-testid={testId}>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {/* Right arrow = previous (RTL) */}
        <button
          className={btnCls}
          disabled={value <= 1}
          onClick={() => onChange(value - 1)}
          aria-label={`${label} קודם`}
        >
          ›
        </button>
        <span
          className="min-w-[3.5rem] text-center text-lg font-semibold"
          style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
        >
          {toHebrewNumeral(value)}
        </span>
        {/* Left arrow = next (RTL) */}
        <button
          className={btnCls}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`${label} הבא`}
        >
          ‹
        </button>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col items-center gap-5 w-full max-w-3xl mx-auto px-4">

      {/* Book — native select (works fine, no dialog issue) */}
      <div className="relative w-full max-w-xs">
        <select
          dir="rtl"
          data-testid="select-book"
          value={selectedBook}
          onChange={e => onBookChange(e.target.value)}
          className={[
            'w-full h-12 px-4 rounded-xl border border-border',
            'bg-card text-foreground text-lg text-right',
            'appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
            'transition-colors hover:bg-accent/30',
          ].join(' ')}
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
        {/* Chevron */}
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">▾</span>
      </div>

      {/* Chapter + Verse steppers side-by-side */}
      <div className="flex items-start justify-center gap-10" dir="rtl">
        <Stepper
          label="פרק"
          value={selectedChapter}
          max={chapterCount || 1}
          onChange={onChapterChange}
          testId="stepper-chapter"
        />
        <Stepper
          label="פסוק"
          value={selectedVerse}
          max={verseCount || 1}
          onChange={onVerseChange}
          testId="stepper-verse"
        />
      </div>

    </div>
  );
}
