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
  // Use the RIGHTMOST X-Forwarded-For entry: it is appended by the trusted
  // Replit ingress proxy. The leftmost entries are client-controlled and can
  // be spoofed to rotate identities and bypass the limits.
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const parts = forwarded.split(",");
    return parts[parts.length - 1].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

// ── Error responses ────────────────────────────────────────────────────────────
const MSG_PER_MINUTE =
  "אנא המתן רגע לפני שאלה נוספת. ניתן לשאול עד 5 שאלות בדקה.";

const MSG_PER_DAY =
  "הגעת למכסת השאלות היומית שלך כדי לשמור על יציבות השרת. נתראה מחר עם שאלות חדשות על התנ\"ך!";

// ── Browse limiter store (60 req/min, 10-minute block on breach) ──────────────
interface BrowseEntry {
  count: number;
  resetAt: number;      // minute-window reset (epoch ms)
  blockedUntil: number; // 0 = not blocked
}

const browseStore = new Map<string, BrowseEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of browseStore.entries()) {
    if (now > entry.resetAt && now > entry.blockedUntil) browseStore.delete(key);
  }
}, 10 * 60 * 1000);

const BROWSE_MAX_PER_MINUTE = 60;
const BROWSE_BLOCK_MS = 10 * 60 * 1000;

const MSG_BROWSE_BLOCKED =
  "זוהתה פעילות חריגה מהמכשיר שלך. הגישה נחסמה זמנית ל-10 דקות כדי להגן על השרת.";

/**
 * General browsing limiter: 60 requests/minute per IP.
 * Exceeding the limit blocks the IP for 10 minutes.
 * Applied to per-page AI endpoints (explain/translate) — NOT to voice Q&A,
 * which has its own stricter aiRateLimiter (5/min, 50/day).
 */
export function browseRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip  = getIP(req);
  const now = Date.now();

  let entry = browseStore.get(ip);
  if (!entry) {
    entry = { count: 0, resetAt: now + 60_000, blockedUntil: 0 };
    browseStore.set(ip, entry);
  }

  // Currently blocked?
  if (entry.blockedUntil > now) {
    res.setHeader("Retry-After", String(Math.ceil((entry.blockedUntil - now) / 1000)));
    res.status(429).json({ error: MSG_BROWSE_BLOCKED, code: "BLOCKED" });
    return;
  }

  // Reset window if expired
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }

  entry.count++;

  if (entry.count > BROWSE_MAX_PER_MINUTE) {
    entry.blockedUntil = now + BROWSE_BLOCK_MS;
    res.setHeader("Retry-After", String(Math.ceil(BROWSE_BLOCK_MS / 1000)));
    res.status(429).json({ error: MSG_BROWSE_BLOCKED, code: "BLOCKED" });
    return;
  }

  next();
}

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
