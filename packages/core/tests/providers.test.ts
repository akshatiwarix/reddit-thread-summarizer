import { describe, expect, it } from "vitest";
import { buildAnthropicRequest } from "../src/providers/anthropic";
import { buildGeminiRequest } from "../src/providers/gemini";
import { buildOpenAiRequest } from "../src/providers/openai";
import { buildOpenRouterRequest } from "../src/providers/openrouter";
import { ProviderError } from "../src/providers/errors";
import { summarizeThread } from "../src/providers/summarize";
import type { ParsedThread } from "../src/types";

const thread: ParsedThread = {
  post: {
    id: "abc123",
    title: "Title",
    author: "op",
    selftext: "Body",
    score: 1,
    subreddit: "example",
    permalink: "/r/example/comments/abc123/title/",
    url: "https://www.reddit.com/r/example/comments/abc123/title/",
    createdUtc: 1,
    numComments: 1,
    linkFlairText: null,
    over18: false,
  },
  comments: [
    {
      id: "c1",
      author: "alice",
      body: "Fix it first.",
      score: 8,
      depth: 0,
      permalink: "/r/example/comments/abc123/title/c1/",
      createdUtc: 2,
      parentId: "t3_abc123",
    },
  ],
};

const summaryJson = JSON.stringify({
  tldr: "The thread says to fix it first.",
  mainPoints: ["A bug shipped."],
  agreements: ["It is reproducible."],
  disagreements: [],
  bestComments: [
    { author: "alice", excerpt: "Fix it first.", score: 8, permalink: "/r/example/comments/abc123/title/c1/" },
  ],
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("provider requests", () => {
  const settings = { model: "test-model", apiKey: "test-key" };

  it("builds an OpenAI chat completion that asks for JSON", () => {
    const request = buildOpenAiRequest(settings, "system", "user");
    expect(request.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(request.init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(request.init.body) as { response_format: { type: string }; messages: unknown[] };
    expect(body.response_format.type).toBe("json_object");
    expect(body.messages).toHaveLength(2);
  });

  it("uses max_completion_tokens and no temperature for OpenAI reasoning models", () => {
    for (const model of ["gpt-5", "gpt-5-mini", "gpt-6-luna", "gpt-6.2-sol", "o3", "o4-mini"]) {
      const body = JSON.parse(buildOpenAiRequest({ model, apiKey: "k" }, "s", "u").init.body);
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("max_tokens");
      expect(body.max_completion_tokens).toBeGreaterThanOrEqual(8000);
    }
  });

  it("keeps max_tokens and temperature for non-reasoning OpenAI models", () => {
    for (const model of ["gpt-4o-mini", "gpt-4.1", "gpt-4"]) {
      const body = JSON.parse(buildOpenAiRequest({ model, apiKey: "k" }, "s", "u").init.body);
      expect(body.temperature).toBe(0.2);
      expect(body.max_tokens).toBe(2500);
      expect(body).not.toHaveProperty("max_completion_tokens");
    }
  });

  it("omits temperature and leaves room for thinking in the Anthropic body", () => {
    const body = JSON.parse(buildAnthropicRequest(settings, "system", "user").init.body);
    expect(body).not.toHaveProperty("temperature");
    expect(body.max_tokens).toBeGreaterThanOrEqual(8000);
  });

  it("sends Anthropic's browser CORS header", () => {
    const request = buildAnthropicRequest(settings, "system", "user");
    expect(request.init.headers["anthropic-version"]).toBe("2023-06-01");
    expect(request.init.headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(request.init.headers["x-api-key"]).toBe("test-key");
  });

  it("sends the Gemini key in a header and never in the URL", () => {
    const request = buildGeminiRequest(settings, "system", "user");
    expect(request.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent");
    expect(request.url).not.toContain("test-key");
    expect(request.init.headers["x-goog-api-key"]).toBe("test-key");
  });

  it("names the app on OpenRouter requests", () => {
    const request = buildOpenRouterRequest(settings, "system", "user");
    expect(request.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.init.headers["X-Title"]).toBe("Reddit Thread Summarizer");
    expect(request.init.headers.Authorization).toBe("Bearer test-key");
  });
});

describe("summarizeThread", () => {
  it("rejects a missing key before calling the provider", async () => {
    const fetchImpl = (() => {
      throw new Error("should not be called");
    }) as typeof fetch;
    await expect(
      summarizeThread({ thread, provider: "openai", model: "gpt-4o-mini", apiKey: "  ", fetchImpl }),
    ).rejects.toMatchObject({ kind: "bad_key" });
  });

  it("reads an OpenAI summary and surfaces a bad key", async () => {
    const ok = await summarizeThread({
      thread,
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ choices: [{ message: { content: summaryJson } }] }),
    });
    expect(ok.tldr).toContain("fix it first");

    await expect(
      summarizeThread({
        thread,
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "bad",
        fetchImpl: async () => jsonResponse({ error: { message: "Incorrect API key" } }, 401),
      }),
    ).rejects.toMatchObject({ kind: "bad_key", status: 401 });
  });

  it("drops best comments the model invented, end to end", async () => {
    const withGhost = JSON.stringify({
      ...JSON.parse(summaryJson),
      bestComments: [
        { author: "ghost", excerpt: "Made up.", score: 99, permalink: "/r/example/comments/abc123/title/nope/" },
        { author: "alice", excerpt: "Fix it first.", score: 8, permalink: "/r/example/comments/abc123/title/c1/" },
      ],
    });
    const result = await summarizeThread({
      thread,
      provider: "openai",
      model: "gpt-6-luna",
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ choices: [{ message: { content: withGhost } }] }),
    });
    expect(result.bestComments.map((comment) => comment.author)).toEqual(["alice"]);
  });

  it("sends the reasoning-model body for an OpenAI model typed in by the user", async () => {
    let body: Record<string, unknown> = {};
    await summarizeThread({
      thread,
      provider: "openai",
      model: "o3",
      apiKey: "test-key",
      fetchImpl: async (_input, init) => {
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return jsonResponse({ choices: [{ message: { content: summaryJson } }] });
      },
    });
    expect(body.model).toBe("o3");
    expect(body).toHaveProperty("max_completion_tokens");
    expect(body).not.toHaveProperty("temperature");
  });

  it("reads Anthropic text blocks and surfaces a rate limit", async () => {
    const ok = await summarizeThread({
      thread,
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ content: [{ type: "text", text: summaryJson }] }),
    });
    expect(ok.bestComments[0]?.author).toBe("alice");

    await expect(
      summarizeThread({
        thread,
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ error: { message: "rate limited" } }, 429),
      }),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(
      summarizeThread({
        thread,
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ error: { message: "rate limited" } }, 429),
      }),
    ).rejects.toMatchObject({ kind: "rate_limit" });
  });

  it("reads Gemini and OpenRouter payloads", async () => {
    const gemini = await summarizeThread({
      thread,
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "test-key",
      fetchImpl: async () => jsonResponse({ candidates: [{ content: { parts: [{ text: summaryJson }] } }] }),
    });
    expect(gemini.mainPoints).toEqual(["A bug shipped."]);

    const routed = await summarizeThread({
      thread,
      provider: "openrouter",
      model: "openai/gpt-4o-mini",
      apiKey: "test-key",
      fetchImpl: async (input) => {
        expect(String(input)).toContain("openrouter.ai");
        return jsonResponse({ choices: [{ message: { content: summaryJson } }] });
      },
    });
    expect(routed.agreements).toEqual(["It is reproducible."]);
  });

  it("turns a successful but unusable body into invalid output", async () => {
    await expect(
      summarizeThread({
        thread,
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ choices: [{ message: { content: "not json" } }] }),
      }),
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("classifies a network failure", async () => {
    await expect(
      summarizeThread({
        thread,
        provider: "gemini",
        model: "gemini-2.5-flash",
        apiKey: "test-key",
        fetchImpl: async () => {
          throw new TypeError("Failed to fetch");
        },
      }),
    ).rejects.toMatchObject({ kind: "network" });
  });
});
