import type { ProviderId, ProviderSettings } from "../types";
import { asRecord } from "../record";
import { isProviderId, providerInfo } from "./catalog";

export function defaultSettings(): ProviderSettings {
  return {
    provider: "openai",
    model: providerInfo("openai").defaultModel,
    apiKey: "",
  };
}

export function normalizeSettings(value: unknown): ProviderSettings {
  const record = asRecord(value);
  const provider: ProviderId = isProviderId(record?.provider) ? record.provider : "openai";
  const fallback = providerInfo(provider).defaultModel;
  const model = typeof record?.model === "string" && record.model.trim() ? record.model.trim() : fallback;
  const apiKey = typeof record?.apiKey === "string" ? record.apiKey : "";
  return { provider, model, apiKey };
}

/** Keep a custom model name when the provider changes. Reset catalog defaults to the new provider. */
export function modelForProvider(currentModel: string, previous: ProviderId, next: ProviderId): string {
  if (previous === next) return currentModel;
  const previousInfo = providerInfo(previous);
  const nextInfo = providerInfo(next);
  const trimmed = currentModel.trim();
  const wasDefault = trimmed === "" || trimmed === previousInfo.defaultModel || previousInfo.models.includes(trimmed);
  return wasDefault ? nextInfo.defaultModel : trimmed;
}
