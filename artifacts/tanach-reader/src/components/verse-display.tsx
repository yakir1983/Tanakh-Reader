import { motion, AnimatePresence } from 'framer-motion';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';

interface VerseDisplayProps {
  bookHebrew: string;
  chapter: number;
  verse: number;
  verseText: string;
  isLoading?: boolean;
  fontSize?: number;
}

export function VerseDisplay({ 
  bookHebrew, 
  chapter, 
  verse, 
  verseText,
  isLoading,
  fontSize = 5,
}: VerseDisplayProps) {
  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="h-8 w-48 bg-muted/30 rounded animate-pulse mx-auto" />
            <div className="h-24 w-full bg-muted/30 rounded animate-pulse" />
          </motion.div>
        ) : (
          <motion.div
            key={`${bookHebrew}-${chapter}-${verse}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-6"
            data-testid="container-verse-display"
          >
            {/* Reference header */}
            <div 
              className="text-center text-lg text-primary/80 font-light tracking-wide"
              dir="rtl"
              data-testid="text-verse-reference"
            >
              {bookHebrew} • פרק {toHebrewNumeral(chapter)} • פסוק {toHebrewNumeral(verse)}
            </div>

            {/* Verse text */}
            <div
              className="text-center leading-relaxed font-normal text-foreground transition-all duration-200"
              style={{ fontFamily: 'Frank Ruhl Libre, serif', fontSize: `${fontSize}rem` }}
              dir="rtl"
              data-testid="text-verse-content"
            >
              {verseText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
