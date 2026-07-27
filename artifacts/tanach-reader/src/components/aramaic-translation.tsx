import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';

interface AramaicTranslationProps {
  translation?: string;
  isLoading?: boolean;
}

export function AramaicTranslation({ translation, isLoading }: AramaicTranslationProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 mt-6">
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-4 rounded bg-violet-400/30" />
            <div className="h-5 w-44 bg-violet-400/20 rounded" />
          </div>
          <div className="h-4 w-full bg-muted/30 rounded" />
          <div className="h-4 w-3/4 bg-muted/30 rounded mt-2" />
        </div>
      </div>
    );
  }

  if (!translation) return null;

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto px-4 mt-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        dir="rtl"
        className="rounded-xl border border-violet-400/35 bg-violet-500/8 px-5 py-4"
        style={{
          fontFamily: 'Frank Ruhl Libre, serif',
          background: 'color-mix(in srgb, hsl(270 60% 60%) 8%, transparent)',
          borderColor: 'color-mix(in srgb, hsl(270 60% 65%) 35%, transparent)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(270 55% 55%)' }} />
          <h3 className="text-base font-bold" style={{ color: 'hsl(270 55% 50%)' }}>
            תרגום מארמית לעברית
          </h3>
        </div>
        <p
          className="text-foreground leading-relaxed"
          style={{ fontSize: '1.2rem', lineHeight: '2' }}
        >
          {translation}
        </p>
      </div>
    </motion.div>
  );
}
