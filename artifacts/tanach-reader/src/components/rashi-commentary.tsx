import { motion } from 'framer-motion';
import type { RashiDibur } from '@/lib/sefaria-api';

interface RashiCommentaryProps {
  diburim: RashiDibur[];
  isLoading?: boolean;
}

export function RashiCommentary({ diburim, isLoading }: RashiCommentaryProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 mt-10">
        <div className="rounded-xl border-2 border-primary/20 bg-card p-6 space-y-4">
          <div className="h-6 w-28 bg-muted/40 rounded animate-pulse mr-auto" />
          {[1, 2].map(i => (
            <div key={i} className="space-y-2 pt-2">
              <div className="h-5 w-32 bg-muted/40 rounded animate-pulse mr-auto" />
              <div className="h-16 w-full bg-muted/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 mt-10 pb-4"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      data-testid="container-rashi-commentary"
    >
      <div
        className="rounded-xl border-2 border-primary/25 bg-card overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(160deg, hsl(var(--primary) / 0.04) 0%, hsl(var(--primary) / 0.10) 100%)',
        }}
      >
        {/* Section header */}
        <div className="px-6 pt-5 pb-3 border-b border-primary/15">
          <h2
            className="text-xl font-bold text-primary text-right"
            dir="rtl"
            data-testid="text-rashi-label"
          >
            פירוש רש״י
          </h2>
        </div>

        {/* Diburim list */}
        <div className="divide-y divide-primary/10" dir="rtl" data-testid="text-rashi-content">
          {diburim.length > 0 ? (
            diburim.map((dibur, i) => (
              <motion.div
                key={i}
                className="px-6 py-5 text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Dibur hamatchil — bold, slightly larger */}
                {dibur.heading && (
                  <p
                    className="text-lg font-bold text-foreground mb-2 leading-snug"
                    style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                  >
                    {dibur.heading}
                  </p>
                )}
                {/* Commentary text with nikud */}
                {dibur.commentary && (
                  <p
                    className="text-lg leading-loose text-foreground/90"
                    style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                  >
                    {dibur.commentary}
                  </p>
                )}
              </motion.div>
            ))
          ) : (
            <div className="px-6 py-8 text-right">
              <p
                className="text-lg text-muted-foreground"
                style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
              >
                אין פירוש רש״י לפסוק זה
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
