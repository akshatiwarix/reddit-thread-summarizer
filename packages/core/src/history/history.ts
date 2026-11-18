import type { ProviderId, ThreadSummary } from "../types";
import { asRecord } from "../record";
import { isProviderId } from "../providers/catalog";
import { parseThreadUrl } from "../reddit/url";

/** Newest entries kept. Saving past this drops the oldest. */
export const MAX_HISTORY_ENTRIES = 200;

export type HistoryEntry = {
  /** The Reddit post id, lowercase. One entry per post, so this is also the dedupe key. */
  id: string;
  /** Canonical thread URL on www.reddit.com (no query string, no comment id). */
  url: string;
  title: string;
  subreddit: string;
  provider: ProviderId;
  model: string;
  /** Unix milliseconds. */
  createdAt: number;
  summary: ThreadSummary;
};

export type NewHistoryEntry = {
  /** Any Reddit URL for the thread. Use the post's own permalink when the user pasted a short or share link. */
  url: string;
  title: string;
  subreddit: string;
  provider: ProviderId;
  model: string;
  summary: ThreadSummary;
  createdAt?: number;
};

/**
 * Where entries live. Each app supplies one (chrome.storage.local, localStorage). `read` returns
 * whatever was stored, untrusted; `write` replaces everything and must throw if it cannot persist.
 */
export type HistoryStorage = {
  read: () => Promise<unknown>;
  write: (entries: HistoryEntry[]) => Promise<void>;
};

export type HistoryStore = {
  /** Newest first. `query` matches title or subreddit, case-insensitive. */
  list: (query?: string) => Promise<HistoryEntry[]>;
  get: (id: string) => Promise<HistoryEntry | null>;
  /** Insert, or replace the entry for the same thread and move it to the top. Caps at 200. */
  save: (entry: NewHistoryEntry) => Promise<HistoryEntry>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

/** The dedupe key for a thread URL: the post id. reddit.com, www, old, m, np, new, redd.it and comment links all agree. */
export function historyIdForUrl(url: string): string | null {
  return parseThreadUrl(url)?.postId ?? null;
}

export function createHistoryStore(adapter: HistoryStorage, now: () => number = Date.now): HistoryStore {
  // Every call reads, changes and writes the whole list. Run them one at a time so two quick calls cannot overwrite each other.
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.catch(() => undefined);
    return result;
  }

  async function load(): Promise<HistoryEntry[]> {
    return normalizeHistory(await adapter.read());
  }

  return {
    list: (query) =>
      serial(async () => filterHistory(await load(), query ?? "")),

    get: (id) =>
      serial(async () => (await load()).find((entry) => entry.id === id) ?? null),

    save: (input) =>
      serial(async () => {
        const ref = parseThreadUrl(input.url);
        if (!ref) throw new Error("Cannot save history for a link that is not a Reddit thread.");
        const entry: HistoryEntry = {
          id: ref.postId,
          url: ref.canonicalUrl,
          title: input.title,
          subreddit: input.subreddit,
          provider: input.provider,
          model: input.model,
          createdAt: input.createdAt ?? now(),
          summary: input.summary,
        };
        const rest = (await load()).filter((existing) => existing.id !== entry.id);
        await adapter.write([entry, ...rest].slice(0, MAX_HISTORY_ENTRIES));
        return entry;
      }),

    remove: (id) =>
      serial(async () => {
        const entries = await load();
        const next = entries.filter((entry) => entry.id !== id);
        if (next.length !== entries.length) await adapter.write(next);
      }),

    clear: () => serial(() => adapter.write([])),
  };
}

export function filterHistory(entries: HistoryEntry[], query: string): HistoryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return entries;
  return entries.filter(
    (entry) => entry.title.toLowerCase().includes(needle) || entry.subreddit.toLowerCase().includes(needle),
  );
}

/** Keep only well-formed entries from stored data, drop duplicate ids, and cap the length. Stored order is kept. */
export function normalizeHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: HistoryEntry[] = [];
  for (const item of value) {
    const entry = toEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
    if (out.length === MAX_HISTORY_ENTRIES) break;
  }
  return out;
}

function toEntry(value: unknown): HistoryEntry | null {
  const r = asRecord(value);
  if (!r) return null;
  const { id, url, title, subreddit, provider, model, createdAt, summary } = r;
  if (
    typeof id !== "string" || !id ||
    typeof url !== "string" ||
    typeof title !== "string" ||
    typeof subreddit !== "string" ||
    !isProviderId(provider) ||
    typeof model !== "string" ||
    typeof createdAt !== "number" || !Number.isFinite(createdAt) ||
    !isSummary(summary)
  ) {
    return null;
  }
  return { id, url, title, subreddit, provider, model, createdAt, summary };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSummary(value: unknown): value is ThreadSummary {
  const r = asRecord(value);
  if (!r) return false;
  if (typeof r.tldr !== "string" || !isStringArray(r.mainPoints) || !isStringArray(r.agreements)) return false;
  if (!Array.isArray(r.disagreements) || !Array.isArray(r.bestComments)) return false;
  const splitsOk = r.disagreements.every((item) => {
    const d = asRecord(item);
    return (
      !!d &&
      typeof d.topic === "string" &&
      Array.isArray(d.sides) &&
      d.sides.length === 2 &&
      d.sides.every((side) => {
        const s = asRecord(side);
        return !!s && typeof s.label === "string" && typeof s.position === "string";
      })
    );
  });
  const commentsOk = r.bestComments.every((item) => {
    const c = asRecord(item);
    return (
      !!c &&
      typeof c.author === "string" &&
      typeof c.excerpt === "string" &&
      typeof c.score === "number" &&
      typeof c.permalink === "string"
    );
  });
  return splitsOk && commentsOk;
}

/** The history toggle is on unless it was stored as exactly false. */
export function normalizeHistoryEnabled(value: unknown): boolean {
  return value !== false;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a calendar date after a week. */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
