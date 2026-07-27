import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Translation request signals — checked BEFORE question signals
const TRANSLATE_SIGNALS = [
  "תרגם", "תרגמ", "תרגום",
  "מה כתוב פה", "מה כתוב כאן", "מה זה אומר",
];

// Hebrew question-signal words — if transcript contains any, route to Q&A
const QUESTION_SIGNALS = [
  "מה ", "מי ", "למה ", "מדוע ", "כיצד ", "איך ", "האם ",
  "הסבר", "ספר לי", "פירוש", "רש\"י", "רשי",
  "על מה", "מה אומר", "מה כתוב", "מה פירוש",
];

function wordBoundaryMatch(text: string, signal: string): boolean {
  const idx = text.indexOf(signal);
  if (idx === -1) return false;
  return idx === 0 || text[idx - 1] === ' ';
}

function isTranslateRequest(text: string): boolean {
  return TRANSLATE_SIGNALS.some(s => wordBoundaryMatch(text, s));
}

function isQuestion(text: string): boolean {
  return QUESTION_SIGNALS.some(s => wordBoundaryMatch(text, s));
}

// ── Shared book map ────────────────────────────────────────────────────────────
const BOOK_MAP_STR = `בראשית=Genesis, שמות=Exodus, ויקרא=Leviticus, במדבר=Numbers, דברים=Deuteronomy,
יהושע=Joshua, שופטים=Judges, שמואל א=I Samuel, שמואל ב=II Samuel,
מלכים א=I Kings, מלכים ב=II Kings, ישעיה=Isaiah, ישעיהו=Isaiah,
ירמיה=Jeremiah, יחזקאל=Ezekiel, הושע=Hosea, יואל=Joel, עמוס=Amos,
עובדיה=Obadiah, יונה=Jonah, מיכה=Micah, נחום=Nahum, חבקוק=Habakkuk,
צפניה=Zephaniah, חגי=Haggai, זכריה=Zechariah, מלאכי=Malachi,
תהלים=Psalms, תהילים=Psalms, משלי=Proverbs, איוב=Job,
שיר השירים=Song of Songs, רות=Ruth, איכה=Lamentations,
קהלת=Ecclesiastes, אסתר=Esther, דניאל=Daniel, עזרא=Ezra,
נחמיה=Nehemiah, דברי הימים א=I Chronicles, דברי הימים ב=II Chronicles`;

// ── Biblical character → first major appearance ────────────────────────────────
const CHARACTERS_MAP = `If only a character name is mentioned (no explicit book/chapter/verse), use these defaults:
משה / מרע"ה → {"book":"Exodus","chapter":2,"verse":1}
אברהם / אברם → {"book":"Genesis","chapter":12,"verse":1}
יצחק → {"book":"Genesis","chapter":21,"verse":1}
יעקב / ישראל האבות → {"book":"Genesis","chapter":25,"verse":19}
יוסף → {"book":"Genesis","chapter":37,"verse":1}
נח → {"book":"Genesis","chapter":6,"verse":9}
אדם / חוה → {"book":"Genesis","chapter":2,"verse":7}
קין / הבל → {"book":"Genesis","chapter":4,"verse":1}
אהרן → {"book":"Exodus","chapter":4,"verse":14}
מרים → {"book":"Exodus","chapter":15,"verse":20}
יהושע → {"book":"Joshua","chapter":1,"verse":1}
דבורה → {"book":"Judges","chapter":4,"verse":1}
גדעון → {"book":"Judges","chapter":6,"verse":1}
שמשון → {"book":"Judges","chapter":13,"verse":1}
שמואל → {"book":"I Samuel","chapter":1,"verse":1}
חנה → {"book":"I Samuel","chapter":1,"verse":1}
שאול המלך / שאול → {"book":"I Samuel","chapter":9,"verse":1}
דוד המלך / דוד → {"book":"I Samuel","chapter":16,"verse":1}
שלמה המלך / שלמה → {"book":"I Kings","chapter":3,"verse":5}
אליהו הנביא / אליהו → {"book":"I Kings","chapter":17,"verse":1}
אלישע → {"book":"I Kings","chapter":19,"verse":19}
ישעיהו / ישעיה הנביא → {"book":"Isaiah","chapter":1,"verse":1}
ירמיהו / ירמיה הנביא → {"book":"Jeremiah","chapter":1,"verse":1}
יחזקאל הנביא → {"book":"Ezekiel","chapter":1,"verse":1}
יונה הנביא / יונה → {"book":"Jonah","chapter":1,"verse":1}
דניאל → {"book":"Daniel","chapter":1,"verse":1}
אסתר המלכה / אסתר → {"book":"Esther","chapter":2,"verse":7}
מרדכי → {"book":"Esther","chapter":2,"verse":5}
רות → {"book":"Ruth","chapter":1,"verse":1}
בועז → {"book":"Ruth","chapter":2,"verse":1}
עזרא → {"book":"Ezra","chapter":1,"verse":1}
נחמיה → {"book":"Nehemiah","chapter":1,"verse":1}`;

// ── Biblical topics/events map ─────────────────────────────────────────────────
const TOPICS_MAP = `If a well-known biblical event or topic is mentioned (no explicit book/chapter), use these:
בריאת העולם / שבעת ימי הבריאה → {"book":"Genesis","chapter":1,"verse":1}
בריאת האדם / אדם הראשון → {"book":"Genesis","chapter":2,"verse":7}
גן עדן → {"book":"Genesis","chapter":2,"verse":8}
חטא אדם וחוה / עץ הדעת / נחש → {"book":"Genesis","chapter":3,"verse":1}
גירוש מגן עדן → {"book":"Genesis","chapter":3,"verse":23}
קין והבל → {"book":"Genesis","chapter":4,"verse":1}
חנוך → {"book":"Genesis","chapter":5,"verse":18}
הנפילים / בני האלהים → {"book":"Genesis","chapter":6,"verse":1}
המבול / נח ותיבה / תיבת נח → {"book":"Genesis","chapter":6,"verse":9}
קשת בענן / ברית הקשת → {"book":"Genesis","chapter":9,"verse":12}
מגדל בבל → {"book":"Genesis","chapter":11,"verse":1}
ברית בין הבתרים → {"book":"Genesis","chapter":15,"verse":1}
לוט ועיר סדום / סדום ועמורה → {"book":"Genesis","chapter":18,"verse":20}
הפיכת סדום / הצלת לוט → {"book":"Genesis","chapter":19,"verse":1}
עקדת יצחק / עקידה → {"book":"Genesis","chapter":22,"verse":1}
סולם יעקב / חלום יעקב → {"book":"Genesis","chapter":28,"verse":10}
יעקב ועשו / ברכת יצחק → {"book":"Genesis","chapter":27,"verse":1}
מאבק יעקב עם המלאך → {"book":"Genesis","chapter":32,"verse":25}
כתונת הפסים / יוסף ואחיו → {"book":"Genesis","chapter":37,"verse":1}
חלומות יוסף → {"book":"Genesis","chapter":37,"verse":5}
יוסף בבית פוטיפר → {"book":"Genesis","chapter":39,"verse":1}
יוסף בבור / מכירת יוסף → {"book":"Genesis","chapter":37,"verse":23}
יוסף מפרש חלומות / חלומות פרעה → {"book":"Genesis","chapter":41,"verse":1}
הסנה הבוער → {"book":"Exodus","chapter":3,"verse":1}
מכות מצרים / עשר מכות → {"book":"Exodus","chapter":7,"verse":14}
מכת בכורות / מכה אחרונה → {"book":"Exodus","chapter":12,"verse":29}
פסח / ליל הסדר / קרבן פסח → {"book":"Exodus","chapter":12,"verse":1}
יציאת מצרים → {"book":"Exodus","chapter":12,"verse":31}
קריעת ים סוף / ים סוף → {"book":"Exodus","chapter":14,"verse":21}
שירת הים / שירת משה → {"book":"Exodus","chapter":15,"verse":1}
מן במדבר / לחם מן השמים → {"book":"Exodus","chapter":16,"verse":4}
מי מריבה / מי מסה → {"book":"Exodus","chapter":17,"verse":1}
מעמד הר סיני / מתן תורה → {"book":"Exodus","chapter":19,"verse":1}
עשרת הדיברות / לוחות הברית → {"book":"Exodus","chapter":20,"verse":1}
חטא העגל / עגל הזהב → {"book":"Exodus","chapter":32,"verse":1}
שבירת הלוחות → {"book":"Exodus","chapter":32,"verse":19}
המשכן / בניית המשכן → {"book":"Exodus","chapter":25,"verse":1}
ברכת כהנים → {"book":"Numbers","chapter":6,"verse":22}
המרגלים / עשרה מרגלים → {"book":"Numbers","chapter":13,"verse":1}
קורח ועדתו / מחלוקת קורח → {"book":"Numbers","chapter":16,"verse":1}
פרה אדומה → {"book":"Numbers","chapter":19,"verse":1}
נחש הנחושת → {"book":"Numbers","chapter":21,"verse":6}
בלעם ואתונו / אתון בלעם → {"book":"Numbers","chapter":22,"verse":21}
קריאת שמע → {"book":"Deuteronomy","chapter":6,"verse":4}
מות משה / פטירת משה → {"book":"Deuteronomy","chapter":34,"verse":1}
כניסה לארץ / עברית הירדן → {"book":"Joshua","chapter":3,"verse":1}
יריחו / חומות יריחו → {"book":"Joshua","chapter":6,"verse":1}
שמש גבעון / יהושע עוצר השמש → {"book":"Joshua","chapter":10,"verse":12}
דבורה ויעל / שירת דבורה → {"book":"Judges","chapter":4,"verse":1}
גדעון ומדיין → {"book":"Judges","chapter":6,"verse":11}
שמשון ודלילה → {"book":"Judges","chapter":16,"verse":4}
חנה ותפילתה / חנה ושמואל → {"book":"I Samuel","chapter":1,"verse":1}
שאול הראשון / משיחת שאול → {"book":"I Samuel","chapter":10,"verse":1}
דוד וגוליית → {"book":"I Samuel","chapter":17,"verse":1}
דוד ויהונתן → {"book":"I Samuel","chapter":18,"verse":1}
משיחת דוד → {"book":"I Samuel","chapter":16,"verse":1}
בת שבע / דוד ובת שבע → {"book":"II Samuel","chapter":11,"verse":1}
בניית בית המקדש / בית המקדש הראשון → {"book":"I Kings","chapter":6,"verse":1}
חכמת שלמה / משפט שלמה → {"book":"I Kings","chapter":3,"verse":16}
אליהו בכרמל / נביאי הבעל → {"book":"I Kings","chapter":18,"verse":20}
אליהו בחורב → {"book":"I Kings","chapter":19,"verse":9}
עליית אליהו / רכב האש → {"book":"II Kings","chapter":2,"verse":1}
אלישע ושונמית / ילד השונמית → {"book":"II Kings","chapter":4,"verse":8}
חורבן בית המקדש / גלות בבל → {"book":"II Kings","chapter":25,"verse":1}
חזון ישעיה / שרפים → {"book":"Isaiah","chapter":6,"verse":1}
חזון יחזקאל / מרכבה → {"book":"Ezekiel","chapter":1,"verse":1}
עצמות היבשות / בקעת העצמות → {"book":"Ezekiel","chapter":37,"verse":1}
יונה בבטן הדג / יונה והדג → {"book":"Jonah","chapter":1,"verse":17}
כבשן האש / שדרך מישך ועבד נגו → {"book":"Daniel","chapter":3,"verse":1}
דניאל בגוב האריות → {"book":"Daniel","chapter":6,"verse":17}
מגילת אסתר / פורים / המן → {"book":"Esther","chapter":1,"verse":1}
רות ובועז → {"book":"Ruth","chapter":2,"verse":1}
ספר איוב / סבל איוב → {"book":"Job","chapter":1,"verse":1}`;

// ── Navigate prompt ────────────────────────────────────────────────────────────
const NAV_PROMPT = `Extract a Bible reference from the Hebrew text and return JSON.
Book map: ${BOOK_MAP_STR}

Hebrew gematria numbers: א=1 ב=2 ג=3 ד=4 ה=5 ו=6 ז=7 ח=8 ט=9 י=10 יא=11 יב=12 יג=13 יד=14 טו=15 טז=16 יז=17 יח=18 יט=19 כ=20 כא=21 כב=22 כג=23 כד=24 כה=25 כו=26 כז=27 כח=28 כט=29 ל=30 לא=31 לב=32 לג=33 לד=34 לה=35 לו=36 לז=37 לח=38 לט=39 מ=40 נ=50 ס=60 ע=70 פ=80 צ=90 ק=100 ק"נ=150

${CHARACTERS_MAP}

${TOPICS_MAP}

Return exactly one of:
{"found":true,"book":"<English name>","chapter":<number>,"verse":<number>}
{"found":false}

Rules:
- If explicit book+chapter+verse given → use them directly.
- If a character name matches → use character defaults.
- If a topic/event name matches → use topic defaults.
- If only chapter/verse without book → use book "CURRENT".
- Default chapter=1, verse=1 if not mentioned.

Examples:
"תהילים פרק כב פסוק א" → {"found":true,"book":"Psalms","chapter":22,"verse":1}
"המבול" → {"found":true,"book":"Genesis","chapter":6,"verse":9}
"קריעת ים סוף" → {"found":true,"book":"Exodus","chapter":14,"verse":21}
"עקדת יצחק" → {"found":true,"book":"Genesis","chapter":22,"verse":1}
"חטא העגל" → {"found":true,"book":"Exodus","chapter":32,"verse":1}
"דוד המלך" → {"found":true,"book":"I Samuel","chapter":16,"verse":1}
"פרק ה" → {"found":true,"book":"CURRENT","chapter":5,"verse":1}
"hello" → {"found":false}`;

// ── Q&A prompt ─────────────────────────────────────────────────────────────────
const QA_PROMPT = `You are a Hebrew Bible scholar. Answer questions about Tanach and Rashi commentary.
Always reply in Hebrew. Keep answers concise: 2-3 sentences maximum.
Start your answer immediately, no preamble.`;

// ── Translation helpers ─────────────────────────────────────────────────────────

/** Strip HTML tags and common HTML entities from verse text before sending to AI. */
function cleanVerseText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')          // remove all HTML tags
    .replace(/&thinsp;/g,  ' ')
    .replace(/&nbsp;/g,    ' ')
    .replace(/&amp;/g,     '&')
    .replace(/&lt;/g,      '<')
    .replace(/&gt;/g,      '>')
    .replace(/[\u0591-\u05AF]/g, '')  // strip cantillation (keep nikud)
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Translation prompts ─────────────────────────────────────────────────────────
const TRANSLATE_PROMPT = `You are a Biblical Aramaic expert and translator.
The verse below is in Biblical Aramaic. Translate the ENTIRE verse into clear, simple, modern Hebrew (plain Israeli Hebrew, not Talmudic).
Important rules:
- Translate every word — do not skip or truncate, even if the verse is long.
- Long lists of Aramaic official titles (e.g. אֲחַשְׁדַּרְפְּנַיָּא, סִגְנַיָּא) should be rendered with their Hebrew equivalents or a brief descriptive phrase.
- Return ONLY the Hebrew translation. No source text, no preamble, no parentheses with Aramaic words.`;

/** Simpler fallback prompt used on retry — less strict, forces output. */
const TRANSLATE_PROMPT_FALLBACK = `Translate this Biblical Aramaic verse into modern Hebrew. Be concise but complete. Output only the Hebrew translation.`;

// ── Shared translation helper (with retry) ─────────────────────────────────────
async function translateAramaic(
  verseText: string,
  book?: string,
  chapter?: number,
  verse?: number,
): Promise<string> {
  const cleaned = cleanVerseText(verseText);
  const context = `ספר ${book || ""}, פרק ${chapter || ""}, פסוק ${verse || ""}:\n${cleaned}`;

  // Attempt 1 — full prompt, generous token budget
  const attempt1 = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 600,
    messages: [
      { role: "system", content: TRANSLATE_PROMPT },
      { role: "user",   content: context },
    ],
  });
  const text1 = (attempt1.choices[0]?.message?.content ?? "").trim();
  if (text1.length > 5) return text1;

  // Attempt 2 — simpler prompt, higher token budget
  const attempt2 = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 900,
    messages: [
      { role: "system", content: TRANSLATE_PROMPT_FALLBACK },
      { role: "user",   content: cleaned },
    ],
  });
  const text2 = (attempt2.choices[0]?.message?.content ?? "").trim();
  if (text2.length > 5) return text2;

  return "לא הצלחתי לתרגם את הפסוק.";
}

// ── POST /api/ai/voice-command ─────────────────────────────────────────────────
router.post("/ai/voice-command", async (req, res) => {
  const { transcript, currentBook, currentChapter, currentVerse, currentVerseText } = req.body as {
    transcript: string;
    currentBook?: string;
    currentChapter?: number;
    currentVerse?: number;
    currentVerseText?: string;
  };

  if (!transcript || typeof transcript !== "string") {
    res.status(400).json({ error: "transcript required" });
    return;
  }

  try {
    if (isTranslateRequest(transcript)) {
      // ── Translate current verse ───────────────────────────────────────────────
      if (!currentVerseText) {
        res.json({ type: "answer", text: "לא נמצא טקסט לתרגום בפסוק הנוכחי." });
        return;
      }
      const text = await translateAramaic(currentVerseText, currentBook, currentChapter, currentVerse);
      res.json({ type: "answer", text });

    } else if (isQuestion(transcript)) {
      // ── Q&A ──────────────────────────────────────────────────────────────────
      const ctxNote = currentBook
        ? `[Currently reading: ${currentBook} chapter ${currentChapter} verse ${currentVerse}] `
        : "";

      const completion = await openai.chat.completions.create({
        model: "gpt-5.6-terra",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: QA_PROMPT },
          { role: "user",   content: ctxNote + transcript },
        ],
      });

      const text = (completion.choices[0]?.message?.content ?? "").trim();
      res.json({ type: "answer", text: text || "מצטער, לא הצלחתי לענות על השאלה." });

    } else {
      // ── Navigate ─────────────────────────────────────────────────────────────
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: NAV_PROMPT },
          { role: "user",   content: transcript },
        ],
      });

      const raw = (completion.choices[0]?.message?.content ?? "").trim();
      const match = raw.match(/\{[\s\S]*?\}/);
      if (!match) { res.json({ type: "unknown" }); return; }

      const data = JSON.parse(match[0]);
      if (data.found) {
        res.json({ type: "navigate", book: data.book, chapter: data.chapter, verse: data.verse });
      } else {
        res.json({ type: "unknown" });
      }
    }
  } catch (err) {
    console.error("AI voice-command error:", err);
    res.status(500).json({ error: "AI error" });
  }
});

// ── POST /api/ai/translate-verse ───────────────────────────────────────────────
// Called automatically by the frontend when an Aramaic verse is displayed.
router.post("/ai/translate-verse", async (req, res) => {
  const { book, chapter, verse, verseText } = req.body as {
    book?: string;
    chapter?: number;
    verse?: number;
    verseText: string;
  };

  if (!verseText || typeof verseText !== "string") {
    res.status(400).json({ error: "verseText required" });
    return;
  }

  try {
    const translation = await translateAramaic(verseText, book, chapter, verse);
    res.json({ translation });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

// ── POST /api/ai/explain-verse ─────────────────────────────────────────────────
// Called automatically for every non-Aramaic verse to show "במילים פשוטות".
const EXPLAIN_PROMPT = `אתה מספר סיפורים שמסביר פסוקים מהתנ"ך בשפה עברית תקנית, זורמת ופשוטה.
כתוב 2–3 משפטים שמסבירים מה קורה בפסוק — כמו שמספרים סיפור לאדם שלא מכיר את הטקסט.
כללי שפה חובה:
- כתוב עברית מודרנית תקנית בלבד.
- אל תשתמש בצורות עתיקות או מיושנות כמו: "שמעתה", "ויהי", "ויאמר", "ויעש", "אשר" — תמיר אותן במילים טבעיות.
- במקום "מעת אשר / משמעתה / מאז" — השתמש ב"מאז", "מעכשיו", "מנקודה זו", "מהיום".
- אל תשתמש במונחים דתיים מורכבים שדורשים הסבר בפני עצמם.
- משפטים קצרים וישירים, ללא קישוטי סגנון.
החזר רק את ההסבר, ללא כותרת ולא הקדמה.`;

router.post("/ai/explain-verse", async (req, res) => {
  const { book, chapter, verse, verseText } = req.body as {
    book?: string;
    chapter?: number;
    verse?: number;
    verseText: string;
  };

  if (!verseText || typeof verseText !== "string") {
    res.status(400).json({ error: "verseText required" });
    return;
  }

  try {
    const cleaned = cleanVerseText(verseText);
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: EXPLAIN_PROMPT },
        { role: "user",   content: `ספר ${book || ""}, פרק ${chapter || ""}, פסוק ${verse || ""}:\n${cleaned}` },
      ],
    });
    const explanation = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ explanation: explanation || "לא הצלחתי להסביר את הפסוק." });
  } catch (err) {
    console.error("Explain-verse error:", err);
    res.status(500).json({ error: "Explanation failed" });
  }
});

export default router;
