import { asRecord } from "../record";
import type { ProviderId } from "../types";

export type ProviderErrorKind = "bad_key" | "rate_limit" | "invalid_output" | "network" | "provider";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status?: number;
  readonly provider?: ProviderId;

  constructor(message: string, options: { kind: ProviderErrorKind; status?: number; provider?: ProviderId }) {
    super(message);
    this.name = "ProviderError";
    this.kind = options.kind;
    this.status = options.status;
    this.provider = options.provider;
  }
}

const LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

export function providerLabel(provider: ProviderId): string {
  return LABELS[provider];
}

function errorMessage(bodyText: string): string {
  try {
    const record = asRecord(JSON.parse(bodyText) as unknown);
    const nested = asRecord(record?.error);
    if (typeof nested?.message === "string") return nested.message;
    if (typeof record?.message === "string") return record.message;
  } catch {
    return "";
  }
  return "";
}

function looksLikeInvalidKey(bodyText: string): boolean {
  const lower = `${bodyText}\n${errorMessage(bodyText)}`.toLowerCase();
  return (
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid_api_key")
  );
}

function safeDetail(bodyText: string): string {
  const message = errorMessage(bodyText).replace(/\s+/g, " ").trim();
  if (!message || /sk-|api[_ ]?key|bearer /i.test(message)) return "";
  return message.slice(0, 180);
}

export function errorFromResponse(provider: ProviderId, status: number, bodyText: string): ProviderError {
  if (status === 429) {
    return new ProviderError(`${providerLabel(provider)} rate limit was hit. Wait a moment and try again.`, {
      kind: "rate_limit",
      provider,
      status,
    });
  }

  if (status === 401 || status === 403 || looksLikeInvalidKey(bodyText)) {
    return new ProviderError(`The ${providerLabel(provider)} API key was rejected. Check the key and try again.`, {
      kind: "bad_key",
      provider,
      status,
    });
  }

  const detail = safeDetail(bodyText);
  const suffix = detail ? ` ${detail}` : "";
  return new ProviderError(`${providerLabel(provider)} returned HTTP ${status}.${suffix}`, {
    kind: "provider",
    provider,
    status,
  });
}
