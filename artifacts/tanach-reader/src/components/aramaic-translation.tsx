import { motion } from 'framer-motion';
import { Languages, BookOpen } from 'lucide-react';

type BoxKind = 'translation' | 'explanation';

interface AramaicTranslationProps {
  translation?: string;
  isLoading?: boolean;
  /** 'translation' → "תרגום מארמית לעברית" with Languages icon (default)
   *  'explanation'  → "במילים פשוטות" with BookOpen icon */
  kind?: BoxKind;
  /** Primary verse font size (rem). Box text scales proportionally. Default: 5 */
  fontSize?: number;
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

export function AramaicTranslation({ translation, isLoading, kind = 'translation', fontSize = 5 }: AramaicTranslationProps) {
  // Scale with the primary verse text (baseline: 1.2rem at fontSize 5)
  const boxSize = Math.max(0.85, fontSize * 0.24);
  const { title, Icon } = KINDS[kind];

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
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: VIOLET.icon }} />
          <h3 className="text-base font-bold" style={{ color: VIOLET.title }}>{title}</h3>
        </div>
        <p className="text-foreground leading-relaxed" style={{ fontSize: `${boxSize}rem`, lineHeight: '2' }}>
          {translation}
        </p>
      </div>
    </motion.div>
  );
}
