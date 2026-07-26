import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Moon, Sun, AArrowUp, AArrowDown,
  ChevronRight, ChevronLeft, Volume2, VolumeX,
} from 'lucide-react';
import { NavigationBar } from '@/components/navigation-bar';
import { VoiceSearchButton } from '@/components/voice-search-button';
import { VerseDisplay } from '@/components/verse-display';
import { RashiCommentary } from '@/components/rashi-commentary';
import {
  getBookIndex,
  getVerseText,
  getRashiSegments,
  rashiSegmentsToPlainText,
} from '@/lib/sefaria-api';
import { getBookByEnglish } from '@/lib/tanach-data';
import type { TanachBook } from '@/lib/tanach-data';

const FONT_SIZE_MIN     = 2.5;
const FONT_SIZE_MAX     = 8;
const FONT_SIZE_STEP    = 0.5;
const FONT_SIZE_DEFAULT = 5;

export default function Home() {
  const [selectedBook,    setSelectedBook]    = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse,   setSelectedVerse]   = useState<number>(1);
  const [isDark,          setIsDark]          = useState(false);
  const [fontSize,        setFontSize]        = useState(FONT_SIZE_DEFAULT);
  const [isSpeaking,      setIsSpeaking]      = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Dark mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: bookIndex } = useQuery({
    queryKey: ['book-index', selectedBook],
    queryFn:  () => getBookIndex(selectedBook),
    enabled:  !!selectedBook,
    staleTime: Infinity,
  });

  const chapterCount = bookIndex?.length ?? 0;
  const verseCount   = bookIndex?.[selectedChapter - 1] ?? 0;

  const { data: verseText, isLoading: isLoadingVerse } = useQuery({
    queryKey: ['verse', selectedBook, selectedChapter, selectedVerse],
    queryFn:  () => getVerseText(selectedBook, selectedChapter, selectedVerse),
    enabled:  !!selectedBook && selectedChapter > 0 && selectedVerse > 0,
  });

  const { data: rashiSegments, isLoading: isLoadingRashi } = useQuery({
    queryKey: ['rashi', selectedBook, selectedChapter, selectedVerse],
    queryFn:  () => getRashiSegments(selectedBook, selectedChapter, selectedVerse),
    enabled:  !!selectedBook && selectedChapter > 0 && selectedVerse > 0,
  });

  // ── Reset chapter/verse when book changes ────────────────────────────────
  useEffect(() => {
    setSelectedChapter(1);
    setSelectedVerse(1);
  }, [selectedBook]);

  useEffect(() => {
    setSelectedVerse(1);
  }, [selectedChapter]);

  // ── Stop TTS when verse changes ──────────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, [selectedBook, selectedChapter, selectedVerse]);

  // ── Voice-search callback ────────────────────────────────────────────────
  const handleVoiceReference = useCallback(
    (book?: TanachBook, chapter?: number, verse?: number) => {
      if (book) {
        setSelectedBook(book.english);
        // Chapter/verse are validated after new bookIndex loads
        if (chapter && chapter >= 1) setSelectedChapter(chapter);
        if (verse   && verse   >= 1) setSelectedVerse(verse);
      } else {
        if (chapter && chapter >= 1 && chapter <= chapterCount)
          setSelectedChapter(chapter);
        if (verse   && verse   >= 1 && verse   <= verseCount)
          setSelectedVerse(verse);
      }
    },
    [chapterCount, verseCount]
  );

  // ── Navigation ───────────────────────────────────────────────────────────
  const goNext = () => {
    if (!verseCount) return;
    if (selectedVerse < verseCount) {
      setSelectedVerse(v => v + 1);
    } else if (selectedChapter < chapterCount) {
      setSelectedChapter(c => c + 1);
      setSelectedVerse(1);
    }
  };

  const goPrev = () => {
    if (selectedVerse > 1) {
      setSelectedVerse(v => v - 1);
    } else if (selectedChapter > 1) {
      const prev = bookIndex?.[selectedChapter - 2] ?? 1;
      setSelectedChapter(c => c - 1);
      setSelectedVerse(prev);
    }
  };

  const isAtStart = selectedChapter === 1 && selectedVerse === 1;
  const isAtEnd   = selectedChapter === chapterCount && selectedVerse === verseCount;

  // ── Text-to-Speech ───────────────────────────────────────────────────────
  const toggleTTS = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const currentBook = getBookByEnglish(selectedBook);
    const rashiPlain  = rashiSegmentsToPlainText(rashiSegments ?? []);
    const fullText = [
      currentBook?.hebrew,
      `פרק ${selectedChapter} פסוק ${selectedVerse}`,
      verseText ?? '',
      rashiPlain ? `פירוש רש״י: ${rashiPlain}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    const utt = new SpeechSynthesisUtterance(fullText);
    utt.lang = 'he-IL';
    utt.rate = 0.85;
    utt.onend  = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utt;
    synth.speak(utt);
    setIsSpeaking(true);
  };

  const currentBook = getBookByEnglish(selectedBook);
  const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto py-8 sm:py-12 space-y-10 max-w-4xl">

        {/* ── Header ──────────────────────────────────────────────── */}
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

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
            <button
              onClick={() => setFontSize(f => Math.max(f - FONT_SIZE_STEP, FONT_SIZE_MIN))}
              disabled={fontSize <= FONT_SIZE_MIN}
              data-testid="button-font-decrease"
              title="הקטן פונט"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm font-bold transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <AArrowDown className="w-4 h-4" /><span>A</span>
            </button>
            <button
              onClick={() => setFontSize(f => Math.min(f + FONT_SIZE_STEP, FONT_SIZE_MAX))}
              disabled={fontSize >= FONT_SIZE_MAX}
              data-testid="button-font-increase"
              title="הגדל פונט"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm font-bold transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <AArrowUp className="w-4 h-4" /><span>A</span>
            </button>

            <div className="w-px h-5 bg-border" />

            {/* TTS button */}
            {ttsAvailable && (
              <button
                onClick={toggleTTS}
                disabled={!verseText}
                data-testid="button-tts"
                title={isSpeaking ? 'עצור הקראה' : 'הקרא בקול'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm transition-colors hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSpeaking
                  ? <VolumeX className="w-4 h-4 text-primary" />
                  : <Volume2 className="w-4 h-4" />}
                <span dir="rtl">{isSpeaking ? 'עצור' : 'הקרא'}</span>
              </button>
            )}

            <div className="w-px h-5 bg-border" />

            <button
              onClick={() => setIsDark(d => !d)}
              data-testid="button-dark-mode-toggle"
              title={isDark ? 'מצב יום' : 'מצב לילה'}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-foreground text-sm transition-colors hover:bg-accent"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span dir="rtl">{isDark ? 'יום' : 'לילה'}</span>
            </button>
          </div>
        </header>

        {/* ── Dropdowns ───────────────────────────────────────────── */}
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

        {/* ── Voice search ─────────────────────────────────────────── */}
        <div className="flex justify-center py-2">
          <VoiceSearchButton onReferenceDetected={handleVoiceReference} />
        </div>

        {/* ── Verse ───────────────────────────────────────────────── */}
        <VerseDisplay
          bookHebrew={currentBook?.hebrew ?? ''}
          chapter={selectedChapter}
          verse={selectedVerse}
          verseText={verseText ?? ''}
          isLoading={isLoadingVerse}
          fontSize={fontSize}
        />

        {/* ── Rashi ───────────────────────────────────────────────── */}
        {!isLoadingVerse && (
          <RashiCommentary
            segments={rashiSegments ?? []}
            isLoading={isLoadingRashi}
          />
        )}

        {/* ── Prev / Next ─────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-6 pb-12" dir="rtl">
          <button
            onClick={goPrev}
            disabled={isAtStart}
            data-testid="button-prev-verse"
            title="פסוק קודם"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-primary/50 bg-card text-primary text-lg font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            <ChevronRight className="w-7 h-7" />
            <span>פסוק קודם</span>
          </button>
          <button
            onClick={goNext}
            disabled={isAtEnd}
            data-testid="button-next-verse"
            title="פסוק הבא"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-primary/50 bg-card text-primary text-lg font-semibold transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-20 disabled:cursor-not-allowed shadow-sm active:scale-95"
          >
            <span>פסוק הבא</span>
            <ChevronLeft className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  );
}
