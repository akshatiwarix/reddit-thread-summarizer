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
});
