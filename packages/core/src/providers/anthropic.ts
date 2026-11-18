import { asRecord } from "../record";
import { MAX_OUTPUT_TOKENS, REASONING_EFFORT } from "./limits";
import { streamError } from "./stream";
import type { ChatSettings } from "./openai";

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const ANTHROPIC_VERSION = "2023-06-01";

/** `output_config.effort` exists on the Claude 4.5+ families. Older models reject unknown fields. */
function supportsEffort(model: string): boolean {
  return /^claude-(haiku|sonnet|opus|fable|mythos)-(?:[5-9]|4-[5-9])/i.test(model.trim());
}

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
        // Current Claude models reject `temperature`. Thinking tokens count against max_tokens.
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(supportsEffort(settings.model) ? { output_config: { effort: REASONING_EFFORT } } : {}),
        stream: true,
        system,
        messages: [{ role: "user", content: user }],
      }),
    },
  };
}

/** Text carried by one Messages stream event. Thinking deltas are ignored. */
export function anthropicDelta(payload: unknown): string {
  const record = asRecord(payload);
  if (record?.type === "error") throw streamError("anthropic", record.error);
  if (record?.type !== "content_block_delta") return "";
  const delta = asRecord(record.delta);
  return delta?.type === "text_delta" && typeof delta.text === "string" ? delta.text : "";
}
