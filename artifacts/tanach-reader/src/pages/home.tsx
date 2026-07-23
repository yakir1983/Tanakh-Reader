import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavigationBar } from '@/components/navigation-bar';
import { VoiceSearchButton } from '@/components/voice-search-button';
import { VerseDisplay } from '@/components/verse-display';
import { RashiCommentary } from '@/components/rashi-commentary';
import { getBookIndex, getVerseText, getRashiCommentary } from '@/lib/sefaria-api';
import { getBookByEnglish, getBookByHebrew } from '@/lib/tanach-data';

export default function Home() {
  // State for selected reference
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);

  // Fetch book index to get chapter/verse counts
  const { data: bookIndex } = useQuery({
    queryKey: ['book-index', selectedBook],
    queryFn: () => getBookIndex(selectedBook),
    enabled: !!selectedBook,
    staleTime: Infinity, // Book structure doesn't change
  });

  const chapterCount = bookIndex?.length || 0;
  const verseCount = selectedChapter && bookIndex ? bookIndex[selectedChapter - 1] || 0 : 0;

  // Fetch verse text
  const { data: verseText, isLoading: isLoadingVerse } = useQuery({
    queryKey: ['verse', selectedBook, selectedChapter, selectedVerse],
    queryFn: () => getVerseText(selectedBook, selectedChapter, selectedVerse),
    enabled: !!selectedBook && !!selectedChapter && !!selectedVerse,
  });

  // Fetch Rashi commentary
  const { data: rashiText, isLoading: isLoadingRashi } = useQuery({
    queryKey: ['rashi', selectedBook, selectedChapter, selectedVerse],
    queryFn: () => getRashiCommentary(selectedBook, selectedChapter, selectedVerse),
    enabled: !!selectedBook && !!selectedChapter && !!selectedVerse,
  });

  // Reset chapter/verse when book changes
  useEffect(() => {
    setSelectedChapter(1);
    setSelectedVerse(1);
  }, [selectedBook]);

  // Reset verse when chapter changes
  useEffect(() => {
    setSelectedVerse(1);
  }, [selectedChapter]);

  // Handle voice search results
  const handleVoiceReference = (book?: string, chapter?: number, verse?: number) => {
    if (book) {
      // Try to match by Hebrew name
      const matchedBook = getBookByHebrew(book);
      if (matchedBook) {
        setSelectedBook(matchedBook.english);
      }
    }
    
    if (chapter && chapter >= 1 && chapter <= chapterCount) {
      setSelectedChapter(chapter);
    }
    
    if (verse && verse >= 1 && verse <= verseCount) {
      setSelectedVerse(verse);
    }
  };

  const currentBook = getBookByEnglish(selectedBook);

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <div className="container mx-auto py-8 sm:py-12 space-y-12">
        {/* Header with title */}
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

        {/* Verse display */}
        <VerseDisplay
          bookHebrew={currentBook?.hebrew || ''}
          chapter={selectedChapter}
          verse={selectedVerse}
          verseText={verseText || ''}
          isLoading={isLoadingVerse}
        />

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
