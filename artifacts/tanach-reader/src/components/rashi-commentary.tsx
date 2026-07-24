import { motion } from 'framer-motion';

interface RashiCommentaryProps {
  commentary: string | null;
  isLoading?: boolean;
}

export function RashiCommentary({ commentary, isLoading }: RashiCommentaryProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 mt-16">
        <div className="space-y-4">
          <div className="h-8 w-32 bg-muted/30 rounded animate-pulse" />
          <div className="h-32 w-full bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Split joined diburim back into paragraphs for clean display
  const paragraphs = commentary
    ? commentary.split('\n').filter(p => p.trim())
    : [];

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-6 mt-16 pb-16"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      data-testid="container-rashi-commentary"
    >
      <div
        className="bg-primary/10 border-2 border-primary/30 rounded-lg p-8"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.15))',
        }}
      >
        {/* Label */}
        <h2
          className="text-2xl font-bold text-primary mb-6 text-right"
          dir="rtl"
          data-testid="text-rashi-label"
        >
          פירוש רש״י
        </h2>

        {/* Commentary */}
        <div
          dir="rtl"
          className="text-right"
          data-testid="text-rashi-content"
          style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
        >
          {paragraphs.length > 0 ? (
            <div className="space-y-4">
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  className="text-xl sm:text-2xl leading-loose text-foreground/95"
                >
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xl text-muted-foreground">
              אין פירוש רש״י לפסוק זה
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
