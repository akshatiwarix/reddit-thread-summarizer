import type { ProviderId } from "../types";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  defaultModel: string;
  models: readonly string[];
  keyHint: string;
  keyUrl: string;
};

export const PROVIDERS: readonly ProviderInfo[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    keyHint: "Starts with sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-sonnet-4-5",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-3-5-haiku-latest"],
    keyHint: "Starts with sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    keyHint: "Starts with AIza",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-4o-mini",
    models: ["openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5", "google/gemini-2.5-flash"],
    keyHint: "Starts with sk-or-",
    keyUrl: "https://openrouter.ai/keys",
  },
];

export function isProviderId(value: unknown): value is ProviderId {
  return value === "openai" || value === "anthropic" || value === "gemini" || value === "openrouter";
}

export function providerInfo(id: ProviderId): ProviderInfo {
  const found = PROVIDERS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown provider ${id}`);
  return found;
}
