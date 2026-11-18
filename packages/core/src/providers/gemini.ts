import { asRecord } from "../record";
import { ProviderError } from "./errors";
import { MAX_OUTPUT_TOKENS } from "./limits";
import type { ChatSettings } from "./openai";

/** `thinkingLevel` is Gemini 3+. Earlier models return an error when it is set. */
function supportsThinkingLevel(model: string): boolean {
  return /^gemini-(?:[3-9]|\d{2,})/i.test(model.trim());
}

export function buildGeminiRequest(settings: ChatSettings, system: string, user: string) {
  const model = encodeURIComponent(settings.model);
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    init: {
      method: "POST" as const,
      headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          ...(supportsThinkingLevel(settings.model) ? { thinkingConfig: { thinkingLevel: "LOW" } } : {}),
        },
      }),
    },
  };
}

/** Text carried by one streamGenerateContent chunk. Thought summaries are skipped. */
export function geminiDelta(payload: unknown): string {
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
  const parts = asRecord(first?.content)?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      const item = asRecord(part);
      return item?.thought === true || typeof item?.text !== "string" ? "" : item.text;
    })
    .join("");
}
