import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, AArrowUp, AArrowDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { NavigationBar } from '@/components/navigation-bar';
import { VoiceSearchButton } from '@/components/voice-search-button';
import { VerseDisplay } from '@/components/verse-display';
import { RashiCommentary } from '@/components/rashi-commentary';
import { getBookIndex, getChapterVerses, getRashiSegments } from '@/lib/sefaria-api';
import { getBookByEnglish } from '@/lib/tanach-data';
import type { TanachBook } from '@/lib/tanach-data';

const FONT_SIZE_MIN     = 2.5;
const FONT_SIZE_MAX     = 8;
const FONT_SIZE_STEP    = 0.5;
const FONT_SIZE_DEFAULT = 5;

export default function Home() {
  const [book,     setBook]     = useState('Genesis');
  const [chapter,  setChapter]  = useState(1);
  const [verse,    setVerse]    = useState(1);
  const [isDark,   setIsDark]   = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);

  // ── Dark mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // ── Book structure ────────────────────────────────────────────────────────
  const { data: bookIndex } = useQuery({
    queryKey:  ['index', book],
    queryFn:   () => getBookIndex(book),
    staleTime: Infinity,
  });

  const chapterCount = bookIndex?.length ?? 0;
  const verseCount   = bookIndex?.[chapter - 1] ?? 0;

  // ── Chapter text (all verses in one fetch, indexed client-side) ──────────
  const { data: chapterVerses, isLoading: loadingChapter } = useQuery({
    queryKey: ['chapter', book, chapter],
    queryFn:  () => getChapterVerses(book, chapter),
    enabled:  chapterCount > 0,
    staleTime: Infinity,
  });

  const verseText    = chapterVerses?.[verse - 1] ?? '';
  const loadingVerse = loadingChapter && !chapterVerses;

  // ── Rashi ─────────────────────────────────────────────────────────────────
  const { data: rashiSegments, isLoading: loadingRashi } = useQuery({
    queryKey: ['rashi', book, chapter, verse],
    queryFn:  () => getRashiSegments(book, chapter, verse),
    enabled:  chapterCount > 0,
    staleTime: Infinity,
  });

  // ── Navigation handlers (batched — one render, one query) ─────────────────
  const handleBook = useCallback((b: string) => {
    setBook(b); setChapter(1); setVerse(1);
  }, []);

  const handleChapter = useCallback((c: number) => {
    setChapter(c); setVerse(1);
  }, []);

  const handleVerse = useCallback((v: number) => {
    setVerse(v);
  }, []);

  const handleParasha = useCallback((eng: string, c: number, v: number) => {
    setBook(eng); setChapter(c); setVerse(v);
  }, []);

  const goPrev = () => {
    if (verse > 1) { setVerse(v => v - 1); }
    else if (chapter > 1) { setChapter(c => c - 1); setVerse(bookIndex?.[chapter - 2] ?? 1); }
  };

  const goNext = () => {
    if (verse < verseCount)          { setVerse(v => v + 1); }
    else if (chapter < chapterCount) { setChapter(c => c + 1); setVerse(1); }
  };

  const isAtStart = chapter === 1 && verse === 1;
  const isAtEnd   = chapter === chapterCount && verse === verseCount;

  // ── Voice search callback ─────────────────────────────────────────────────
  // All three setters are called together → React 18 batches into one render.
  // The queries react to the new [book, chapter, verse] key immediately.
  const handleVoice = useCallback(
    (b?: TanachBook, c?: number, v?: number) => {
      const newBook    = b?.english;
      const newChapter = (c && c >= 1) ? c : 1;
      const newVerse   = (v && v >= 1) ? v : 1;

      if (newBook) {
        // New book found — reset all three at once
        setBook(newBook);
        setChapter(newChapter);
        setVerse(newVerse);
      } else {
        // Only chapter / verse mentioned — update within current book
        if (c && c >= 1) { setChapter(c); setVerse(newVerse); }
        else if (v && v >= 1) setVerse(v);
      }
    },
    [], // no external deps — setters are stable references
  );

  const currentBook = getBookByEnglish(book);

  const ctrlBtn = () => [
    'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors',
    'border-border bg-card text-foreground hover:bg-accent/60',
    'disabled:opacity-30 disabled:cursor-not-allowed',
  ].join(' ');

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto py-8 sm:py-10 space-y-8 max-w-3xl px-4">

        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="text-center space-y-2">
          <h1
            className="text-4xl sm:text-5xl font-bold text-primary"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
            dir="rtl"
          >
            קורא תנ״ך ורש״י
          </h1>
          <p className="text-sm text-muted-foreground" dir="rtl">לימוד התנ״ך עם פירוש רש״י</p>

          {/* Controls — font size + dark mode only */}
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            <button onClick={() => setFontSize(f => Math.max(f - FONT_SIZE_STEP, FONT_SIZE_MIN))}
              disabled={fontSize <= FONT_SIZE_MIN} data-testid="button-font-decrease"
              className={ctrlBtn()}>
              <AArrowDown className="w-4 h-4" /><span>A</span>
            </button>
            <button onClick={() => setFontSize(f => Math.min(f + FONT_SIZE_STEP, FONT_SIZE_MAX))}
              disabled={fontSize >= FONT_SIZE_MAX} data-testid="button-font-increase"
              className={ctrlBtn()}>
              <AArrowUp className="w-4 h-4" /><span>A</span>
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button onClick={() => setIsDark(d => !d)} data-testid="button-dark-mode-toggle"
              className={ctrlBtn()}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span dir="rtl">{isDark ? 'יום' : 'לילה'}</span>
            </button>
          </div>
        </header>

        {/* ── Dropdowns ───────────────────────────────────────────── */}
        <NavigationBar
          selectedBook={book}
          selectedChapter={chapter}
          selectedVerse={verse}
          chapterCount={chapterCount}
          verseCount={verseCount}
          onBookChange={handleBook}
          onChapterChange={handleChapter}
          onVerseChange={handleVerse}
          onParashaChange={handleParasha}
        />

        {/* ── Microphone ───────────────────────────────────────────── */}
        <div className="flex justify-center">
          <VoiceSearchButton onReferenceDetected={handleVoice} />
        </div>

        {/* ── Verse ───────────────────────────────────────────────── */}
        <VerseDisplay
          bookHebrew={currentBook?.hebrew ?? ''}
          chapter={chapter}
          verse={verse}
          verseText={verseText}
          isLoading={loadingVerse}
          fontSize={fontSize}
        />

        {/* ── Rashi ───────────────────────────────────────────────── */}
        <RashiCommentary
          segments={rashiSegments ?? []}
          isLoading={loadingRashi}
        />

        {/* ── Prev / Next ──────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 pb-16" dir="rtl">
          <button onClick={goPrev} disabled={isAtStart} data-testid="button-prev-verse"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary/40 bg-card text-primary font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed active:scale-95">
            <ChevronRight className="w-5 h-5" /><span>פסוק קודם</span>
          </button>
          <button onClick={goNext} disabled={isAtEnd} data-testid="button-next-verse"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary/40 bg-card text-primary font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed active:scale-95">
            <span>פסוק הבא</span><ChevronLeft className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
