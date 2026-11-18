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
    defaultModel: "gpt-6-luna",
    models: ["gpt-6-luna", "gpt-6.1-terra", "gpt-6.2-sol", "gpt-6.2-astra"],
    keyHint: "Starts with sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    defaultModel: "claude-haiku-5-5",
    models: ["claude-haiku-5-5", "claude-sonnet-5-5"],
    keyHint: "Starts with sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-3.6-flash",
    models: ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview"],
    keyHint: "Starts with AIza",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "openai/gpt-6-luna",
    models: ["openai/gpt-6-luna", "anthropic/claude-haiku-5.5", "google/gemini-3.6-flash", "anthropic/claude-sonnet-5.5"],
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
