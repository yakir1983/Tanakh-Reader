/**
 * Persistent AI-response cache.
 *
 * Two layers:
 *  1. In-memory Map — instant hits, survives within a single process.
 *  2. Replit Key-Value store (REPLIT_DB_URL) — survives restarts and deploys.
 *
 * Explanations and translations of Tanach verses are immutable content,
 * so cached entries never expire.
 */
import crypto from "crypto";
import fs from "fs";
import { logger } from "./logger";

// ── Replit KV URL resolution ───────────────────────────────────────────────────
// In deployments the token in REPLIT_DB_URL rotates; the fresh URL is written
// to /tmp/replitdb. Re-read it periodically.
let cachedDbUrl: string | null = null;
let dbUrlReadAt = 0;

function getDbUrl(): string | null {
  const now = Date.now();
  if (cachedDbUrl && now - dbUrlReadAt < 60 * 60 * 1000) return cachedDbUrl;
  try {
    if (fs.existsSync("/tmp/replitdb")) {
      cachedDbUrl = fs.readFileSync("/tmp/replitdb", "utf8").trim();
      dbUrlReadAt = now;
      return cachedDbUrl;
    }
  } catch {
    /* fall through to env */
  }
  cachedDbUrl = process.env["REPLIT_DB_URL"] ?? null;
  dbUrlReadAt = now;
  return cachedDbUrl;
}

// ── In-memory layer ────────────────────────────────────────────────────────────
const memCache = new Map<string, string>();
const MEM_CACHE_MAX = 5000; // ~ a few MB of Hebrew text at most

function memSet(key: string, value: string) {
  if (memCache.size >= MEM_CACHE_MAX) {
    // Drop oldest entry (Map preserves insertion order)
    const first = memCache.keys().next().value;
    if (first !== undefined) memCache.delete(first);
  }
  memCache.set(key, value);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Short stable hash so cache keys stay valid even if verse text formatting varies slightly upstream. */
export function shortHash(text: string): string {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 10);
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function cacheGet(key: string): Promise<string | null> {
  // 1. memory
  const mem = memCache.get(key);
  if (mem !== undefined) return mem;

  // 2. Replit KV
  const dbUrl = getDbUrl();
  if (!dbUrl) return null;
  try {
    const res = await fetch(`${dbUrl}/${encodeURIComponent(key)}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const raw = await res.text();
    if (!raw) return null;
    memSet(key, raw); // promote to memory
    return raw;
  } catch (err) {
    logger.warn({ err, key }, "aiCache: KV get failed");
    return null;
  }
}

// ── In-flight request coalescing ───────────────────────────────────────────────
// Simultaneous identical cache misses share ONE AI call instead of racing.
const inflight = new Map<string, Promise<string>>();

/**
 * Cache-or-compute with coalescing: returns the cached value if present,
 * otherwise runs `compute` exactly once per key across concurrent callers,
 * stores a non-empty result, and returns it.
 */
export async function cacheGetOrCompute(
  key: string,
  compute: () => Promise<string>,
): Promise<{ value: string; cached: boolean }> {
  const hit = await cacheGet(key);
  if (hit !== null) return { value: hit, cached: true };

  const existing = inflight.get(key);
  if (existing) return { value: await existing, cached: false };

  const promise = (async () => {
    const value = await compute();
    if (value) await cacheSet(key, value);
    return value;
  })();
  inflight.set(key, promise);
  try {
    return { value: await promise, cached: false };
  } finally {
    inflight.delete(key);
  }
}

export async function cacheSet(key: string, value: string): Promise<void> {
  memSet(key, value);
  const dbUrl = getDbUrl();
  if (!dbUrl) return;
  try {
    await fetch(dbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    });
  } catch (err) {
    logger.warn({ err, key }, "aiCache: KV set failed");
  }
}
