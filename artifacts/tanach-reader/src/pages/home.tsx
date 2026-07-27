import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, ChevronRight, ChevronLeft, AlertCircle, Home as HomeIcon } from 'lucide-react';
import { useGestures } from '@/hooks/use-gestures';
import { NavigationBar } from '@/components/navigation-bar';
import { VoiceSearchButton } from '@/components/voice-search-button';
import { VerseDisplay } from '@/components/verse-display';
import { RashiCommentary } from '@/components/rashi-commentary';
import { getBookIndex, getChapterVerses, getRashiSegments } from '@/lib/sefaria-api';
import { fetchVerseTranslation, fetchVerseExplanation } from '@/lib/ai-api';
import { isAramaicVerse } from '@/lib/aramaic-ranges';
import { getBookByEnglish } from '@/lib/tanach-data';
import { AramaicTranslation } from '@/components/aramaic-translation';
import type { TanachBook } from '@/lib/tanach-data';
const FONT_SIZE_MIN     = 2.5;
const FONT_SIZE_MAX     = 8;
const FONT_SIZE_STEP    = 0.5;
const FONT_SIZE_DEFAULT = 5;

export default function Home() {
  const [book,      setBook]      = useState(() => localStorage.getItem('tanach_book')    ?? 'Genesis');
  const [chapter,   setChapter]   = useState(() => Number(localStorage.getItem('tanach_chapter')) || 1);
  const [verse,     setVerse]     = useState(() => Number(localStorage.getItem('tanach_verse'))   || 1);
  const [isDark,    setIsDark]    = useState(() => {
    const saved = localStorage.getItem('tanach_dark') === 'true';
    // Apply synchronously before first paint — prevents FOUC / black flash
    document.documentElement.classList.toggle('dark', saved);
    return saved;
  });
  const [fontSize,  setFontSize]  = useState(FONT_SIZE_DEFAULT);
  const [aiAnswer,  setAiAnswer]  = useState('');
  const [navError,  setNavError]  = useState('');
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // ── Persist position to localStorage ─────────────────────────────────────
  useEffect(() => { localStorage.setItem('tanach_book',    book);           }, [book]);
  useEffect(() => { localStorage.setItem('tanach_chapter', String(chapter)); }, [chapter]);
  useEffect(() => { localStorage.setItem('tanach_verse',   String(verse));   }, [verse]);

  // ── Dark mode (persisted) ────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tanach_dark', String(isDark));
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

  // ── Aramaic auto-translation ───────────────────────────────────────────────
  const needsTranslation = isAramaicVerse(book, chapter, verse);
  const { data: aramaicTranslation, isLoading: loadingTranslation } = useQuery({
    queryKey: ['translation', book, chapter, verse],
    queryFn:  () => fetchVerseTranslation(book, chapter, verse, verseText),
    enabled:  needsTranslation && verseText.length > 0,
    staleTime: Infinity,
  });

  // ── Plain-language explanation (all verses, including Aramaic) ───────────
  const { data: verseExplanation, isLoading: loadingExplanation } = useQuery({
    queryKey: ['explanation', book, chapter, verse],
    queryFn:  () => fetchVerseExplanation(book, chapter, verse, verseText),
    enabled:  verseText.length > 0,
    staleTime: Infinity,
  });

  // ── Error toast helper ────────────────────────────────────────────────────
  const showNavError = useCallback((msg: string) => {
    setNavError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setNavError(''), 5000);
  }, []);

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

  const goPrev = useCallback(() => {
    if (verse > 1) { setVerse(v => v - 1); }
    else if (chapter > 1) { setChapter(c => c - 1); setVerse(bookIndex?.[chapter - 2] ?? 1); }
  }, [verse, chapter, bookIndex]);

  const goNext = useCallback(() => {
    if (verse < verseCount)          { setVerse(v => v + 1); }
    else if (chapter < chapterCount) { setChapter(c => c + 1); setVerse(1); }
  }, [verse, verseCount, chapter, chapterCount]);

  const isAtStart = chapter === 1 && verse === 1;
  const isAtEnd   = chapter === chapterCount && verse === verseCount;

  // ── Voice search callback ─────────────────────────────────────────────────
  // Validates chapter/verse against the book index before navigating.
  const handleVoice = useCallback(
    async (b?: TanachBook, c?: number, v?: number) => {
      const targetBook    = b?.english ?? book;
      const targetBookHeb = getBookByEnglish(targetBook)?.hebrew ?? targetBook;
      const newChapter    = (c && c >= 1) ? c : 1;
      const newVerse      = (v && v >= 1) ? v : 1;

      // Fetch (or reuse cached) book structure for the target book
      let index: number[];
      try {
        index = await queryClient.fetchQuery({
          queryKey: ['index', targetBook],
          queryFn:  () => getBookIndex(targetBook),
          staleTime: Infinity,
        });
      } catch {
        // If we can't fetch the index, navigate anyway (network issue, not a user error)
        index = [];
      }

      // Validate chapter
      if (index.length > 0 && (newChapter < 1 || newChapter > index.length)) {
        showNavError(
          `אין פרק ${newChapter} בספר ${targetBookHeb} — בספר זה יש ${index.length} פרקים`,
        );
        return;
      }

      // Validate verse (only when a specific verse was requested)
      const maxVerse = index[newChapter - 1] ?? 0;
      if (v && v >= 1 && index.length > 0 && maxVerse > 0 && v > maxVerse) {
        showNavError(
          `אין פסוק ${v} בפרק ${newChapter} — בפרק זה יש ${maxVerse} פסוקים`,
        );
        return;
      }

      // All valid — navigate
      if (b?.english) {
        setBook(b.english);
        setChapter(newChapter);
        setVerse(newVerse);
      } else {
        if (c && c >= 1) { setChapter(c); setVerse(newVerse); }
        else if (v && v >= 1) setVerse(v);
      }
    },
    [book, queryClient, showNavError],
  );

  // ── Home reset ────────────────────────────────────────────────────────────
  const goHome = useCallback(() => {
    localStorage.removeItem('tanach_book');
    localStorage.removeItem('tanach_chapter');
    localStorage.removeItem('tanach_verse');
    setBook('Genesis');
    setChapter(1);
    setVerse(1);
    setAiAnswer('');
    setNavError('');
  }, []);

  const currentBook = getBookByEnglish(book);

  // ── Touch gestures (swipe only) ──────────────────────────────────────────
  const gestureRef = useGestures<HTMLDivElement>({
    onSwipeRight: () => { if (!isAtStart) goPrev(); },
    onSwipeLeft:  () => { if (!isAtEnd)   goNext(); },
  });

  const ctrlBtn = () => [
    'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors',
    'border-border bg-card text-foreground hover:bg-accent/60',
    'disabled:opacity-30 disabled:cursor-not-allowed',
  ].join(' ');

  return (
    <div
      ref={gestureRef}
      className="relative min-h-[100dvh] w-full bg-background text-foreground transition-colors duration-300"
    >
      {/* ── בס"ד — פינה ימנית עליונה ────────────────────────────────── */}
      <span
        dir="rtl"
        aria-hidden="true"
        className="bsd-glow fixed top-3 right-4 z-50 select-none pointer-events-none text-primary"
        style={{
          fontFamily: 'Frank Ruhl Libre, serif',
          fontSize: '1.05rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        בס״ד
      </span>
      <div className="container mx-auto py-8 sm:py-10 space-y-8 max-w-3xl px-4">

        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="text-center space-y-2">
          <button
            onClick={goHome}
            data-testid="button-home-logo"
            className="group cursor-pointer bg-transparent border-none p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            title="חזרה לבראשית פרק א׳ פסוק א׳"
            aria-label="חזרה להתחלה"
          >
            <h1
              className="text-4xl sm:text-5xl font-bold text-primary transition-opacity group-hover:opacity-75"
              style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
              dir="rtl"
            >
              קורא תנ״ך ורש״י
            </h1>
          </button>
          <p className="text-sm text-muted-foreground" dir="rtl">לימוד התנ״ך עם פירוש רש״י</p>

          {/* Controls — home + verse font size + dark mode */}
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            <button onClick={goHome} data-testid="button-home"
              className={ctrlBtn()} title="חזרה לבראשית א׳:א׳" aria-label="בית">
              <HomeIcon className="w-4 h-4" />
              <span dir="rtl">בית</span>
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            <button onClick={() => setFontSize(f => Math.max(f - FONT_SIZE_STEP, FONT_SIZE_MIN))}
              disabled={fontSize <= FONT_SIZE_MIN} data-testid="button-font-decrease"
              className={ctrlBtn()}>
              <span className="text-base leading-none" style={{ fontFamily: 'Frank Ruhl Libre, serif' }}>א↓</span>
            </button>
            <button onClick={() => setFontSize(f => Math.min(f + FONT_SIZE_STEP, FONT_SIZE_MAX))}
              disabled={fontSize >= FONT_SIZE_MAX} data-testid="button-font-increase"
              className={ctrlBtn()}>
              <span className="text-base leading-none" style={{ fontFamily: 'Frank Ruhl Libre, serif' }}>א↑</span>
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
        <div className="flex flex-col items-center gap-4">
          <VoiceSearchButton
            onReferenceDetected={(b, c, v) => { setAiAnswer(''); handleVoice(b, c, v); }}
            onAnswer={text => setAiAnswer(text)}
            currentBook={book}
            currentChapter={chapter}
            currentVerse={verse}
            currentVerseText={verseText}
          />

          {/* ── Navigation error toast ──────────────────────────────── */}
          {navError && (
            <div
              dir="rtl"
              role="alert"
              className="flex items-start gap-2 w-full max-w-md rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200"
              style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{navError}</span>
              <button
                onClick={() => setNavError('')}
                className="text-destructive/60 hover:text-destructive transition-colors text-xs"
                aria-label="סגור"
              >✕</button>
            </div>
          )}

          {aiAnswer && (
            <div
              dir="rtl"
              className="relative w-full max-w-md rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground leading-relaxed"
              style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
            >
              <button
                onClick={() => setAiAnswer('')}
                className="absolute top-2 left-3 text-muted-foreground hover:text-foreground transition-colors text-xs"
                aria-label="סגור"
              >✕</button>
              {aiAnswer}
            </div>
          )}
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

        {/* ── Aramaic translation (only for Aramaic verses) ────────── */}
        {needsTranslation && (
          <AramaicTranslation
            translation={aramaicTranslation}
            isLoading={loadingTranslation}
            kind="translation"
          />
        )}

        {/* ── Plain-language explanation (all verses) ──────────────── */}
        <AramaicTranslation
          translation={verseExplanation}
          isLoading={loadingExplanation}
          kind="explanation"
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
