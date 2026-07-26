---
name: OpenAI model behavior via Replit proxy
description: Which models work reliably for which tasks in this project's API server
---

## Navigate extraction (short JSON output)
- **gpt-5-mini** works well with no `response_format`. Use regex `/\{[\s\S]*?\}/` to extract JSON from response.
- `response_format: { type: "json_object" }` + low `max_completion_tokens` (≤128) causes 400 or empty content — avoid.
- `max_completion_tokens: 512` is sufficient.

## Q&A (open-ended Hebrew text output)
- **gpt-5.6-terra** is the only model that reliably answers Q&A with context.
- `gpt-5-mini` and `gpt-5-nano`: return `finish_reason: length, content: ""` for Q&A calls (especially with context), even with `max_completion_tokens: 512`. Avoid for open-ended Hebrew text.
- `gpt-5.6-luna`: same empty-content issue as gpt-5-mini for Hebrew Q&A with context.
- Context must be merged into a single user message (not as a second user message): `ctxNote + transcript`.

**Why:** The gpt-5-nano/mini models seem to have a very small effective output token budget for Hebrew open-ended generation via the Replit proxy, hitting `finish_reason: length` with 0 tokens of content even on short prompts. gpt-5.6-terra does not have this issue.

**How to apply:** For any open-ended Hebrew text generation on this project, always use `gpt-5.6-terra`. For structured JSON extraction (navigation), `gpt-5-mini` is fine and faster.
