import {
  createHistoryStore,
  normalizeHistoryEnabled,
  type HistoryEntry,
  type HistoryStorage,
} from "@rts/core";

const HISTORY_KEY = "rts.history.v1";
const ENABLED_KEY = "rts.historyEnabled.v1";

// localStorage is synchronous and holds ~5 MB. 200 summaries is around 1 MB, so it fits. If storage is full or
// blocked (private mode, quota), setItem throws; the store passes the error up and the old entries stay as they were.
const localAdapter: HistoryStorage = {
  read: async () => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as unknown) : [];
    } catch {
      return [];
    }
  },
  write: async (entries: HistoryEntry[]) => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  },
};

export const history = createHistoryStore(localAdapter);

export function loadHistoryEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY);
    return normalizeHistoryEnabled(raw === null ? undefined : (JSON.parse(raw) as unknown));
  } catch {
    return true;
  }
}

export function saveHistoryEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
  } catch {
    // Not persisted; the toggle still applies for this page load.
  }
}
