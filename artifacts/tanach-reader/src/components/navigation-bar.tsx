import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TANACH_BOOKS } from '@/lib/tanach-data';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';

interface NavigationBarProps {
  selectedBook: string | null;
  selectedChapter: number | null;
  selectedVerse: number | null;
  chapterCount: number;
  verseCount: number;
  onBookChange: (book: string) => void;
  onChapterChange: (chapter: number) => void;
  onVerseChange: (verse: number) => void;
}

export function NavigationBar({
  selectedBook,
  selectedChapter,
  selectedVerse,
  chapterCount,
  verseCount,
  onBookChange,
  onChapterChange,
  onVerseChange
}: NavigationBarProps) {
  // Group books by section
  const torah = TANACH_BOOKS.filter(b => b.section === 'Torah');
  const neviim = TANACH_BOOKS.filter(b => b.section === 'Nevi\'im');
  const ketuvim = TANACH_BOOKS.filter(b => b.section === 'Ketuvim');

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-3xl mx-auto px-4">
      {/* Book selector */}
      <div className="w-full sm:w-auto min-w-[200px]">
        <Select value={selectedBook || undefined} onValueChange={onBookChange}>
          <SelectTrigger
            dir="rtl"
            data-testid="select-book"
            className="h-14 text-lg bg-card border-border hover:bg-card/80 transition-colors"
          >
            <SelectValue placeholder="בחר ספר" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            <SelectGroup>
              <SelectLabel className="text-primary font-bold">תורה</SelectLabel>
              {torah.map(book => (
                <SelectItem 
                  key={book.english} 
                  value={book.english}
                  className="text-base cursor-pointer"
                >
                  {book.hebrew}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-primary font-bold">נביאים</SelectLabel>
              {neviim.map(book => (
                <SelectItem 
                  key={book.english} 
                  value={book.english}
                  className="text-base cursor-pointer"
                >
                  {book.hebrew}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-primary font-bold">כתובים</SelectLabel>
              {ketuvim.map(book => (
                <SelectItem 
                  key={book.english} 
                  value={book.english}
                  className="text-base cursor-pointer"
                >
                  {book.hebrew}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Chapter selector */}
      <div className="w-full sm:w-auto min-w-[160px]">
        <Select 
          value={selectedChapter?.toString() || undefined} 
          onValueChange={(v) => onChapterChange(parseInt(v))}
          disabled={!selectedBook || chapterCount === 0}
        >
          <SelectTrigger
            dir="rtl"
            data-testid="select-chapter"
            className="h-14 text-lg bg-card border-border hover:bg-card/80 transition-colors disabled:opacity-50"
          >
            <SelectValue placeholder="פרק" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map(num => (
              <SelectItem 
                key={num} 
                value={num.toString()}
                className="text-base cursor-pointer"
                dir="rtl"
              >
                פרק {toHebrewNumeral(num)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verse selector */}
      <div className="w-full sm:w-auto min-w-[160px]">
        <Select 
          value={selectedVerse?.toString() || undefined} 
          onValueChange={(v) => onVerseChange(parseInt(v))}
          disabled={!selectedChapter || verseCount === 0}
        >
          <SelectTrigger
            dir="rtl"
            data-testid="select-verse"
            className="h-14 text-lg bg-card border-border hover:bg-card/80 transition-colors disabled:opacity-50"
          >
            <SelectValue placeholder="פסוק" />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {Array.from({ length: verseCount }, (_, i) => i + 1).map(num => (
              <SelectItem 
                key={num} 
                value={num.toString()}
                className="text-base cursor-pointer"
                dir="rtl"
              >
                פסוק {toHebrewNumeral(num)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
