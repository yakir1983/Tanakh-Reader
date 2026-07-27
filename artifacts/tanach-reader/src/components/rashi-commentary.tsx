import { motion } from 'framer-motion';

interface RashiCommentaryProps {
  /** Raw HTML segments from Sefaria, each one dibur: "<b>word.</b> commentary…" */
  segments: string[];
  isLoading?: boolean;
}

export function RashiCommentary({ segments, isLoading }: RashiCommentaryProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 mt-10 space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-xl border border-primary/20 bg-card p-5 space-y-2 animate-pulse"
          >
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
      {/* Section label */}
      <h2
        className="text-lg font-bold text-primary text-right mb-4"
        dir="rtl"
        data-testid="text-rashi-label"
      >
        פירוש רש״י
      </h2>

      {segments.length > 0 ? (
        <div className="space-y-3" dir="rtl" data-testid="text-rashi-content">
          {segments.map((html, i) => (
            <motion.div
              key={i}
              className={[
                'rounded-xl border border-primary/20 bg-card px-5 py-4 text-right shadow-sm',
                '[&_b]:font-bold [&_b]:text-primary [&_b]:text-[1.05em]',
              ].join(' ')}
              style={{
                fontFamily: 'Frank Ruhl Libre, serif',
                fontSize: '1.2rem',
                lineHeight: '2.1',
                backgroundImage:
                  'linear-gradient(160deg, hsl(var(--primary)/0.04), hsl(var(--primary)/0.10))',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border border-primary/20 bg-card px-5 py-6 text-right"
          dir="rtl"
        >
          <p
            className="text-base text-muted-foreground"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
          >
            אין פירוש רש״י לפסוק זה
          </p>
        </div>
      )}
    </div>
  );
}
