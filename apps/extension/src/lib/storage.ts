import { normalizeSettings, type ProviderSettings } from "@rts/core";

const STORAGE_KEY = "settings";

export async function loadSettings(): Promise<ProviderSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return normalizeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: ProviderSettings): Promise<void> {
  const cleaned: ProviderSettings = {
    provider: settings.provider,
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
  };
  await browser.storage.local.set({ [STORAGE_KEY]: cleaned });
}
