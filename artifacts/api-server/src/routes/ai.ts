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
  return QUESTION_SIGNALS.some(w => text.includes(w));
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

// ── Navigate prompt ────────────────────────────────────────────────────────────
const NAV_PROMPT = `Extract a Bible reference from the Hebrew text and return JSON.
Book map: ${BOOK_MAP_STR}

Hebrew gematria numbers: א=1 ב=2 ג=3 ד=4 ה=5 ו=6 ז=7 ח=8 ט=9 י=10 יא=11 יב=12 יג=13 יד=14 טו=15 טז=16 יז=17 יח=18 יט=19 כ=20 כא=21 כב=22 כג=23 כד=24 כה=25 כו=26 כז=27 כח=28 כט=29 ל=30 לא=31 לב=32 לג=33 לד=34 לה=35 לו=36 לז=37 לח=38 לט=39 מ=40 נ=50 ס=60 ע=70 פ=80 צ=90 ק=100 ק"נ=150

Return exactly one of:
{"found":true,"book":"<English name>","chapter":<number>,"verse":<number>}
{"found":false}

Defaults: chapter=1, verse=1 if not mentioned. If no book, use "CURRENT".
Examples:
"תהילים פרק כב פסוק א" → {"found":true,"book":"Psalms","chapter":22,"verse":1}
"שמואל ב פרק ז" → {"found":true,"book":"II Samuel","chapter":7,"verse":1}
"ספר ישעיה" → {"found":true,"book":"Isaiah","chapter":1,"verse":1}
"פרק ה" → {"found":true,"book":"CURRENT","chapter":5,"verse":1}
"פסוק ג" → {"found":true,"book":"CURRENT","chapter":1,"verse":3}
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
