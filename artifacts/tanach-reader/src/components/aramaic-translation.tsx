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
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-4 rounded bg-amber-500/30" />
            <div className="h-5 w-44 bg-amber-500/20 rounded" />
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
        className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4"
        style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Languages className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <h3 className="text-base font-bold text-amber-700 dark:text-amber-400">
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
