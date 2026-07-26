/**
 * SearchPanel — full-text search over Tanach via Sefaria API.
 * Opens inline below the header; closes on result selection or X click.
 */
import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { searchTanach } from '@/lib/sefaria-api';
import type { SearchResult } from '@/lib/sefaria-api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (book: string, chapter: number, verse: number) => void;
}

export function SearchPanel({ isOpen, onClose, onNavigate }: Props) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty,   setEmpty]   = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when panel opens; reset when it closes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery(''); setResults([]); setEmpty(false); setLoading(false);
    }
  }, [isOpen]);

  const handleInput = (q: string) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setEmpty(false); setLoading(false); return; }
    setLoading(true);
    setEmpty(false);
    timerRef.current = setTimeout(async () => {
      try {
        const hits = await searchTanach(q);
        setResults(hits);
        setEmpty(hits.length === 0);
      } catch {
        setResults([]);
        setEmpty(true);
      } finally {
        setLoading(false);
      }
    }, 420);
  };

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-sm mx-auto px-4 space-y-2" dir="rtl">
      {/* Input row */}
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="חפש מילה, שורש או פסוק..."
          className={[
            'w-full h-12 pr-4 pl-10 rounded-xl border bg-card text-foreground text-base',
            'placeholder:text-muted-foreground transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
            'border-border',
          ].join(' ')}
          dir="rtl"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={onClose}
          aria-label="סגור חיפוש"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      {(loading || results.length > 0 || empty) && (
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>מחפש...</span>
            </div>
          )}

          {!loading && results.map((r, i) => (
            <button
              key={i}
              onClick={() => { onNavigate(r.book, r.chapter, r.verse); onClose(); }}
              className="w-full px-4 py-3 text-right hover:bg-primary/5 active:bg-primary/10 border-b border-border/40 last:border-b-0 transition-colors"
            >
              <div className="text-sm font-semibold text-primary" dir="rtl">{r.refHebrew}</div>
              {r.heText && (
                <div className="text-sm text-foreground/65 mt-0.5 line-clamp-2 leading-snug" dir="rtl">
                  {r.heText}
                </div>
              )}
            </button>
          ))}

          {!loading && empty && (
            <div className="px-4 py-4 text-sm text-muted-foreground text-center">
              לא נמצאו תוצאות
            </div>
          )}
        </div>
      )}
    </div>
  );
}
