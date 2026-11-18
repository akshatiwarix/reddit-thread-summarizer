import { asRecord } from "../record";
import { ProviderError } from "./errors";
import { postJson } from "./http";
import { joinTextParts } from "./text";
import type { ChatSettings } from "./openai";

export function buildGeminiRequest(settings: ChatSettings, system: string, user: string) {
  const model = encodeURIComponent(settings.model);
  const key = encodeURIComponent(settings.apiKey);
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    init: {
      method: "POST" as const,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
  };
}

export function extractGeminiText(payload: unknown): string {
  const record = asRecord(payload);
  const feedback = asRecord(record?.promptFeedback);
  if (typeof feedback?.blockReason === "string" && feedback.blockReason) {
    throw new ProviderError(`Gemini blocked the request (${feedback.blockReason}).`, {
      kind: "provider",
      provider: "gemini",
    });
  }
  const candidates = record?.candidates;
  const first = Array.isArray(candidates) ? asRecord(candidates[0]) : null;
  const text = joinTextParts(asRecord(first?.content)?.parts);
  if (!text) {
    throw new ProviderError("Gemini returned an empty response.", { kind: "provider", provider: "gemini" });
  }
  return text;
}

export async function completeGemini(settings: ChatSettings, system: string, user: string, fetchImpl: typeof fetch): Promise<string> {
  const request = buildGeminiRequest(settings, system, user);
  const payload = await postJson(fetchImpl, "gemini", request.url, request.init);
  return extractGeminiText(payload);
}
