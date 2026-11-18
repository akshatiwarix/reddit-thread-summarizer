import type { ChatSettings } from "./openai";
import { extractOpenAiText } from "./openai";
import { postJson } from "./http";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
        temperature: 0.2,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  };
}

export async function completeOpenRouter(
  settings: ChatSettings,
  system: string,
  user: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const request = buildOpenRouterRequest(settings, system, user);
  const payload = await postJson(fetchImpl, "openrouter", request.url, request.init);
  return extractOpenAiText(payload, "openrouter");
}
