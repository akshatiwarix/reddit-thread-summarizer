import { describe, expect, it } from "vitest";
import { fetchRedditThread } from "../src/reddit/fetch-thread";
import { ThreadFetchError } from "../src/reddit/fetch-error";
import { threadPayload, commentChild } from "./fixtures";

const THREAD_URL = "https://www.reddit.com/r/example/comments/abc123/thread_title/";
const payload = threadPayload([commentChild({ id: "c1", body: "Hello", score: 3 })]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("fetchRedditThread", () => {
  it("returns a public thread without calling OAuth", async () => {
    const calls: string[] = [];
    const thread = await fetchRedditThread({
      url: THREAD_URL,
      fetchImpl: async (input) => {
        calls.push(String(input));
        return jsonResponse(payload);
      },
    });
    expect(thread.post.title).toBe("Thread title");
    expect(thread.comments[0]?.body).toBe("Hello");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("www.reddit.com/r/example/comments/abc123.json");
  });

  it("falls back to app-only OAuth when the public endpoint is blocked", async () => {
    const calls: Array<{ url: string; authorization: string }> = [];
    const thread = await fetchRedditThread({
      url: THREAD_URL,
      credentials: { clientId: "app-id", clientSecret: "app-secret" },
      fetchImpl: async (input, init) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        calls.push({ url, authorization: headers.get("authorization") ?? "" });
        if (url.includes("www.reddit.com/r/example")) return jsonResponse({ message: "Forbidden" }, 403);
        if (url.includes("/api/v1/access_token")) {
          expect(headers.get("authorization")).toMatch(/^Basic /);
          expect(atob(headers.get("authorization")?.slice("Basic ".length) ?? "")).toBe("app-id:app-secret");
          return jsonResponse({ access_token: "token-1", token_type: "bearer" });
        }
        expect(url).toContain("oauth.reddit.com/r/example/comments/abc123.json");
        expect(headers.get("authorization")).toBe("Bearer token-1");
        return jsonResponse(payload);
      },
    });
    expect(thread.post.id).toBe("abc123");
    expect(calls.map((call) => call.url)).toHaveLength(3);
  });

  it("does not hide a missing thread behind OAuth", async () => {
    const calls: string[] = [];
    await expect(
      fetchRedditThread({
        url: THREAD_URL,
        credentials: { clientId: "app-id", clientSecret: "app-secret" },
        fetchImpl: async (input) => {
          calls.push(String(input));
          return jsonResponse({ message: "Not Found" }, 404);
        },
      }),
    ).rejects.toMatchObject({ kind: "not_found" });
    expect(calls).toHaveLength(1);
  });

  it("reports a block when no app credentials are configured", async () => {
    await expect(
      fetchRedditThread({
        url: THREAD_URL,
        fetchImpl: async () => jsonResponse({ message: "Forbidden" }, 403),
      }),
    ).rejects.toBeInstanceOf(ThreadFetchError);
    await expect(
      fetchRedditThread({
        url: THREAD_URL,
        fetchImpl: async () => jsonResponse({ message: "Forbidden" }, 403),
      }),
    ).rejects.toMatchObject({ kind: "blocked" });
  });

  it("reports rejected app credentials without echoing the secret", async () => {
    await expect(
      fetchRedditThread({
        url: THREAD_URL,
        credentials: { clientId: "app-id", clientSecret: "app-secret" },
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.includes("www.reddit.com/r/example")) return jsonResponse({ message: "Forbidden" }, 403);
          return jsonResponse({ message: "unauthorized" }, 401);
        },
      }),
    ).rejects.toMatchObject({
      kind: "blocked",
      message: "Reddit rejected the app credentials.",
    });
  });

  it("rejects a URL that is not a thread", async () => {
    await expect(fetchRedditThread({ url: "https://www.reddit.com/r/example", fetchImpl: async () => jsonResponse({}) })).rejects.toMatchObject({
      kind: "invalid_url",
    });
  });

  it("resolves a share link to the canonical thread before fetching JSON", async () => {
    const calls: string[] = [];
    const thread = await fetchRedditThread({
      url: "https://www.reddit.com/r/example/s/AbCdEf1234",
      fetchImpl: async (input) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("/s/")) {
          const response = new Response("<html></html>", { status: 200 });
          Object.defineProperty(response, "url", { value: `${THREAD_URL}?share_id=x` });
          return response;
        }
        return jsonResponse(payload);
      },
    });
    expect(thread.post.id).toBe("abc123");
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("www.reddit.com/r/example/comments/abc123.json");
  });

  it("fails clearly when a share link does not land on a thread", async () => {
    await expect(
      fetchRedditThread({
        url: "https://www.reddit.com/r/example/s/AbCdEf1234",
        fetchImpl: async () => {
          const response = new Response("", { status: 200 });
          Object.defineProperty(response, "url", { value: "https://www.reddit.com/login/" });
          return response;
        },
      }),
    ).rejects.toMatchObject({ kind: "invalid_url" });
  });

  it("reports a network failure while resolving a share link", async () => {
    await expect(
      fetchRedditThread({
        url: "https://www.reddit.com/r/example/s/AbCdEf1234",
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    ).rejects.toMatchObject({ kind: "network" });
  });

  it("fetches a redd.it short link as a thread", async () => {
    const calls: string[] = [];
    await fetchRedditThread({
      url: "https://redd.it/abc123",
      fetchImpl: async (input) => {
        calls.push(String(input));
        return jsonResponse(payload);
      },
    });
    expect(calls).toEqual(["https://www.reddit.com/comments/abc123.json?limit=500&raw_json=1&sort=top"]);
  });

  it("follows the share-link redirect with the caller's cookie mode and lands on the thread, even through old.reddit", async () => {
    const inits: Array<RequestInit | undefined> = [];
    const calls: string[] = [];
    const thread = await fetchRedditThread({
      url: "https://old.reddit.com/r/example/s/AbCdEf1234",
      requestCredentials: "include",
      userAgent: "",
      fetchImpl: async (input, init) => {
        const url = String(input);
        calls.push(url);
        inits.push(init);
        if (url.includes("/s/")) {
          const response = new Response("<html></html>", { status: 200 });
          Object.defineProperty(response, "url", { value: `${THREAD_URL}?share_id=x&utm_source=share` });
          return response;
        }
        return jsonResponse(payload);
      },
    });
    expect(thread.post.id).toBe("abc123");
    expect(calls[0]).toBe("https://old.reddit.com/r/example/s/AbCdEf1234");
    expect(inits[0]).toMatchObject({ redirect: "follow", credentials: "include" });
    expect(inits[1]).toMatchObject({ credentials: "include" });
    expect(new Headers(inits[0]?.headers).has("user-agent")).toBe(false);
    expect(new Headers(inits[1]?.headers).has("user-agent")).toBe(false);
  });

  it("reports a share link that 404s as not found", async () => {
    await expect(
      fetchRedditThread({
        url: "https://www.reddit.com/r/example/s/AbCdEf1234",
        fetchImpl: async () => new Response("", { status: 404 }),
      }),
    ).rejects.toMatchObject({ kind: "not_found" });
  });

  it("stops when the caller aborts instead of falling back or reporting a block", async () => {
    const controller = new AbortController();
    controller.abort(new DOMException("stop", "AbortError"));
    await expect(
      fetchRedditThread({
        url: THREAD_URL,
        signal: controller.signal,
        credentials: { clientId: "a", clientSecret: "b" },
        fetchImpl: async (_input, init) => {
          if (init?.signal?.aborted) throw new DOMException("stop", "AbortError");
          return jsonResponse(payload);
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
