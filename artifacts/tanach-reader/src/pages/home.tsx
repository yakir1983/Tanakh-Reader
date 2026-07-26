import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, AArrowUp, AArrowDown, Volume2, VolumeX, ChevronRight, ChevronLeft } from 'lucide-react';
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
  const [speaking, setSpeaking] = useState(false);

  // ── Dark mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // ── Book structure (chapters + verse-counts) ─────────────────────────────
  const { data: bookIndex } = useQuery({
    queryKey:  ['index', book],
    queryFn:   () => getBookIndex(book),
    staleTime: Infinity,
  });

  const chapterCount = bookIndex?.length ?? 0;
  const verseCount   = bookIndex?.[chapter - 1] ?? 0;

  // ── Chapter text — fetched ONCE per chapter, verse indexed client-side ───
  const { data: chapterVerses, isLoading: loadingChapter } = useQuery({
    queryKey: ['chapter', book, chapter],
    queryFn:  () => getChapterVerses(book, chapter),
    enabled:  chapterCount > 0,
    staleTime: Infinity,   // chapter text never changes
  });

  // Derive verse text immediately from local array — zero network delay
  const verseText = chapterVerses?.[verse - 1] ?? '';
  const loadingVerse = loadingChapter && !chapterVerses;

  // ── Rashi — per verse (chapter-level API lacks verse indexing) ───────────
  const { data: rashiSegments, isLoading: loadingRashi } = useQuery({
    queryKey: ['rashi', book, chapter, verse],
    queryFn:  () => getRashiSegments(book, chapter, verse),
    enabled:  chapterCount > 0,
    staleTime: Infinity,
  });

  // ── Batched navigation handlers ──────────────────────────────────────────
  const handleBook = useCallback((b: string) => {
    window.speechSynthesis?.cancel(); setSpeaking(false);
    setBook(b); setChapter(1); setVerse(1);
  }, []);

  const handleChapter = useCallback((c: number) => {
    window.speechSynthesis?.cancel(); setSpeaking(false);
    setChapter(c); setVerse(1);
  }, []);

  const handleVerse = useCallback((v: number) => {
    window.speechSynthesis?.cancel(); setSpeaking(false);
    setVerse(v);
  }, []);

  // Prev / Next verse (crosses chapter boundary)
  const goPrev = () => {
    if (verse > 1) {
      handleVerse(verse - 1);
    } else if (chapter > 1) {
      const prevCount = bookIndex?.[chapter - 2] ?? 1;
      window.speechSynthesis?.cancel(); setSpeaking(false);
      setChapter(c => c - 1); setVerse(prevCount);
    }
  };

  const goNext = () => {
    if (verse < verseCount)        handleVerse(verse + 1);
    else if (chapter < chapterCount) handleChapter(chapter + 1);
  };

  const isAtStart = chapter === 1 && verse === 1;
  const isAtEnd   = chapter === chapterCount && verse === verseCount;

  // ── Voice search ─────────────────────────────────────────────────────────
  const handleVoice = useCallback(
    (b?: TanachBook, c?: number, v?: number) => {
      if (b) { handleBook(b.english); return; }
      if (c && c >= 1 && c <= chapterCount) handleChapter(c);
      if (v && v >= 1 && v <= verseCount)   handleVerse(v);
    },
    [chapterCount, verseCount, handleBook, handleChapter, handleVerse],
  );

  // ── TTS — window.speechSynthesis, minimal and direct ─────────────────────
  const toggleTTS = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speaking) { setSpeaking(false); return; }
    if (!verseText) return;

    // Remove nikud + cantillation (U+0591–U+05C7)
    const cleanText = verseText.replace(/[\u0591-\u05C7]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang  = 'he-IL';
    utterance.rate  = 0.9;
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const currentBook  = getBookByEnglish(book);
  const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const ctrlBtn = (active = false) => [
    'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors',
    'border-border bg-card hover:bg-accent/60',
    active ? 'text-primary border-primary/50' : 'text-foreground',
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

          {/* Controls */}
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

            {ttsAvailable && (
              <button onClick={toggleTTS} disabled={!verseText}
                data-testid="button-tts" className={ctrlBtn(speaking)}>
                {speaking
                  ? <VolumeX className="w-4 h-4 text-primary" />
                  : <Volume2 className="w-4 h-4" />}
                <span dir="rtl">{speaking ? 'עצור' : 'הקרא'}</span>
              </button>
            )}

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
        />

        {/* ── Voice search ─────────────────────────────────────────── */}
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

        {/* ── Prev / Next verse ────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 pb-16" dir="rtl">
          <button onClick={goPrev} disabled={isAtStart}
            data-testid="button-prev-verse"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary/40 bg-card text-primary font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed active:scale-95">
            <ChevronRight className="w-5 h-5" /><span>פסוק קודם</span>
          </button>
          <button onClick={goNext} disabled={isAtEnd}
            data-testid="button-next-verse"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary/40 bg-card text-primary font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed active:scale-95">
            <span>פסוק הבא</span><ChevronLeft className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
