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
