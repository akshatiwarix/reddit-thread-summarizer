import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY_ENTRIES,
  createHistoryStore,
  formatRelativeTime,
  historyIdForUrl,
  normalizeHistory,
  normalizeHistoryEnabled,
  type HistoryEntry,
  type HistoryStorage,
  type NewHistoryEntry,
} from "../src/index";

const summary = {
  tldr: "Short.",
  mainPoints: ["a"],
  agreements: ["b"],
  disagreements: [{ topic: "t", sides: [{ label: "x", position: "p" }, { label: "y", position: "q" }] as [any, any] }],
  bestComments: [{ author: "alice", excerpt: "hi", score: 3, permalink: "/r/example/comments/abc123/t/c1/" }],
};

function memory(initial: unknown = []) {
  let data: unknown = initial;
  const storage: HistoryStorage = {
    read: async () => structuredClone(data),
    write: async (entries) => {
      data = structuredClone(entries);
    },
  };
  return { storage, peek: () => data as HistoryEntry[] };
}

function input(postId: string, over: Partial<NewHistoryEntry> = {}): NewHistoryEntry {
  return {
    url: `https://www.reddit.com/r/example/comments/${postId}/some_title/`,
    title: `Title ${postId}`,
    subreddit: "example",
    provider: "openai",
    model: "m",
    summary,
    ...over,
  };
}

function store(initial?: unknown) {
  const mem = memory(initial);
  let clock = 1000;
  return { ...mem, history: createHistoryStore(mem.storage, () => clock++) };
}

describe("history store", () => {
  it("starts empty and inserts an entry with all fields", async () => {
    const { history } = store();
    expect(await history.list()).toEqual([]);
    const saved = await history.save(input("abc123"));
    expect(saved).toMatchObject({
      id: "abc123",
      url: "https://www.reddit.com/r/example/comments/abc123/some_title/",
      title: "Title abc123",
      subreddit: "example",
      provider: "openai",
      model: "m",
      createdAt: 1000,
      summary,
    });
    expect(await history.get("abc123")).toEqual(saved);
    expect(await history.get("nope")).toBeNull();
  });

  it("lists newest first", async () => {
    const { history } = store();
    await history.save(input("aaa111"));
    await history.save(input("bbb222"));
    await history.save(input("ccc333"));
    expect((await history.list()).map((e) => e.id)).toEqual(["ccc333", "bbb222", "aaa111"]);
  });

  it("replaces the same thread and moves it to the top without duplicating", async () => {
    const { history } = store();
    await history.save(input("aaa111", { title: "old" }));
    await history.save(input("bbb222"));
    await history.save(input("aaa111", { title: "new", model: "m2" }));
    const list = await history.list();
    expect(list.map((e) => e.id)).toEqual(["aaa111", "bbb222"]);
    expect(list[0]).toMatchObject({ title: "new", model: "m2" });
  });

  it("treats reddit.com, www, old, m, tracking params and comment links as one thread", async () => {
    const { history } = store();
    const urls = [
      "https://reddit.com/r/example/comments/abc123/some_title/",
      "https://www.reddit.com/r/example/comments/abc123/some_title/?utm_source=share&utm_medium=web",
      "https://old.reddit.com/r/example/comments/abc123/some_title/",
      "https://m.reddit.com/r/Example/comments/ABC123/some_title/c9x8y7/",
      "https://www.reddit.com/comments/abc123",
      "https://redd.it/abc123",
    ];
    for (const url of urls) await history.save(input("ignored", { url }));
    const list = await history.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("abc123");
    expect(list[0]?.url).not.toContain("?");
    for (const url of urls) expect(historyIdForUrl(url)).toBe("abc123");
  });

  it("does not collapse different threads", async () => {
    const { history } = store();
    await history.save(input("abc123"));
    await history.save(input("abc124"));
    await history.save(input("abc123", { url: "https://old.reddit.com/r/other/comments/abc124/x/" }));
    expect((await history.list()).map((e) => e.id).sort()).toEqual(["abc123", "abc124"]);
  });

  it("rejects a url that is not a thread", async () => {
    const { history } = store();
    await expect(history.save(input("x", { url: "https://example.com/a" }))).rejects.toThrow();
    expect(await history.list()).toEqual([]);
  });

  it("caps at 200 and drops the oldest", async () => {
    const { history } = store();
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) await history.save(input(`p${String(i).padStart(4, "0")}`));
    const list = await history.list();
    expect(list).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(list[0]?.id).toBe(`p${String(MAX_HISTORY_ENTRIES + 4).padStart(4, "0")}`);
    expect(list.at(-1)?.id).toBe("p0005");
    expect(list.some((e) => e.id === "p0000")).toBe(false);
  });

  it("replacing at the cap does not drop anything", async () => {
    const { history } = store();
    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) await history.save(input(`p${String(i).padStart(4, "0")}`));
    await history.save(input("p0000"));
    const list = await history.list();
    expect(list).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(list[0]?.id).toBe("p0000");
  });

  it("deletes one entry", async () => {
    const { history, peek } = store();
    await history.save(input("aaa111"));
    await history.save(input("bbb222"));
    await history.remove("aaa111");
    expect((await history.list()).map((e) => e.id)).toEqual(["bbb222"]);
    await history.remove("missing");
    expect(peek()).toHaveLength(1);
  });

  it("clears everything", async () => {
    const { history } = store();
    await history.save(input("aaa111"));
    await history.save(input("bbb222"));
    await history.clear();
    expect(await history.list()).toEqual([]);
  });

  it("filters by title or subreddit, case-insensitive", async () => {
    const { history } = store();
    await history.save(input("aaa111", { title: "Best Espresso Machine", subreddit: "coffee" }));
    await history.save(input("bbb222", { title: "Rust lifetimes", subreddit: "programming" }));
    expect((await history.list("espresso")).map((e) => e.id)).toEqual(["aaa111"]);
    expect((await history.list("  PROGRAM ")).map((e) => e.id)).toEqual(["bbb222"]);
    expect(await history.list("zzz")).toEqual([]);
    expect(await history.list("   ")).toHaveLength(2);
  });

  it("keeps existing entries when a write fails", async () => {
    const mem = memory();
    let fail = false;
    const history = createHistoryStore({
      read: mem.storage.read,
      write: async (entries) => {
        if (fail) throw new Error("QuotaExceededError");
        await mem.storage.write(entries);
      },
    });
    await history.save(input("aaa111"));
    fail = true;
    await expect(history.save(input("bbb222"))).rejects.toThrow("QuotaExceededError");
    fail = false;
    expect((await history.list()).map((e) => e.id)).toEqual(["aaa111"]);
  });

  it("does not lose entries when saves overlap", async () => {
    const { history } = store();
    await Promise.all([history.save(input("aaa111")), history.save(input("bbb222")), history.save(input("ccc333"))]);
    expect(await history.list()).toHaveLength(3);
  });
});

describe("normalizeHistory", () => {
  const good: HistoryEntry = {
    id: "abc123",
    url: "https://www.reddit.com/comments/abc123/",
    title: "t",
    subreddit: "s",
    provider: "openai",
    model: "m",
    createdAt: 5,
    summary,
  };

  it("keeps good entries in order and drops malformed or duplicate ones", () => {
    const out = normalizeHistory([
      good,
      { ...good, id: "dup" },
      { ...good, id: "abc123", title: "dupe id" },
      { ...good, id: "bad1", provider: "nope" },
      { ...good, id: "bad2", summary: { tldr: 1 } },
      { ...good, id: "bad3", createdAt: "yesterday" },
      null,
      "x",
    ]);
    expect(out.map((e) => e.id)).toEqual(["abc123", "dup"]);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizeHistory(undefined)).toEqual([]);
    expect(normalizeHistory({})).toEqual([]);
  });
});

describe("helpers", () => {
  it("history toggle defaults on", () => {
    expect(normalizeHistoryEnabled(undefined)).toBe(true);
    expect(normalizeHistoryEnabled(true)).toBe(true);
    expect(normalizeHistoryEnabled(false)).toBe(false);
  });

  it("formats relative time", () => {
    const now = Date.UTC(2026, 10, 18, 12);
    expect(formatRelativeTime(now - 5_000, now)).toBe("just now");
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe("2 d ago");
    expect(formatRelativeTime(now - 30 * 86_400_000, now)).toMatch(/2026/);
    expect(formatRelativeTime(now + 10_000, now)).toBe("just now");
  });
});
