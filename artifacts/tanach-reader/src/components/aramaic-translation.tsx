import { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, BookOpen } from 'lucide-react';

const EXPLAIN_BASE = 1.2;   // rem — default & absolute minimum
const EXPLAIN_STEP = 0.15;  // rem — comfortable step
const EXPLAIN_MAX  = 1.2 + 3 * 0.15; // rem — 3 steps above base (1.65rem)

type BoxKind = 'translation' | 'explanation';

interface AramaicTranslationProps {
  translation?: string;
  isLoading?: boolean;
  /** 'translation' → "תרגום מארמית לעברית" with Languages icon (default)
   *  'explanation'  → "במילים פשוטות" with BookOpen icon */
  kind?: BoxKind;
  /** When provided, overrides the internal font-size state and hides internal ±buttons */
  externalFontSize?: number;
}

const KINDS: Record<BoxKind, { title: string; Icon: typeof Languages }> = {
  translation: { title: 'תרגום מארמית לעברית', Icon: Languages },
  explanation: { title: 'במילים פשוטות',        Icon: BookOpen  },
};

const VIOLET = {
  bg:     'color-mix(in srgb, hsl(270 60% 60%) 8%, transparent)',
  border: 'color-mix(in srgb, hsl(270 60% 65%) 35%, transparent)',
  icon:   'hsl(270 55% 55%)',
  title:  'hsl(270 55% 50%)',
};

export function AramaicTranslation({ translation, isLoading, kind = 'translation', externalFontSize }: AramaicTranslationProps) {
  const { title, Icon } = KINDS[kind];
  const [internalFontSize, setInternalFontSize] = useState(EXPLAIN_BASE);
  const isExplanation = kind === 'explanation';
  // Use external font size when provided (controlled mode), otherwise internal state
  const fontSize = externalFontSize ?? internalFontSize;
  const setFontSize = externalFontSize !== undefined ? () => {} : setInternalFontSize;
  const showInternalControls = isExplanation && externalFontSize === undefined;

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 mt-6">
        <div className="rounded-xl border p-5 animate-pulse"
          style={{ background: VIOLET.bg, borderColor: VIOLET.border }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-4 rounded" style={{ background: VIOLET.icon, opacity: 0.3 }} />
            <div className="h-5 w-44 rounded" style={{ background: VIOLET.icon, opacity: 0.2 }} />
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
        className="rounded-xl border px-5 py-4"
        style={{ fontFamily: 'Frank Ruhl Libre, serif', background: VIOLET.bg, borderColor: VIOLET.border }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: VIOLET.icon }} />
            <h3 className="text-base font-bold" style={{ color: VIOLET.title }}>{title}</h3>
          </div>
          {showInternalControls && (
            <div className="flex items-center gap-1" dir="ltr">
              <button
                onClick={() => setInternalFontSize(f => Math.max(+(f - EXPLAIN_STEP).toFixed(2), EXPLAIN_BASE))}
                disabled={internalFontSize <= EXPLAIN_BASE}
                aria-label="הקטן גופן"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
              >−</button>
              <button
                onClick={() => setInternalFontSize(f => Math.min(+(f + EXPLAIN_STEP).toFixed(2), EXPLAIN_MAX))}
                disabled={internalFontSize >= EXPLAIN_MAX}
                aria-label="הגדל גופן"
                className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
              >+</button>
            </div>
          )}
        </div>
        <p className="text-foreground leading-relaxed" style={{ fontSize: isExplanation ? `${fontSize}rem` : '1.2rem', lineHeight: '2' }}>
          {translation}
        </p>
      </div>
    </motion.div>
  );
}
