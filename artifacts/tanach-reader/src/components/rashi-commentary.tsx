import { motion } from 'framer-motion';
import type { RashiDibur } from '@/lib/sefaria-api';

interface RashiCommentaryProps {
  diburim: RashiDibur[];
  isLoading?: boolean;
}

export function RashiCommentary({ diburim, isLoading }: RashiCommentaryProps) {
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
      {/* Section label */}
      <h2
        className="text-lg font-bold text-primary text-right mb-4"
        dir="rtl"
        data-testid="text-rashi-label"
      >
        פירוש רש״י
      </h2>

      {diburim.length > 0 ? (
        <div className="space-y-4" dir="rtl" data-testid="text-rashi-content">
          {diburim.map((dibur, i) => (
            <motion.div
              key={i}
              className="rounded-xl border border-primary/20 bg-card px-5 py-4 text-right shadow-sm"
              style={{
                backgroundImage:
                  'linear-gradient(160deg, hsl(var(--primary)/0.04), hsl(var(--primary)/0.10))',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              {/* Dibur hamatchil — bold heading */}
              {dibur.heading && (
                <p
                  className="text-base font-bold text-foreground mb-2 leading-normal"
                  style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                >
                  {dibur.heading}
                </p>
              )}

              {/* Commentary with nikud */}
              {dibur.commentary && (
                <p
                  className="text-base leading-loose text-foreground/90"
                  style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                >
                  {dibur.commentary}
                </p>
              )}
            </motion.div>
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
