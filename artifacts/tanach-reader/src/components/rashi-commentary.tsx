import { useState } from 'react';
import { motion } from 'framer-motion';

const RASHI_BASE = 1.2;
const RASHI_STEP = 0.15;
const RASHI_MAX  = +(RASHI_BASE + 3 * RASHI_STEP).toFixed(2); // 1.65rem

interface RashiCommentaryProps {
  segments: string[];
  isLoading?: boolean;
}

export function RashiCommentary({ segments, isLoading }: RashiCommentaryProps) {
  const [fontSize, setFontSize] = useState(RASHI_BASE);

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 mt-10 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-primary/20 bg-card p-5 space-y-2 animate-pulse">
            <div className="h-5 w-28 bg-muted/50 rounded mr-auto" />
            <div className="h-4 w-full bg-muted/30 rounded" />
            <div className="h-4 w-4/5 bg-muted/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 mt-10 pb-6"
      data-testid="container-rashi-commentary"
    >
      {/* Outer card wrapping title + segments */}
      <div className="rounded-xl border border-primary/20 bg-card shadow-sm overflow-hidden">

        {/* Title row — inside the card */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10" dir="rtl">
          <h2
            className="text-base font-bold text-primary"
            data-testid="text-rashi-label"
          >
            פירוש רש״י
          </h2>
          <div className="flex items-center gap-1" dir="ltr">
            <button
              onClick={() => setFontSize(f => Math.max(+(f - RASHI_STEP).toFixed(2), RASHI_BASE))}
              disabled={fontSize <= RASHI_BASE}
              aria-label="הקטן גופן רש״י"
              className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
            >−</button>
            <button
              onClick={() => setFontSize(f => Math.min(+(f + RASHI_STEP).toFixed(2), RASHI_MAX))}
              disabled={fontSize >= RASHI_MAX}
              aria-label="הגדל גופן רש״י"
              className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
            >+</button>
          </div>
        </div>

        {/* Segments */}
        {segments.length > 0 ? (
          <div className="divide-y divide-primary/8" dir="rtl" data-testid="text-rashi-content">
            {segments.map((html, i) => (
              <motion.div
                key={i}
                className={[
                  'px-5 py-4 text-right',
                  '[&_b]:font-bold [&_b]:text-primary [&_b]:text-[1.05em]',
                ].join(' ')}
                style={{
                  fontFamily: 'Frank Ruhl Libre, serif',
                  fontSize: `${fontSize}rem`,
                  lineHeight: '2.1',
                  backgroundImage: 'linear-gradient(160deg, hsl(var(--primary)/0.04), hsl(var(--primary)/0.10))',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ))}
          </div>
        ) : (
          <p
            className="px-5 py-6 text-right text-base text-muted-foreground"
            dir="rtl"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
          >
            אין פירוש רש״י לפסוק זה
          </p>
        )}
      </div>
    </div>
  );
}
