import { describe, expect, it, vi } from "vitest";
import { buildOpenRouterRequest } from "../src/providers/openrouter";
import { PROVIDERS } from "../src/providers/catalog";
import { summarizeThread } from "../src/providers/summarize";
import { warmUpProvider } from "../src/providers/warm-up";
import type { ParsedThread, ProviderId } from "../src/types";

const thread: ParsedThread = {
  post: {
    id: "abc123",
    title: "T",
    author: "op",
    selftext: "Body",
    score: 1,
    subreddit: "x",
    permalink: "/r/x/comments/abc123/t/",
    url: "https://www.reddit.com/r/x/comments/abc123/t/",
    createdUtc: 1,
    numComments: 0,
    linkFlairText: null,
    over18: false,
  },
  comments: [],
};

describe("OpenRouter request", () => {
  it("builds a valid streaming request for anthropic/claude-haiku-5.5", () => {
    const { url, init } = buildOpenRouterRequest({ model: "anthropic/claude-haiku-5.5", apiKey: "k" }, "s", "u");
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer k", "Content-Type": "application/json" });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: "anthropic/claude-haiku-5.5",
      stream: true,
      max_tokens: 4096,
      reasoning: { effort: "low" },
    });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("max_completion_tokens");
  });

  it("keeps temperature for other vendors' models", () => {
    const body = JSON.parse(buildOpenRouterRequest({ model: "meta-llama/llama-4", apiKey: "k" }, "s", "u").init.body);
    expect(body.temperature).toBe(0.2);
  });

  it("every catalog model builds a request", () => {
    expect(PROVIDERS.find((p) => p.id === "openrouter")?.models).toContain("anthropic/claude-haiku-5.5");
  });
});

describe("summarizeThread with a browser-style fetch", () => {
  // window.fetch throws "Illegal invocation" when called as a method of another object.
  function browserFetch(seen: string[]): typeof fetch {
    return function (this: unknown, input: RequestInfo | URL) {
      if (this !== undefined && this !== globalThis) return Promise.reject(new TypeError("Illegal invocation"));
      seen.push(String(input));
      const chunk = (data: unknown) => `data: ${JSON.stringify(data)}\n\n`;
      const text = "## TL;DR\nShort.\n\n## Main points\n- a\n";
      const body =
        String(input).includes("anthropic.com")
          ? chunk({ type: "content_block_delta", delta: { type: "text_delta", text } })
          : String(input).includes("googleapis")
            ? chunk({ candidates: [{ content: { parts: [{ text }] } }] })
            : chunk({ choices: [{ delta: { content: text } }] }) + "data: [DONE]\n\n";
      return Promise.resolve(new Response(body));
    } as typeof fetch;
  }

  const models: Record<ProviderId, string> = {
    openai: "gpt-6-luna",
    anthropic: "claude-haiku-5-5",
    gemini: "gemini-3.6-flash",
    openrouter: "anthropic/claude-haiku-5.5",
  };

  for (const provider of Object.keys(models) as ProviderId[]) {
    it(`${provider} reaches its endpoint`, async () => {
      const seen: string[] = [];
      const summary = await summarizeThread({
        thread,
        provider,
        model: models[provider],
        apiKey: "k",
        fetchImpl: browserFetch(seen),
      });
      expect(seen).toHaveLength(1);
      expect(summary.tldr).toContain("Short.");
    });
  }

  it("a provider failure after warm-up failure still reports the provider error", async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    warmUpProvider("openrouter", failing as unknown as typeof fetch);
    const fetchImpl = async () => new Response(JSON.stringify({ error: { message: "No such model" } }), { status: 400 });
    await expect(
      summarizeThread({ thread, provider: "openrouter", model: "x/y", apiKey: "k", fetchImpl }),
    ).rejects.toMatchObject({ status: 400, message: "OpenRouter returned HTTP 400. No such model" });
  });
});

describe("warmUpProvider", () => {
  it("never throws, whether fetch throws synchronously or rejects", async () => {
    const syncThrow = vi.fn(() => {
      throw new Error("boom");
    });
    const rejects = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    expect(() => warmUpProvider("openai", syncThrow as unknown as typeof fetch)).not.toThrow();
    expect(() => warmUpProvider("anthropic", rejects as unknown as typeof fetch)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(syncThrow).toHaveBeenCalled();
  });

  it("sends only a keyless HEAD no-cors request, with no signal that could cancel real requests", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null));
    warmUpProvider("openrouter", fetchImpl as unknown as typeof fetch);
    await new Promise((r) => setTimeout(r, 0));
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/");
    expect(init).toMatchObject({ method: "HEAD", mode: "no-cors" });
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeUndefined();
  });
});
