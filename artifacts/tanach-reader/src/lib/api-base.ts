/**
 * Returns the API server base URL.
 *
 * Dev / Replit production:  VITE_API_BASE_URL is unset → empty string
 *   → all fetch('/api/...') calls are relative and reach the API server
 *     via Replit's built-in path-based router (/api → port 8080).
 *
 * Netlify / external static hosting:
 *   Set VITE_API_BASE_URL=https://<your-replit-app>.replit.app in the
 *   Netlify dashboard (Site settings → Environment variables), then
 *   trigger a redeploy.  All API calls become absolute and bypass the
 *   static host entirely.
 */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
}

/**
 * Pings /api/healthz to wake a sleeping server.
 * Silently swallows errors — it's fire-and-forget.
 */
async function wakeServer(): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/healthz`, { method: 'GET' });
  } catch {
    // ignore — best-effort wake-up
  }
}

/** How long to wait (ms) before the retry after a network failure. */
const RETRY_DELAY_MS = 4000;

/**
 * fetch() with one automatic retry on network-level failure.
 *
 * When the server is sleeping, the first request throws a TypeError
 * (network error).  We ping /api/healthz, wait RETRY_DELAY_MS, then
 * try the original request once more.  If the retry also fails the error
 * propagates normally so callers can surface it to the user.
 *
 * @param onWaking  optional callback called when the retry is about to start,
 *                  so the UI can show "מעיר שרת…"
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  onWaking?: () => void,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    // Likely a network error (server sleeping / unreachable) — try once more
    onWaking?.();
    wakeServer(); // fire-and-forget ping to accelerate boot
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    return fetch(url, init); // let this error propagate if it fails again
  }
}
