import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, ArrowRight, ChevronDown, ChevronUp, Moon, Sun } from 'lucide-react';
import { useLocation } from 'wouter';
import { getChapterVerses } from '@/lib/sefaria-api';
import { fetchPsalmExplanation } from '@/lib/ai-api';
import { AramaicTranslation } from '@/components/aramaic-translation';
import { toHebrewNumeral } from '@/lib/hebrew-numerals';
import { storageGet, storageSet, storageGetBool } from '@/lib/safe-storage';

// ── Font-size constants — identical to the Tanach reader ──────────────────
const FONT_SIZE_MIN     = 2.5;
const FONT_SIZE_MAX     = 8;
const FONT_SIZE_STEP    = 0.5;
const FONT_SIZE_DEFAULT = 5;
const FONT_SIZE_KEY     = 'tikkun_font_size';

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
  `מִי יִתֵּן מִצִּיּוֹן יְשׁוּעַת יִשְׂרָאֵל, בְּשׁוּב אֲדֹנָי שְׁבוּת עַמּוֹ – יָגֵל יַעֲקֹב, יִשְׂמַח יִשְׂרָאֵל. וִישׁוּעַת צַדִּיקִים מֵאֲדֹנָי מָעוּזָּם בְּעֵת צָרָה. וַיַּעְזְרֵם אֲדֹנָי וַיְפַלְּטֵם, יְפַלְּטֵם מֵרְשָׁעִים וְיוֹשִׁיעֵם כִּי חָסוּ בוֹ.`,

  `רִבּוֹנוֹ שֶׁל עוֹלָם, עִלַּת הָעִלּוֹת וְסִבַּת כָּל הַסִּבּוֹת, אַנְתְּ לְעֵלָּא, לְעֵלָּא מִן כֹּלָּא, וְלֵית לְעֵלָּא מִינָּךְ, דְּלֵית מַחֲשָׁבָה תְּפִיסָא בָּךְ כְּלָל. וּלְךָ – דוּמִיָּה תְהִלָּה; וּמְרוֹמָם עַל כָּל בְּרָכָה וּתְהִלָּה. אוֹתְךָ אֶדְרֹשׁ, אוֹתְךָ אֲבַקֵּשׁ, שֶׁתַּחְתּוֹר חֲתִירָה דֶּרֶךְ כְּבוּשָׁה מֵאִתְּךָ, דֶּרֶךְ כָּל הָעוֹלָמוֹת עַד הַהִשְׁתַּלְשְׁלוּת שֶׁלִּי, בַּמָּקוֹם שֶׁאֲנִי עוֹמֵד, כְּפִי אֲשֶׁר נִגְלָה לְךָ, יוֹדֵעַ תַּעֲלוּמוֹת. וּבַדֶּרֶךְ וְנָתִיב הַזֶּה תָּאִיר עָלַי אוֹרְךָ, לְהַחֲזִירֵנִי בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ בֶּאֱמֶת, כְּפִי רְצוֹנְךָ בֶּאֱמֶת; כְּפִי רְצוֹן מִבְחַר הַבְּרוּאִים: לְבִלְתִּי לַחֲשֹׁב בְּמַחֲשַׁבְתִּי שׁוּם מַחֲשֶׁבֶת חוּץ וְשׁוּם מַחֲשָׁבָה וּבִלְבּוּל שֶׁהוּא נֶגֶד רְצוֹנְךָ. רַק לִדְבֹּק בְּמַחֲשָׁבוֹת זַכּוֹת, צָחוֹת וּקְדוֹשׁוֹת בַּעֲבוֹדָתְךָ בֶּאֱמֶת, בְּהַשָּׂגָתְךָ וּבְתוֹרָתֶךָ. הַט לִבִּי אֶל עֵדְוֹתֶיךָ, וְתֶן לִי לֵב טָהוֹר לְעָבְדְּךָ בֶּאֱמֶת. וּמִמְּצוּלוֹת יָם תּוֹצִיאֵנִי לְאוֹר גָּדוֹל חִישׁ קַל מַהֵרָה, תְּשׁוּעַת אֲדֹנָי כְּהֶרֶף עָיִן, לָאוֹר בְּאוֹר הַחַיִּים, כָּל יָמַי לִהְיוֹתִי עַל פְּנֵי הָאֲדָמָה; וְאֶזְכֶּה לְחַדֵּשׁ נְעוּרַי, הַיָּמִים שֶׁעָבְרוּ בַּחֹשֶׁךְ לְהַחֲזִירָם אֶל הַקְּדוּשָּׁה. וְתִהְיֶה יְצִיאָתִי מִן הָעוֹלָם כְּבִיאָתִי: בְּלֹא חֵטְא. וְאֶזְכֶּה לַחֲזוֹת בְּנֹעַם אֲדֹנָי וּלְבַקֵּר בְּהֵיכָלוֹ, כֻּלּוֹ אוֹמֵר כָּבוֹד. אָמֵן נֶצַח סֶלָה וָעֶד.`,
];

// ── Font-size constants for prayer/explanation boxes — same as AramaicTranslation ──
const BOX_FONT_BASE = 1.2;
const BOX_FONT_STEP = 0.15;
const BOX_FONT_MAX  = 1.2 + 3 * 0.15; // 1.65rem

// ── Shared small ± button style (matches AramaicTranslation internal buttons) ──
const smallFontBtn =
  'w-6 h-6 flex items-center justify-center rounded-md border border-border ' +
  'bg-card/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground ' +
  'disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm leading-none select-none';

// ── PrayerSection component ───────────────────────────────────────────────
function PrayerSection({
  title,
  paragraphs,
  defaultOpen = true,
  storageKey,
}: {
  title: string;
  paragraphs: string[];
  defaultOpen?: boolean;
  storageKey: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = parseFloat(storageGet(storageKey, String(BOX_FONT_BASE)));
    return Number.isFinite(saved) && saved >= BOX_FONT_BASE && saved <= BOX_FONT_MAX
      ? saved : BOX_FONT_BASE;
  });
  useEffect(() => { storageSet(storageKey, String(fontSize)); }, [storageKey, fontSize]);

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
      <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 hover:text-primary transition-colors flex-1 text-right"
        >
          <span className="text-base font-bold text-primary" style={{ fontFamily: 'Frank Ruhl Libre, serif' }}>
            {title}
          </span>
          {open
            ? <ChevronUp   className="w-4 h-4 text-primary/60 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-primary/60 shrink-0" />}
        </button>
        {/* Font-size ± buttons — always visible, same style as AramaicTranslation */}
        <div className="flex items-center gap-1 mr-3" dir="ltr">
          <button
            onClick={() => setFontSize(f => Math.max(+(f - BOX_FONT_STEP).toFixed(2), BOX_FONT_BASE))}
            disabled={fontSize <= BOX_FONT_BASE}
            aria-label="הקטן גופן תפילה"
            className={smallFontBtn}
          >−</button>
          <button
            onClick={() => setFontSize(f => Math.min(+(f + BOX_FONT_STEP).toFixed(2), BOX_FONT_MAX))}
            disabled={fontSize >= BOX_FONT_MAX}
            aria-label="הגדל גופן תפילה"
            className={smallFontBtn}
          >+</button>
        </div>
      </div>

      {/* Collapsible body */}
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-foreground text-right"
              style={{
                fontFamily: 'Frank Ruhl Libre, serif',
                fontSize: `${fontSize}rem`,
                lineHeight: '1.9',
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

// ── Control button style — identical pill shape to the Tanach reader ───────
const ctrlBtn = () => [
  'flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors',
  'border-border bg-card text-foreground hover:bg-accent/60',
  'disabled:opacity-30 disabled:cursor-not-allowed',
].join(' ');

// ── Main page ─────────────────────────────────────────────────────────────
export default function TikkunHaklali() {
  const [idx, setIdx] = useState(0);
  const [, navigate]  = useLocation();

  // ── Dark mode — shared key with home.tsx so preference is remembered ──────
  const [isDark, setIsDark] = useState(() => {
    const saved = storageGetBool('tanach_dark', false);
    document.documentElement.classList.toggle('dark', saved);
    return saved;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    storageSet('tanach_dark', String(isDark));
  }, [isDark]);

  // ── Shared font size for ALL text (psalms, prayers, explanation) ─────────
  // Identical mechanism to the Tanach reader; persisted to localStorage.
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = parseFloat(storageGet(FONT_SIZE_KEY, String(FONT_SIZE_DEFAULT)));
    return Number.isFinite(saved) && saved >= FONT_SIZE_MIN && saved <= FONT_SIZE_MAX
      ? saved
      : FONT_SIZE_DEFAULT;
  });
  useEffect(() => { storageSet(FONT_SIZE_KEY, String(fontSize)); }, [fontSize]);

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

      {/* ── כפתור יום/לילה — פינה שמאלית עליונה ───────────────────── */}
      <button
        onClick={() => setIsDark(d => !d)}
        className={`fixed top-3 left-4 z-50 ${ctrlBtn()}`}
        aria-label={isDark ? 'עבור למצב יום' : 'עבור למצב לילה'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span dir="rtl">{isDark ? 'יום' : 'לילה'}</span>
      </button>

      {/* ── בס"ד — פינה ימנית עליונה ────────────────────────────────── */}
      <span
        dir="rtl"
        aria-hidden="true"
        className="bsd-glow fixed top-3 right-4 z-50 select-none pointer-events-none text-primary"
        style={{
          fontFamily: 'Frank Ruhl Libre, serif',
          fontSize: '1.05rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        בס״ד
      </span>

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

          {/* ── Font-size controls — identical to Tanach reader ─────────── */}
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            <button
              onClick={() => setFontSize(f => Math.max(f - FONT_SIZE_STEP, FONT_SIZE_MIN))}
              disabled={fontSize <= FONT_SIZE_MIN}
              className={ctrlBtn()}
              aria-label="הקטן גופן"
            >
              <span className="text-base leading-none" style={{ fontFamily: 'Frank Ruhl Libre, serif' }}>א↓</span>
            </button>
            <button
              onClick={() => setFontSize(f => Math.min(f + FONT_SIZE_STEP, FONT_SIZE_MAX))}
              disabled={fontSize >= FONT_SIZE_MAX}
              className={ctrlBtn()}
              aria-label="הגדל גופן"
            >
              <span className="text-base leading-none" style={{ fontFamily: 'Frank Ruhl Libre, serif' }}>א↑</span>
            </button>
          </div>

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
          <PrayerSection title="תפילה לפני אמירת התיקון הכללי" paragraphs={OPENING_PARAGRAPHS} storageKey="tikkun_prayer_open_font" />
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
                  style={{ fontFamily: 'Frank Ruhl Libre, serif', fontSize: `${fontSize}rem`, lineHeight: '2.1' }}
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
          storageKey="tikkun_explanation_font"
        />

        {/* ── Bottom navigation ───────────────────────────────────────── */}
        <NavButtons />

        {/* ── תפילות סיום (מוצגות אחרי המזמור האחרון) ────────────────── */}
        {isLast && (
          <PrayerSection
            title="תפילה לאחר אמירת התיקון הכללי"
            paragraphs={CLOSING_PARAGRAPHS}
            storageKey="tikkun_prayer_close_font"
          />
        )}

        <div className="pb-16" />

      </div>
    </div>
  );
}
