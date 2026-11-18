import { asRecord } from "../record";
import type { ProviderId } from "../types";
import { MAX_OUTPUT_TOKENS, REASONING_EFFORT } from "./limits";
import { streamError } from "./stream";

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type ChatSettings = { model: string; apiKey: string };

/** gpt-5 and newer, and the o-series, only accept `max_completion_tokens` and the default temperature. */
export function isOpenAiReasoningModel(model: string): boolean {
  return /^(gpt-[5-9]|gpt-\d{2,}|o\d)/i.test(model.trim());
}

export function buildOpenAiRequest(settings: ChatSettings, system: string, user: string) {
  const limits = isOpenAiReasoningModel(settings.model)
    ? // Reasoning tokens count against the limit. Low effort keeps them short.
      { max_completion_tokens: MAX_OUTPUT_TOKENS, reasoning_effort: REASONING_EFFORT }
    : { temperature: 0.2, max_tokens: MAX_OUTPUT_TOKENS };
  return {
    url: OPENAI_URL,
    init: {
      method: "POST" as const,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        ...limits,
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  };
}

/** Text carried by one chat-completions stream chunk. Shared with OpenRouter. */
export function openAiDelta(payload: unknown, provider: ProviderId = "openai"): string {
  const record = asRecord(payload);
  if (record?.error) throw streamError(provider, record.error);
  const choices = record?.choices;
  const first = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const content = asRecord(first?.delta)?.content;
  return typeof content === "string" ? content : "";
}
