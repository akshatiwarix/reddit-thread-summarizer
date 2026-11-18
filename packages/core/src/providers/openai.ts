import { asRecord } from "../record";
import type { ProviderId } from "../types";
import { ProviderError } from "./errors";
import { postJson } from "./http";
import { joinTextParts } from "./text";

export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type ChatSettings = { model: string; apiKey: string };

/** gpt-5 and newer, and the o-series, only accept `max_completion_tokens` and the default temperature. */
export function isOpenAiReasoningModel(model: string): boolean {
  return /^(gpt-[5-9]|gpt-\d{2,}|o\d)/i.test(model.trim());
}

export function buildOpenAiRequest(settings: ChatSettings, system: string, user: string) {
  const limits = isOpenAiReasoningModel(settings.model)
    ? // Reasoning tokens count against the limit, so leave room for the JSON.
      { max_completion_tokens: 16000 }
    : { temperature: 0.2, max_tokens: 2500 };
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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
  };
}

export function extractOpenAiText(payload: unknown, provider: ProviderId = "openai"): string {
  const choices = asRecord(payload)?.choices;
  const first = Array.isArray(choices) ? asRecord(choices[0]) : null;
  const text = joinTextParts(asRecord(first?.message)?.content);
  if (!text) {
    throw new ProviderError("The provider returned an empty response.", { kind: "provider", provider });
  }
  return text;
}

export async function completeOpenAi(settings: ChatSettings, system: string, user: string, fetchImpl: typeof fetch): Promise<string> {
  const request = buildOpenAiRequest(settings, system, user);
  const payload = await postJson(fetchImpl, "openai", request.url, request.init);
  return extractOpenAiText(payload);
}
