import { defaultSettings, normalizeSettings, type ProviderSettings } from "@rts/core";

const KEY = "rts.settings.v1";

export function loadSettings(): ProviderSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    return normalizeSettings(JSON.parse(raw) as unknown);
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: ProviderSettings): void {
  const cleaned: ProviderSettings = {
    provider: settings.provider,
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(cleaned));
}

export function clearSettings(): void {
  window.localStorage.removeItem(KEY);
}
