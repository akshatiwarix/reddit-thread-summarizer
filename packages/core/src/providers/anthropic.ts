import { asRecord } from "../record";
import { ProviderError } from "./errors";
import { postJson } from "./http";
import { joinTextParts } from "./text";
import type { ChatSettings } from "./openai";

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

export function buildAnthropicRequest(settings: ChatSettings, system: string, user: string) {
  return {
    url: ANTHROPIC_URL,
    init: {
      method: "POST" as const,
      headers: {
        "x-api-key": settings.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
        // Anthropic only sends CORS headers when this opt-in is present.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 2500,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    },
  };
}

export function extractAnthropicText(payload: unknown): string {
  const text = joinTextParts(asRecord(payload)?.content);
  if (!text) {
    throw new ProviderError("Anthropic returned an empty response.", { kind: "provider", provider: "anthropic" });
  }
  return text;
}

export async function completeAnthropic(
  settings: ChatSettings,
  system: string,
  user: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const request = buildAnthropicRequest(settings, system, user);
  const payload = await postJson(fetchImpl, "anthropic", request.url, request.init);
  return extractAnthropicText(payload);
}
