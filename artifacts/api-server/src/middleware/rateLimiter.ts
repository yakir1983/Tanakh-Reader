import { Request, Response, NextFunction } from "express";

// ── In-memory store ────────────────────────────────────────────────────────────
interface BucketEntry {
  minuteCount: number;
  minuteResetAt: number; // epoch ms
  dayCount: number;
  dayResetAt: number;   // epoch ms
}

const store = new Map<string, BucketEntry>();

// Cleanup stale keys every 10 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.dayResetAt) store.delete(key);
  }
}, 10 * 60 * 1000);

// ── Limits ─────────────────────────────────────────────────────────────────────
const MAX_PER_MINUTE = 5;
const MAX_PER_DAY    = 50;

// ── Helper ─────────────────────────────────────────────────────────────────────
function getIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

// ── Error responses ────────────────────────────────────────────────────────────
const MSG_PER_MINUTE =
  "אנא המתן רגע לפני שאלה נוספת. ניתן לשאול עד 5 שאלות בדקה.";

const MSG_PER_DAY =
  "הגעת למכסת השאלות היומית שלך כדי לשמור על יציבות השרת. נתראה מחר עם שאלות חדשות על התנ\"ך!";

// ── Middleware factory ─────────────────────────────────────────────────────────
export function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip  = getIP(req);
  const now = Date.now();

  let entry = store.get(ip);

  if (!entry) {
    entry = {
      minuteCount: 0,
      minuteResetAt: now + 60_000,
      dayCount: 0,
      dayResetAt: now + 24 * 60 * 60_000,
    };
    store.set(ip, entry);
  }

  // Reset minute bucket if expired
  if (now > entry.minuteResetAt) {
    entry.minuteCount = 0;
    entry.minuteResetAt = now + 60_000;
  }

  // Reset day bucket if expired
  if (now > entry.dayResetAt) {
    entry.dayCount = 0;
    entry.dayResetAt = now + 24 * 60 * 60_000;
  }

  // Check daily cap first (higher priority message)
  if (entry.dayCount >= MAX_PER_DAY) {
    res.setHeader("Retry-After", String(Math.ceil((entry.dayResetAt - now) / 1000)));
    res.status(429).json({ error: MSG_PER_DAY, code: "DAILY_LIMIT" });
    return;
  }

  // Check per-minute cap
  if (entry.minuteCount >= MAX_PER_MINUTE) {
    res.setHeader("Retry-After", String(Math.ceil((entry.minuteResetAt - now) / 1000)));
    res.status(429).json({ error: MSG_PER_MINUTE, code: "MINUTE_LIMIT" });
    return;
  }

  // Increment counters
  entry.minuteCount++;
  entry.dayCount++;

  next();
}
