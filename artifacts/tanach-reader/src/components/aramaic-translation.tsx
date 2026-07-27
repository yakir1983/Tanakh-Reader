import { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, BookOpen } from 'lucide-react';

type BoxKind = 'translation' | 'explanation';

interface AramaicTranslationProps {
  translation?: string;
  isLoading?: boolean;
  /** 'translation' → "תרגום מארמית לעברית" with Languages icon (default)
   *  'explanation'  → "במילים פשוטות" with BookOpen icon */
  kind?: BoxKind;
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

const BOX_BASE = 1.2;   // rem — גודל מקורי (לפני כל השינויים)
const BOX_STEP = 0.1;   // rem — צעד עדין
const BOX_MIN  = 1.0;   // rem — 2 לחיצות מינוס מתחת לברירת המחדל
const BOX_MAX  = 1.6;   // rem — 4 לחיצות פלוס מעל ברירת המחדל

export function AramaicTranslation({ translation, isLoading, kind = 'translation' }: AramaicTranslationProps) {
  const { title, Icon } = KINDS[kind];
  const [fontSize, setFontSize] = useState(BOX_BASE);

  const decrease = () => setFontSize(f => +(Math.max(f - BOX_STEP, BOX_MIN)).toFixed(2));
  const increase = () => setFontSize(f => +(Math.min(f + BOX_STEP, BOX_MAX)).toFixed(2));

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
        {/* Title row + font controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: VIOLET.icon }} />
            <h3 className="text-base font-bold" style={{ color: VIOLET.title }}>{title}</h3>
          </div>

          <div className="flex items-center gap-1" dir="ltr">
            <button
              onClick={decrease}
              disabled={fontSize <= BOX_MIN}
              aria-label="הקטן גופן"
              className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
            >−</button>
            <button
              onClick={increase}
              disabled={fontSize >= BOX_MAX}
              aria-label="הגדל גופן"
              className="w-6 h-6 flex items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none"
            >+</button>
          </div>
        </div>

        <p className="text-foreground leading-relaxed" style={{ fontSize: `${fontSize}rem`, lineHeight: '2' }}>
          {translation}
        </p>
      </div>
    </motion.div>
  );
}
