import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, AArrowUp, AArrowDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { NavigationBar } from '@/components/navigation-bar';
import { VoiceSearchButton } from '@/components/voice-search-button';
import { VerseDisplay } from '@/components/verse-display';
import { RashiCommentary } from '@/components/rashi-commentary';
import { getBookIndex, getVerseText, getRashiCommentary } from '@/lib/sefaria-api';
import { getBookByEnglish, getBookByHebrew } from '@/lib/tanach-data';

const FONT_SIZE_MIN = 2.5;
const FONT_SIZE_MAX = 8;
const FONT_SIZE_STEP = 0.5;
const FONT_SIZE_DEFAULT = 5;

export default function Home() {
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);

  // Sync dark mode class on document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const { data: bookIndex } = useQuery({
    queryKey: ['book-index', selectedBook],
    queryFn: () => getBookIndex(selectedBook),
    enabled: !!selectedBook,
    staleTime: Infinity,
  });

  const chapterCount = bookIndex?.length || 0;
  const verseCount = selectedChapter && bookIndex ? bookIndex[selectedChapter - 1] || 0 : 0;

  const { data: verseText, isLoading: isLoadingVerse } = useQuery({
    queryKey: ['verse', selectedBook, selectedChapter, selectedVerse],
    queryFn: () => getVerseText(selectedBook, selectedChapter, selectedVerse),
    enabled: !!selectedBook && !!selectedChapter && !!selectedVerse,
  });

  const { data: rashiText, isLoading: isLoadingRashi } = useQuery({
    queryKey: ['rashi', selectedBook, selectedChapter, selectedVerse],
    queryFn: () => getRashiCommentary(selectedBook, selectedChapter, selectedVerse),
    enabled: !!selectedBook && !!selectedChapter && !!selectedVerse,
  });

  useEffect(() => {
    setSelectedChapter(1);
    setSelectedVerse(1);
  }, [selectedBook]);

  useEffect(() => {
    setSelectedVerse(1);
  }, [selectedChapter]);

  const handleVoiceReference = (book?: string, chapter?: number, verse?: number) => {
    if (book) {
      const matchedBook = getBookByHebrew(book);
      if (matchedBook) setSelectedBook(matchedBook.english);
    }
    if (chapter && chapter >= 1 && chapter <= chapterCount) setSelectedChapter(chapter);
    if (verse && verse >= 1 && verse <= verseCount) setSelectedVerse(verse);
  };

  // Navigate to next verse (wrap to next chapter if needed)
  const goNext = () => {
    if (verseCount === 0) return;
    if (selectedVerse < verseCount) {
      setSelectedVerse(v => v + 1);
    } else if (selectedChapter < chapterCount) {
      setSelectedChapter(c => c + 1);
      setSelectedVerse(1);
    }
  };

  // Navigate to previous verse (wrap to previous chapter if needed)
  const goPrev = () => {
    if (selectedVerse > 1) {
      setSelectedVerse(v => v - 1);
    } else if (selectedChapter > 1) {
      const prevChapterVerses = bookIndex ? bookIndex[selectedChapter - 2] || 1 : 1;
      setSelectedChapter(c => c - 1);
      setSelectedVerse(prevChapterVerses);
    }
  };

  const isAtStart = selectedChapter === 1 && selectedVerse === 1;
  const isAtEnd = selectedChapter === chapterCount && selectedVerse === verseCount;

  const currentBook = getBookByEnglish(selectedBook);
  const increaseFontSize = () => setFontSize(f => Math.min(f + FONT_SIZE_STEP, FONT_SIZE_MAX));
  const decreaseFontSize = () => setFontSize(f => Math.max(f - FONT_SIZE_STEP, FONT_SIZE_MIN));

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <div className="container mx-auto py-8 sm:py-12 space-y-10">

        {/* Header */}
        <header className="text-center space-y-2">
          <h1
            className="text-4xl sm:text-5xl font-bold text-primary"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
            dir="rtl"
          >
            קורא תנ״ך ורש״י
          </h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            לימוד התנ״ך עם פירוש רש״י
          </p>

          {/* Controls row */}
          <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
            <button
              onClick={decreaseFontSize}
              disabled={fontSize <= FONT_SIZE_MIN}
              data-testid="button-font-decrease"
              title="הקטן פונט"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <AArrowDown className="w-4 h-4" />
              <span>A</span>
            </button>

            <button
              onClick={increaseFontSize}
              disabled={fontSize >= FONT_SIZE_MAX}
              data-testid="button-font-increase"
              title="הגדל פונט"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <AArrowUp className="w-4 h-4" />
              <span>A</span>
            </button>

            <div className="w-px h-5 bg-border" />

            <button
              onClick={() => setIsDark(d => !d)}
              data-testid="button-dark-mode-toggle"
              title={isDark ? 'מצב יום' : 'מצב לילה'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {isDark
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
              <span dir="rtl">{isDark ? 'יום' : 'לילה'}</span>
            </button>
          </div>
        </header>

        {/* Navigation dropdowns */}
        <NavigationBar
          selectedBook={selectedBook}
          selectedChapter={selectedChapter}
          selectedVerse={selectedVerse}
          chapterCount={chapterCount}
          verseCount={verseCount}
          onBookChange={setSelectedBook}
          onChapterChange={setSelectedChapter}
          onVerseChange={setSelectedVerse}
        />

        {/* Voice search button */}
        <div className="flex justify-center py-4">
          <VoiceSearchButton onReferenceDetected={handleVoiceReference} />
        </div>

        {/* Verse display with prev/next arrows */}
        <div className="relative">
          {/* Prev arrow (RTL: right side = previous) */}
          <button
            onClick={goPrev}
            disabled={isAtStart}
            data-testid="button-prev-verse"
            title="פסוק קודם"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full border-2 border-primary/40 bg-card text-primary flex items-center justify-center transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Next arrow (RTL: left side = next) */}
          <button
            onClick={goNext}
            disabled={isAtEnd}
            data-testid="button-next-verse"
            title="פסוק הבא"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full border-2 border-primary/40 bg-card text-primary flex items-center justify-center transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <VerseDisplay
            bookHebrew={currentBook?.hebrew || ''}
            chapter={selectedChapter}
            verse={selectedVerse}
            verseText={verseText || ''}
            isLoading={isLoadingVerse}
            fontSize={fontSize}
          />
        </div>

        {/* Rashi commentary */}
        {!isLoadingVerse && (
          <RashiCommentary
            commentary={rashiText}
            isLoading={isLoadingRashi}
          />
        )}
      </div>
    </div>
  );
}
