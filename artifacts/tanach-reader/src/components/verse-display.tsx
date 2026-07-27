import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check } from 'lucide-react';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';

interface VerseDisplayProps {
  bookHebrew: string;
  chapter: number;
  verse: number;
  verseText: string;
  isLoading?: boolean;
  /** Verse font size in px (one of 15 | 18 | 36). Default: 18 */
  fontSize?: number;
}

export function VerseDisplay({
  bookHebrew,
  chapter,
  verse,
  verseText,
  isLoading,
  fontSize = 18,
}: VerseDisplayProps) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [copied,   setCopied]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const shareText = `${bookHebrew} פרק ${toHebrewNumeral(chapter)} פסוק ${toHebrewNumeral(verse)}\n${verseText}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silent fallback
    }
    setMenuOpen(false);
  };

  const handleShare = async () => {
    setMenuOpen(false);
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // user cancelled or API not supported — ignore
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            {/* Reference header + share button */}
            <div className="flex items-center justify-center gap-3" dir="rtl">
              <div
                className="text-lg text-primary/80 font-light tracking-wide"
                data-testid="text-verse-reference"
              >
                {bookHebrew} • פרק {toHebrewNumeral(chapter)} • פסוק {toHebrewNumeral(verse)}
              </div>

              {/* Share / copy menu */}
              <div ref={menuRef} className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label="שתף או העתק פסוק"
                  disabled={!verseText}
                  className={[
                    'flex items-center justify-center w-8 h-8 rounded-full border transition-colors',
                    'border-border bg-card hover:bg-primary/10 hover:border-primary/40',
                    'disabled:opacity-30 disabled:cursor-not-allowed',
                    copied ? 'text-green-500 border-green-400' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {copied
                    ? <Check className="w-3.5 h-3.5" />
                    : <Share2 className="w-3.5 h-3.5" />}
                </button>

                {menuOpen && (
                  <div
                    className={[
                      'absolute top-full mt-1 z-50 min-w-[130px]',
                      'rounded-xl border border-border bg-card shadow-lg overflow-hidden',
                      'animate-in fade-in-0 zoom-in-95 duration-100',
                      // Position: keep within screen bounds — open leftward in RTL context
                      'right-0',
                    ].join(' ')}
                    dir="rtl"
                  >
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-primary/8 transition-colors text-right"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>העתק פסוק</span>
                    </button>
                    <div className="border-t border-border/50" />
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-primary/8 transition-colors text-right"
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span>שתף</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Verse text */}
            <div
              className="text-center leading-relaxed font-normal text-foreground transition-all duration-200"
              style={{ fontFamily: 'Frank Ruhl Libre, serif', fontSize: `${fontSize}px` }}
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
