import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { getChapterVerses } from '@/lib/sefaria-api';
import { fetchPsalmExplanation } from '@/lib/ai-api';
import { AramaicTranslation } from '@/components/aramaic-translation';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';

// ── עשרת מזמורי התיקון הכללי ─────────────────────────────────────────────
const TIKKUN_PSALMS = [
  { num: 16,  heb: 'ט״ז'  },
  { num: 32,  heb: 'ל״ב'  },
  { num: 41,  heb: 'מ״א'  },
  { num: 42,  heb: 'מ״ב'  },
  { num: 59,  heb: 'נ״ט'  },
  { num: 77,  heb: 'ע״ז'  },
  { num: 90,  heb: 'צ׳'   },
  { num: 105, heb: 'ק״ה'  },
  { num: 137, heb: 'קל״ז' },
  { num: 150, heb: 'ק״נ'  },
] as const;

// ── תפילות פתיחה ─────────────────────────────────────────────────────────
const OPENING_PARAGRAPHS = [
  `הֲרֵינִי מְקַשֵּׁר עַצְמִי בַּאֲמִירַת הָעֲשָׂרָה מִזְמוֹרִים אֵלּוּ לְכָל הַצַּדִּיקִים הָאֲמִתִּיִּים שֶׁבְּדוֹרֵנוּ, וּלְכָל הַצַּדִּיקִים הָאֲמִתִּיִּים שׁוֹכְנֵי עָפָר קְדוֹשִׁים אֲשֶׁר בָּאָרֶץ הֵמָּה. וּבִפְרַט לְרַבֵּנוּ הַקָּדוֹשׁ צַדִּיק יְסוֹד עוֹלָם, נַחַל נוֹבֵעַ מְקוֹר חָכְמָה, רַבֵּנוּ נַחְמָן בֶּן פֵּיגָא זְכוּתוֹ יָגֵן עָלֵינוּ, שֶׁגִּלָּה תִּקּוּן זֶה.`,

  `לְכוּ נְרַנְּנָה לַיהֹוָה, נָרִיעָה לְצוּר יִשְׁעֵנוּ: נְקַדְּמָה פָנָיו בְּתוֹדָה, בִּזְמִרוֹת נָרִיעַ לוֹ: כִּי אֵל גָּדוֹל יְהֹוָה, וּמֶלֶךְ גָּדוֹל עַל-כָּל-אֱלֹהִים:`,

  `הֲרֵינִי מְזַמֵּן אֶת פִּי, לְהוֹדוֹת לְהַלֵּל וּלְשַׁבֵּחַ אֶת בּוֹרְאִי: לְשֵׁם יִחוּד קֻדְשָׁא בְּרִיךְ הוּא וּשְׁכִינְתֵּהּ בִּדְחִילוּ וּרְחִימוּ, עַל יְדֵי הַהוּא טָמִיר וְנַעְלָם בְּשֵׁם כָּל יִשְׂרָאֵל.`,
];

// ── תפילות סיום ──────────────────────────────────────────────────────────
const CLOSING_PARAGRAPHS = [
  `מִי יִתֵּן מִצִּיּוֹן יְשׁוּעַת יִשְׂרָאֵל, בְּשׁוּב יְהֹוָה שְׁבוּת עַמּוֹ, יָגֵל יַעֲקֹב יִשְׂמַח יִשְׂרָאֵל.`,

  `רִבּוֹנוֹ שֶׁל עוֹלָם, עִלַּת הָעִלּוֹת וְסִבַּת כָּל הַסִּבּוֹת. הִנֵּה אֵין בִּי כֹּחַ לְתַקֵּן אֶת אֲשֶׁר קִלְקַלְתִּי, כִּי אֵין בִּי מַעֲשִׂים טוֹבִים. אַךְ אַתָּה בְּרַחֲמֶיךָ הָרַבִּים גִּלֵּיתָ לָנוּ עַל יְדֵי עַבְדְּךָ רַבֵּנוּ הַקָּדוֹשׁ כְּבוֹד קְדֻשַּׁת מוֹהֲרַנָּ״א, כִּי עֲשָׂרָה מִזְמוֹרִים אֵלּוּ הֵם תִּקּוּן גָּדוֹל וּכְלָלִי לְכָל הַפְּגָמִים.`,

  `לָכֵן, אֲנַחְנוּ בָּאִים לְפָנֶיךָ בְּתַחֲנוּנִים, וּמְבַקְּשִׁים מִמְּךָ בְּשֵׁם זְכוּת רַבֵּנוּ הַקָּדוֹשׁ, שֶׁתְּקַבֵּל בְּרַחֲמִים רַבִּים אֶת אֲמִירַת הָעֲשָׂרָה מִזְמוֹרִים שֶׁאָמַרְנוּ, וְיַעֲמֹד לָנוּ זְכוּת קְרִיאָתָם לְכַפֵּר וּלְמַחֵל עַל כָּל חַטֹּאתֵינוּ, עֲוֹנוֹתֵינוּ וּפְשָׁעֵינוּ. וּתְמַהֵר לְגָאֳלֵנוּ גְּאֻלָּה שְׁלֵמָה בִּמְהֵרָה בְּיָמֵינוּ. אָמֵן כֵּן יְהִי רָצוֹן.`,
];

// ── PrayerSection component ───────────────────────────────────────────────
function PrayerSection({
  title,
  paragraphs,
  defaultOpen = true,
}: {
  title: string;
  paragraphs: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-sm"
      style={{
        borderColor: 'hsl(var(--primary) / 0.25)',
        background: 'linear-gradient(160deg, hsl(var(--primary)/0.04), hsl(var(--primary)/0.09))',
      }}
      dir="rtl"
    >
      {/* Title bar */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-primary/5 transition-colors"
      >
        <span
          className="text-base font-bold text-primary"
          style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
        >
          {title}
        </span>
        {open
          ? <ChevronUp   className="w-4 h-4 text-primary/60 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-primary/60 shrink-0" />}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-primary/10">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-foreground leading-loose text-right"
              style={{
                fontFamily: 'Frank Ruhl Libre, serif',
                fontSize: '1.15rem',
                lineHeight: '2.1',
                marginTop: i === 0 ? '1rem' : undefined,
              }}
            >
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nav button style ──────────────────────────────────────────────────────
const NAV_BTN = [
  'flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary/40',
  'bg-card text-primary font-semibold transition-all',
  'hover:border-primary hover:bg-primary hover:text-primary-foreground',
  'disabled:opacity-20 disabled:cursor-not-allowed active:scale-95',
].join(' ');

// ── Main page ─────────────────────────────────────────────────────────────
export default function TikkunHaklali() {
  const [idx, setIdx] = useState(0);
  const [, navigate]  = useLocation();

  const psalm = TIKKUN_PSALMS[idx];

  const { data: verses, isLoading: loadingVerses } = useQuery({
    queryKey:  ['psalm-verses', psalm.num],
    queryFn:   () => getChapterVerses('Psalms', psalm.num),
    staleTime: Infinity,
  });

  const psalmText = verses?.join(' ') ?? '';

  const { data: explanation, isLoading: loadingExplanation } = useQuery({
    queryKey:  ['psalm-explanation', psalm.num],
    queryFn:   () => fetchPsalmExplanation(psalm.num, psalmText),
    enabled:   psalmText.length > 0,
    staleTime: Infinity,
  });

  const isFirst = idx === 0;
  const isLast  = idx === TIKKUN_PSALMS.length - 1;

  const NavButtons = ({ className = '' }: { className?: string }) => (
    <div className={`flex items-center justify-center gap-4 ${className}`} dir="rtl">
      <button onClick={() => setIdx(i => i - 1)} disabled={isFirst} className={NAV_BTN}>
        <ChevronRight className="w-5 h-5" /><span>מזמור קודם</span>
      </button>
      <button onClick={() => setIdx(i => i + 1)} disabled={isLast} className={NAV_BTN}>
        <span>מזמור הבא</span><ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground">
      <div className="container mx-auto py-8 sm:py-10 space-y-8 max-w-3xl px-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="text-center space-y-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
            dir="rtl"
          >
            <ArrowRight className="w-4 h-4" />
            <span>חזרה לתנ״ך</span>
          </button>

          <h1
            className="text-4xl sm:text-5xl font-bold text-primary"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
            dir="rtl"
          >
            התיקון הכללי
          </h1>
          <p className="text-sm text-muted-foreground" dir="rtl">
            עשרת המזמורים שגילה רבי נחמן מברסלב
          </p>

          {/* Psalm selector pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2" dir="rtl">
            {TIKKUN_PSALMS.map((p, i) => (
              <button
                key={p.num}
                onClick={() => setIdx(i)}
                style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                className={[
                  'px-3 py-1 rounded-full text-sm font-medium border transition-all',
                  i === idx
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-foreground border-border hover:border-primary/50 hover:text-primary',
                ].join(' ')}
              >
                {p.heb}
              </button>
            ))}
          </div>
        </header>

        {/* ── תפילות פתיחה (מוצגות לפני המזמור הראשון) ──────────────── */}
        {isFirst && (
          <PrayerSection title="תפילה לפני אמירת התיקון הכללי" paragraphs={OPENING_PARAGRAPHS} />
        )}

        {/* ── Psalm title ─────────────────────────────────────────────── */}
        <div className="text-center" dir="rtl">
          <h2
            className="text-xl font-bold text-primary/75"
            style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
          >
            תהילים • פרק {psalm.heb}&nbsp; ({idx + 1} / {TIKKUN_PSALMS.length})
          </h2>
        </div>

        {/* ── Top navigation ──────────────────────────────────────────── */}
        <NavButtons />

        {/* ── Psalm verses ────────────────────────────────────────────── */}
        {loadingVerses ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3" dir="rtl">
            {verses?.map((v, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span
                  className="text-primary/40 text-xs shrink-0 w-7 text-left tabular-nums"
                  style={{ fontFamily: 'Frank Ruhl Libre, serif' }}
                >
                  {toHebrewNumeral(i + 1)}
                </span>
                <p
                  className="text-foreground leading-loose"
                  style={{ fontFamily: 'Frank Ruhl Libre, serif', fontSize: '1.4rem', lineHeight: '2.1' }}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── "במילים פשוטות" explanation ─────────────────────────────── */}
        <AramaicTranslation
          translation={explanation}
          isLoading={loadingExplanation && psalmText.length > 0}
          kind="explanation"
        />

        {/* ── Bottom navigation ───────────────────────────────────────── */}
        <NavButtons />

        {/* ── תפילות סיום (מוצגות אחרי המזמור האחרון) ────────────────── */}
        {isLast && (
          <PrayerSection
            title="תפילה לאחר אמירת התיקון הכללי"
            paragraphs={CLOSING_PARAGRAPHS}
          />
        )}

        <div className="pb-16" />

      </div>
    </div>
  );
}
