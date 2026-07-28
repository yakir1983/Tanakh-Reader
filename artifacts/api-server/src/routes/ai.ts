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
  "היכן ", "איפה ", "מתי ", "כמה ", "מנין ",
  "הסבר", "ספר לי", "פירוש", "רש\"י", "רשי",
  "על מה", "מה אומר", "מה כתוב", "מה פירוש",
  "מי הם", "מי היה", "מי הייתה", "מי הוא", "מי היא",
  "מה קרה", "מה הסיפור", "מה עשה", "מה עשתה",
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
משה / מרע"ה / משה רבנו → {"book":"Exodus","chapter":2,"verse":1}
אברהם אבינו / אברהם / אברם → {"book":"Genesis","chapter":12,"verse":1}
שרה אמנו / שרה / שרי → {"book":"Genesis","chapter":12,"verse":5}
יצחק אבינו / יצחק → {"book":"Genesis","chapter":21,"verse":1}
רבקה / רבקה אמנו → {"book":"Genesis","chapter":24,"verse":15}
יעקב אבינו / יעקב / ישראל → {"book":"Genesis","chapter":25,"verse":19}
לאה אמנו / לאה → {"book":"Genesis","chapter":29,"verse":16}
רחל אמנו / רחל → {"book":"Genesis","chapter":29,"verse":16}
לבן הארמי / לבן → {"book":"Genesis","chapter":29,"verse":1}
עשו / אדום / עשיו → {"book":"Genesis","chapter":25,"verse":25}
יוסף הצדיק / יוסף → {"book":"Genesis","chapter":37,"verse":1}
בנימין → {"book":"Genesis","chapter":35,"verse":18}
ראובן → {"book":"Genesis","chapter":29,"verse":32}
שמעון → {"book":"Genesis","chapter":29,"verse":33}
לוי → {"book":"Genesis","chapter":29,"verse":34}
יהודה → {"book":"Genesis","chapter":29,"verse":35}
דן → {"book":"Genesis","chapter":30,"verse":6}
נפתלי → {"book":"Genesis","chapter":30,"verse":8}
גד → {"book":"Genesis","chapter":30,"verse":11}
אשר → {"book":"Genesis","chapter":30,"verse":13}
יששכר → {"book":"Genesis","chapter":30,"verse":18}
זבולון → {"book":"Genesis","chapter":30,"verse":20}
דינה → {"book":"Genesis","chapter":30,"verse":21}
תמר → {"book":"Genesis","chapter":38,"verse":6}
יהודה ותמר → {"book":"Genesis","chapter":38,"verse":1}
אסנת → {"book":"Genesis","chapter":41,"verse":45}
פוטיפר → {"book":"Genesis","chapter":37,"verse":36}
נח → {"book":"Genesis","chapter":6,"verse":9}
שם חם ויפת / בני נח → {"book":"Genesis","chapter":9,"verse":18}
אדם הראשון / אדם → {"book":"Genesis","chapter":2,"verse":7}
חוה → {"book":"Genesis","chapter":2,"verse":20}
קין → {"book":"Genesis","chapter":4,"verse":1}
הבל → {"book":"Genesis","chapter":4,"verse":1}
בלעם → {"book":"Numbers","chapter":22,"verse":5}
בלק → {"book":"Numbers","chapter":22,"verse":2}
פינחס → {"book":"Numbers","chapter":25,"verse":7}
קורח → {"book":"Numbers","chapter":16,"verse":1}
אהרן הכהן / אהרן → {"book":"Exodus","chapter":4,"verse":14}
מרים הנביאה / מרים → {"book":"Exodus","chapter":15,"verse":20}
יהושע בן נון / יהושע → {"book":"Joshua","chapter":1,"verse":1}
כלב / כלב בן יפונה → {"book":"Numbers","chapter":13,"verse":6}
דבורה הנביאה / דבורה → {"book":"Judges","chapter":4,"verse":1}
יעל → {"book":"Judges","chapter":4,"verse":17}
סיסרא → {"book":"Judges","chapter":4,"verse":2}
גדעון → {"book":"Judges","chapter":6,"verse":1}
יפתח → {"book":"Judges","chapter":11,"verse":1}
שמשון → {"book":"Judges","chapter":13,"verse":1}
דלילה → {"book":"Judges","chapter":16,"verse":4}
עלי הכהן / עלי → {"book":"I Samuel","chapter":1,"verse":9}
שמואל הנביא / שמואל → {"book":"I Samuel","chapter":1,"verse":1}
חנה אם שמואל / חנה → {"book":"I Samuel","chapter":1,"verse":1}
שאול המלך / שאול → {"book":"I Samuel","chapter":9,"verse":1}
יהונתן / יהונתן בן שאול → {"book":"I Samuel","chapter":14,"verse":1}
דוד המלך / דוד / דוד בן ישי → {"book":"I Samuel","chapter":16,"verse":1}
גוליית → {"book":"I Samuel","chapter":17,"verse":4}
אביגיל → {"book":"I Samuel","chapter":25,"verse":3}
בת שבע → {"book":"II Samuel","chapter":11,"verse":3}
אוריה החיתי / אוריה → {"book":"II Samuel","chapter":11,"verse":3}
אבשלום → {"book":"II Samuel","chapter":13,"verse":1}
אמנון → {"book":"II Samuel","chapter":13,"verse":1}
יואב → {"book":"II Samuel","chapter":2,"verse":13}
שלמה המלך / שלמה → {"book":"I Kings","chapter":3,"verse":5}
ירבעם → {"book":"I Kings","chapter":11,"verse":26}
אחאב → {"book":"I Kings","chapter":16,"verse":29}
איזבל → {"book":"I Kings","chapter":16,"verse":31}
אליהו הנביא / אליהו / אליהו התשבי → {"book":"I Kings","chapter":17,"verse":1}
אלישע הנביא / אלישע → {"book":"I Kings","chapter":19,"verse":19}
חזקיהו המלך / חזקיהו → {"book":"II Kings","chapter":18,"verse":1}
יאשיהו המלך / יאשיהו → {"book":"II Kings","chapter":22,"verse":1}
ישעיהו הנביא / ישעיהו / ישעיה → {"book":"Isaiah","chapter":1,"verse":1}
ירמיהו הנביא / ירמיה / ירמיהו → {"book":"Jeremiah","chapter":1,"verse":1}
יחזקאל הנביא / יחזקאל → {"book":"Ezekiel","chapter":1,"verse":1}
הושע הנביא / הושע → {"book":"Hosea","chapter":1,"verse":1}
עמוס הנביא / עמוס → {"book":"Amos","chapter":1,"verse":1}
יונה הנביא / יונה → {"book":"Jonah","chapter":1,"verse":1}
מיכה הנביא / מיכה → {"book":"Micah","chapter":1,"verse":1}
נחום הנביא / נחום → {"book":"Nahum","chapter":1,"verse":1}
חבקוק הנביא / חבקוק → {"book":"Habakkuk","chapter":1,"verse":1}
מלאכי הנביא / מלאכי → {"book":"Malachi","chapter":1,"verse":1}
דניאל → {"book":"Daniel","chapter":1,"verse":1}
חנניה מישאל ועזריה / שדרך מישך ועבד נגו → {"book":"Daniel","chapter":1,"verse":6}
אסתר המלכה / אסתר / הדסה → {"book":"Esther","chapter":2,"verse":7}
מרדכי → {"book":"Esther","chapter":2,"verse":5}
המן / המן האגגי → {"book":"Esther","chapter":3,"verse":1}
אחשורוש → {"book":"Esther","chapter":1,"verse":1}
ושתי → {"book":"Esther","chapter":1,"verse":9}
רות / רות המואביה → {"book":"Ruth","chapter":1,"verse":1}
נעמי → {"book":"Ruth","chapter":1,"verse":2}
בועז → {"book":"Ruth","chapter":2,"verse":1}
עזרא → {"book":"Ezra","chapter":1,"verse":1}
נחמיה → {"book":"Nehemiah","chapter":1,"verse":1}
איוב → {"book":"Job","chapter":1,"verse":1}`;

// ── Biblical topics/events map ─────────────────────────────────────────────────
const TOPICS_MAP = `If a well-known biblical event, topic, or family/relational context is mentioned (no explicit book/chapter), use these:
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
לידת יצחק / ברית מילה / הגר וישמעאל → {"book":"Genesis","chapter":17,"verse":1}
ברית בין הבתרים → {"book":"Genesis","chapter":15,"verse":1}
לוט ועיר סדום / סדום ועמורה → {"book":"Genesis","chapter":18,"verse":20}
הפיכת סדום / הצלת לוט → {"book":"Genesis","chapter":19,"verse":1}
עקדת יצחק / עקידה / הר המוריה → {"book":"Genesis","chapter":22,"verse":1}
שידוך רבקה / אליעזר ורבקה / עבד אברהם → {"book":"Genesis","chapter":24,"verse":1}
יעקב ועשו נולדים / תולדות יצחק → {"book":"Genesis","chapter":25,"verse":19}
עשו מוכר הבכורה / בכורת עשו → {"book":"Genesis","chapter":25,"verse":29}
ברכת יצחק / יעקב מקבל ברכה / יעקב ועשו ברכה → {"book":"Genesis","chapter":27,"verse":1}
בריחת יעקב מעשו / יעקב בורח → {"book":"Genesis","chapter":27,"verse":41}
סולם יעקב / חלום יעקב → {"book":"Genesis","chapter":28,"verse":10}
יעקב ולבן / יעקב מגיע לחרן / לבן הארמי ויעקב → {"book":"Genesis","chapter":29,"verse":1}
נישואי יעקב ורחל / יעקב ורחל ולאה / שתי נשות יעקב → {"book":"Genesis","chapter":29,"verse":16}
לידת שבטי ישראל / בני יעקב / שנים עשר שבטים → {"book":"Genesis","chapter":29,"verse":31}
לידת יוסף / רחל יולדת / יוסף בן רחל → {"book":"Genesis","chapter":30,"verse":22}
יעקב עוזב את לבן / יציאת יעקב מחרן → {"book":"Genesis","chapter":31,"verse":1}
מאבק יעקב עם המלאך / יעקב נהיה ישראל → {"book":"Genesis","chapter":32,"verse":25}
פגישת יעקב ועשו / אחים מתפייסים → {"book":"Genesis","chapter":33,"verse":1}
לידת בנימין / מות רחל / רחל מתה → {"book":"Genesis","chapter":35,"verse":16}
כתונת הפסים / יוסף ואחיו → {"book":"Genesis","chapter":37,"verse":1}
חלומות יוסף → {"book":"Genesis","chapter":37,"verse":5}
יוסף בבור / מכירת יוסף → {"book":"Genesis","chapter":37,"verse":23}
יוסף בבית פוטיפר / אשת פוטיפר → {"book":"Genesis","chapter":39,"verse":1}
יוסף בבית הסוהר / יוסף בכלא → {"book":"Genesis","chapter":39,"verse":20}
יוסף מפרש חלומות / חלומות פרעה → {"book":"Genesis","chapter":41,"verse":1}
יוסף נגלה לאחיו / יוסף מתגלה → {"book":"Genesis","chapter":45,"verse":1}
ירידת יעקב למצרים / בני ישראל במצרים → {"book":"Genesis","chapter":46,"verse":1}
ברכת יעקב לבניו / יעקב מברך שבטים → {"book":"Genesis","chapter":49,"verse":1}
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
- If a character name or alias matches (including honorifics like "אבינו", "אמנו", "המלך", "הנביא", "הצדיק") → use character defaults.
- If a relational phrase is used ("אביו של יוסף" → יעקב, "בנות לבן" → לאה ורחל → Genesis 29, "אחי יוסף" → Genesis 37, "בעלה של רחל" → יעקב → Genesis 29) → resolve to the relevant character or event.
- If a topic/event name matches → use topic defaults.
- If only chapter/verse without book → use book "CURRENT".
- Default chapter=1, verse=1 if not mentioned.
- If the input is a place name associated with a biblical event (e.g. "חרן", "באר שבע", "בית לחם") → navigate to the most significant event at that place.
- If nothing in the input maps to a Bible reference → {"found":false}.

Examples:
"תהילים פרק כב פסוק א" → {"found":true,"book":"Psalms","chapter":22,"verse":1}
"המבול" → {"found":true,"book":"Genesis","chapter":6,"verse":9}
"קריעת ים סוף" → {"found":true,"book":"Exodus","chapter":14,"verse":21}
"עקדת יצחק" → {"found":true,"book":"Genesis","chapter":22,"verse":1}
"חטא העגל" → {"found":true,"book":"Exodus","chapter":32,"verse":1}
"דוד המלך" → {"found":true,"book":"I Samuel","chapter":16,"verse":1}
"לבן הארמי" → {"found":true,"book":"Genesis","chapter":29,"verse":1}
"רחל ולאה" → {"found":true,"book":"Genesis","chapter":29,"verse":16}
"בנות לבן" → {"found":true,"book":"Genesis","chapter":29,"verse":16}
"אביו של יוסף" → {"found":true,"book":"Genesis","chapter":25,"verse":19}
"אחי יוסף" → {"found":true,"book":"Genesis","chapter":37,"verse":1}
"פרק ה" → {"found":true,"book":"CURRENT","chapter":5,"verse":1}
"hello" → {"found":false}
"שלום" → {"found":false}`;

// ── Q&A prompt ─────────────────────────────────────────────────────────────────
const QA_PROMPT = `אתה מומחה לתנ"ך, פרשנות חז"ל ורש"י. עניין בשאלות על:
- זהות דמויות תנ"ך (כולל שמות, יחסי משפחה, תפקידים)
- אירועים ומקומות מקראיים
- פרשנות פסוקים ומשמעותם הפנימית
- הקשרים בין דמויות (למשל: "מי הוא לבן הארמי?" → דודו של יעקב, אחי רבקה; "מה הקשר בין רחל ולאה?" → שתיהן בנות לבן ונשות יעקב)

כללים:
- ענה תמיד בעברית תקנית ומודרנית.
- תשובה קצרה: 2–3 משפטים בלבד.
- התחל מיד בתשובה, ללא הקדמה.
- הזכר את הספר והפרק הרלוונטי כשמועיל (למשל: "הסיפור מופיע בבראשית פרק כט").
- כנה דמויות בכבוד: "אברהם אבינו", "משה רבנו", "דוד המלך" וכד'.`;

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
const EXPLAIN_PROMPT = `אתה מסביר פסוקים מהתנ"ך בשפה עברית תקנית, זורמת ופשוטה — בנאמנות מלאה לרוח חז"ל והמפרשים.
כתוב 2–3 משפטים שמסבירים מה קורה בפסוק.

עקרון יסוד — עומק ולא שטח:
- אל תסתפק בתיאור טכני או חיצוני של האירוע. חובה להבהיר את המניע, החטא והמשמעות הפנימית לפי המסורת.
- דוגמה: מגדל בבל — לא "הם בנו מגדל ואלוהים בלבל את שפתם", אלא: הם מרדו בה', ביקשו להילחם בו ולכפור בשלטונו על העולם — ועל כך נענשו.
- דוגמה: המבול — לא "ירד גשם ארבעים יום", אלא: העולם הושחת בחמס ובעריות, וה' החליט למחות את כל היצירה ולהתחיל מחדש עם נח הצדיק.
- דוגמה: חטא העגל — לא "העם עשה עגל זהב", אלא: בעוד משה במרום, העם נכשל באמונה, עשה לעצמו אל זהב ועבד אותו — בגידה קשה בברית שנכרתה זה עתה.

כבוד לדמויות התנ"ך — חובה:
- כנה את האבות, האמהות, הנביאים והמלכים בשמם בלבד, או עם תוספת כבוד מקובלת ("אברהם אבינו", "משה רבנו", "דוד המלך") — לפי ההקשר הטבעי.
- מצבים עובדתיים המופיעים במפורש בפסוק (כגון כהיית עיניים, זיקנה, מחלה) מותר לציין אם הם נדרשים להבנת הפשוט — אך אין לחזור עליהם ואין להדגישם שלא לצורך.
- הימנע לחלוטין מניסוחים מכפישים, גסים, או מיותרים שעלולים להישמע כחוסר כבוד.

כללי שפה חובה:
- כתוב עברית מודרנית תקנית בלבד.
- אל תשתמש בצורות עתיקות: "שמעתה", "ויהי", "ויאמר", "אשר" — תמיר אותן במילים טבעיות.
- אל תשתמש במונחים דתיים מורכבים שדורשים הסבר בפני עצמם.
- משפטים קצרים וישירים, ללא קישוטי סגנון וללא חזרות מיותרות.
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

// ── POST /api/ai/explain-psalm ──────────────────────────────────────────────
// Called for Tikkun HaKlali: explains an entire psalm chapter.
const PSALM_EXPLAIN_PROMPT = `אתה מסביר מזמורי תהילים בשפה עברית תקנית, זורמת ופשוטה — בנאמנות מלאה לרוח חז"ל והמפרשים.
המזמור שיוצג בפניך הוא אחד מעשרת מזמורי התיקון הכללי שגילה רבי נחמן מברסלב.
כתוב 3–4 משפטים שמסבירים:
- מה עיקר תוכנו ורוחו של המזמור
- מה הכוח הרוחני הטמון בו לפי המסורת
- מה המלך דוד מבקש או מביע בו

עקרון יסוד — עומק ולא שטח:
- אל תסתפק בתיאור טכני. חובה לגעת במשמעות הפנימית ובכוח הרוחני.
- כתוב עברית מודרנית תקנית בלבד, ללא מילים עתיקות.
- משפטים קצרים וישירים, ללא קישוטי סגנון וללא חזרות מיותרות.

כבוד לדמויות התנ"ך — חובה:
- כנה את דוד המלך ושאר דמויות התנ"ך בשמם בלבד, או עם תוספת כבוד מקובלת ("דוד המלך", "שלמה המלך") — לפי ההקשר הטבעי.
- מצבים עובדתיים המופיעים במפורש בפסוק מותר לציין אם הם נדרשים להבנת הפשוט — אך אין לחזור עליהם ואין להדגישם שלא לצורך.
- הימנע לחלוטין מניסוחים מכפישים, גסים, או מיותרים שעלולים להישמע כחוסר כבוד.
החזר רק את ההסבר, ללא כותרת ולא הקדמה.`;

router.post("/ai/explain-psalm", async (req, res) => {
  const { psalmNumber, psalmText } = req.body as {
    psalmNumber?: number;
    psalmText: string;
  };

  if (!psalmText || typeof psalmText !== "string") {
    res.status(400).json({ error: "psalmText required" });
    return;
  }

  try {
    const cleaned = cleanVerseText(psalmText);
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: PSALM_EXPLAIN_PROMPT },
        { role: "user",   content: `תהילים פרק ${psalmNumber || ""}:\n${cleaned}` },
      ],
    });
    const explanation = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ explanation: explanation || "לא הצלחתי להסביר את המזמור." });
  } catch (err) {
    console.error("Explain-psalm error:", err);
    res.status(500).json({ error: "Explanation failed" });
  }
});

export default router;
