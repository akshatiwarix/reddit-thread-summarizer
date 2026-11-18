import { createHistoryStore, normalizeHistoryEnabled, type HistoryStorage } from "@rts/core";

const HISTORY_KEY = "history";
const ENABLED_KEY = "historyEnabled";

// Local only: chrome.storage.local is on this device and is covered by the existing "storage" permission.
const localAdapter: HistoryStorage = {
  read: async () => (await browser.storage.local.get(HISTORY_KEY))[HISTORY_KEY],
  write: async (entries) => {
    await browser.storage.local.set({ [HISTORY_KEY]: entries });
  },
};

export const history = createHistoryStore(localAdapter);

export async function loadHistoryEnabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(ENABLED_KEY);
  return normalizeHistoryEnabled(stored[ENABLED_KEY]);
}

export async function saveHistoryEnabled(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [ENABLED_KEY]: enabled });
}
