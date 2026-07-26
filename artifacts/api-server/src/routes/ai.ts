import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Hebrew question-signal words — if transcript contains any, route to Q&A
const QUESTION_SIGNALS = [
  "מה ", "מי ", "למה ", "מדוע ", "כיצד ", "איך ", "האם ",
  "הסבר", "ספר לי", "פירוש", "רש\"י", "רשי",
  "על מה", "מה אומר", "מה כתוב", "מה פירוש",
];

function isQuestion(text: string): boolean {
  return QUESTION_SIGNALS.some(signal => {
    const idx = text.indexOf(signal);
    if (idx === -1) return false;
    // Must start at beginning of string or after a space (word boundary)
    return idx === 0 || text[idx - 1] === ' ';
  });
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

// ── Navigate prompt ────────────────────────────────────────────────────────────
const NAV_PROMPT = `Extract a Bible reference from the Hebrew text and return JSON.
Book map: ${BOOK_MAP_STR}

Hebrew gematria numbers: א=1 ב=2 ג=3 ד=4 ה=5 ו=6 ז=7 ח=8 ט=9 י=10 יא=11 יב=12 יג=13 יד=14 טו=15 טז=16 יז=17 יח=18 יט=19 כ=20 כא=21 כב=22 כג=23 כד=24 כה=25 כו=26 כז=27 כח=28 כט=29 ל=30 לא=31 לב=32 לג=33 לד=34 לה=35 לו=36 לז=37 לח=38 לט=39 מ=40 נ=50 ס=60 ע=70 פ=80 צ=90 ק=100 ק"נ=150

${CHARACTERS_MAP}

Return exactly one of:
{"found":true,"book":"<English name>","chapter":<number>,"verse":<number>}
{"found":false}

Rules:
- If explicit book+chapter+verse given → use them directly.
- If only a character name → use the character defaults above.
- If only chapter/verse without book → use book "CURRENT".
- Default chapter=1, verse=1 if not mentioned.

Examples:
"תהילים פרק כב פסוק א" → {"found":true,"book":"Psalms","chapter":22,"verse":1}
"שמואל ב פרק ז" → {"found":true,"book":"II Samuel","chapter":7,"verse":1}
"דוד המלך" → {"found":true,"book":"I Samuel","chapter":16,"verse":1}
"משה" → {"found":true,"book":"Exodus","chapter":2,"verse":1}
"שלמה" → {"found":true,"book":"I Kings","chapter":3,"verse":5}
"פרק ה" → {"found":true,"book":"CURRENT","chapter":5,"verse":1}
"hello" → {"found":false}`;

// ── Q&A prompt ─────────────────────────────────────────────────────────────────
const QA_PROMPT = `You are a Hebrew Bible scholar. Answer questions about Tanach and Rashi commentary.
Always reply in Hebrew. Keep answers concise: 2-3 sentences maximum.
Start your answer immediately, no preamble.`;

router.post("/ai/voice-command", async (req, res) => {
  const { transcript, currentBook, currentChapter, currentVerse } = req.body as {
    transcript: string;
    currentBook?: string;
    currentChapter?: number;
    currentVerse?: number;
  };

  if (!transcript || typeof transcript !== "string") {
    res.status(400).json({ error: "transcript required" });
    return;
  }

  try {
    if (isQuestion(transcript)) {
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

export default router;
