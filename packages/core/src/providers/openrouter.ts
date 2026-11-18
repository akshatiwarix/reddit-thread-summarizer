import { MAX_OUTPUT_TOKENS, REASONING_EFFORT } from "./limits";
import type { ChatSettings } from "./openai";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Anthropic and OpenAI models on OpenRouter do not list `temperature` as supported, so leave it out for them. */
function supportsTemperature(model: string): boolean {
  return !/^(anthropic|openai)\//i.test(model.trim());
}

export function buildOpenRouterRequest(settings: ChatSettings, system: string, user: string) {
  return {
    url: OPENROUTER_URL,
    init: {
      method: "POST" as const,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/akshatiwarix/reddit-thread-summarizer",
        "X-Title": "Reddit Thread Summarizer",
      },
      body: JSON.stringify({
        model: settings.model,
        ...(supportsTemperature(settings.model) ? { temperature: 0.2 } : {}),
        max_tokens: MAX_OUTPUT_TOKENS,
        // Ignored by models that do not reason.
        reasoning: { effort: REASONING_EFFORT },
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  };
}
