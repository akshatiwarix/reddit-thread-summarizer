/**
 * Output budget for one summary: TL;DR, points, agreement, splits and up to five quoted comments
 * come to roughly 700 to 1,200 tokens. Reasoning tokens count against the same limit on every
 * provider, so this leaves room for a little thinking at low effort without inviting a long one.
 * Sent as `max_completion_tokens` (OpenAI reasoning models), `max_tokens` (OpenAI chat models,
 * OpenRouter, Anthropic) and `maxOutputTokens` (Gemini).
 */
export const MAX_OUTPUT_TOKENS = 4096;

/** Reasoning depth asked of every provider. A summary does not need deep reasoning, and it is slow. */
export const REASONING_EFFORT = "low";

/** Give up on a whole streamed response after this long. */
export const STREAM_TIMEOUT_MS = 120_000;
