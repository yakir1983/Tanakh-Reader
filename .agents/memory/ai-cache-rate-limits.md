---
name: AI cache & rate-limit architecture
description: How the api-server caches AI responses and splits rate limits; pitfalls found during review.
---

## Rules
- AI explanations/translations of Tanach verses are immutable → cached forever in Replit KV (URL from /tmp/replitdb, fallback REPLIT_DB_URL) with an in-memory layer and in-flight coalescing.
- Rate limits are split: strict 5/min + 50/day applies ONLY to voice Q&A; browsing endpoints get 60/min per IP with a 10-minute auto-block.
- **Why:** per-page AI calls were re-billed on every page flip; a single shared limiter throttled normal reading.

## Pitfalls (from architect review)
- X-Forwarded-For: use the RIGHTMOST entry (appended by Replit ingress); leftmost is client-spoofable.
- gpt-5-mini is a reasoning model — small max_completion_tokens (~120) is eaten by reasoning and yields empty content; give ≥600 headroom even for tiny JSON outputs.
- Always validate model JSON server-side (book whitelist + numeric ranges) before returning navigation targets.
- Bound request text sizes to prevent unbounded KV growth from unauthenticated cache writes.
