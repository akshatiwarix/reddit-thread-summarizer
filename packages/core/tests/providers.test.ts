import { describe, expect, it } from "vitest";
import { buildAnthropicRequest } from "../src/providers/anthropic";
import { buildGeminiRequest } from "../src/providers/gemini";
import { buildOpenAiRequest } from "../src/providers/openai";
import { buildOpenRouterRequest } from "../src/providers/openrouter";
import { MAX_OUTPUT_TOKENS } from "../src/providers/limits";
import { UPDATE_INTERVAL_MS, summarizeThread } from "../src/providers/summarize";
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

const summaryMarkdown = [
  "## TL;DR",
  "The thread says to fix it first.",
  "",
  "## Main points",
  "- A bug shipped.",
  "",
  "## Where people agree",
  "- It is reproducible.",
  "",
  "## Where people split",
  "None.",
  "",
  "## Best comments",
  "### /r/example/comments/abc123/title/c1/",
  "> Fix it first.",
  "",
].join("\n");

/** An SSE response whose body arrives in the given pieces, so events can straddle chunk boundaries. */
function sse(pieces: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Split text into n-character slices. */
function slices(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

const openAiEvents = (text: string) =>
  slices(text, 7).map((piece) => `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`).concat("data: [DONE]\n\n");

const anthropicEvents = (text: string) =>
  [
    `event: message_start\ndata: ${JSON.stringify({ type: "message_start" })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: "hmm" } })}\n\n`,
    ...slices(text, 9).map(
      (piece) => `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: piece } })}\n\n`,
    ),
    `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
  ];

const geminiEvents = (text: string) => [
  `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "skip me", thought: true }] } }] })}\r\n\r\n`,
  ...slices(text, 11).map((piece) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: piece }] } }] })}\r\n\r\n`),
];

describe("provider requests", () => {
  const settings = { model: "test-model", apiKey: "test-key" };

  it("streams OpenAI chat completions and no longer asks for JSON", () => {
    const request = buildOpenAiRequest(settings, "system", "user");
    expect(request.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(request.init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(request.init.body) as Record<string, unknown>;
    expect(body.stream).toBe(true);
    expect(body).not.toHaveProperty("response_format");
    expect(body.messages).toHaveLength(2);
  });

  it("caps output at 4096 tokens with the right parameter name per model", () => {
    expect(MAX_OUTPUT_TOKENS).toBe(4096);
    for (const model of ["gpt-5", "gpt-6-luna", "gpt-6.2-sol", "o3", "o4-mini"]) {
      const body = JSON.parse(buildOpenAiRequest({ model, apiKey: "k" }, "s", "u").init.body);
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("max_tokens");
      expect(body.max_completion_tokens).toBe(4096);
      expect(body.reasoning_effort).toBe("low");
    }
    for (const model of ["gpt-4o-mini", "gpt-4.1", "gpt-4"]) {
      const body = JSON.parse(buildOpenAiRequest({ model, apiKey: "k" }, "s", "u").init.body);
      expect(body.temperature).toBe(0.2);
      expect(body.max_tokens).toBe(4096);
      expect(body).not.toHaveProperty("max_completion_tokens");
      expect(body).not.toHaveProperty("reasoning_effort");
    }
    const router = JSON.parse(buildOpenRouterRequest(settings, "s", "u").init.body);
    expect(router).toMatchObject({ max_tokens: 4096, stream: true, reasoning: { effort: "low" } });
  });

  it("streams Anthropic with low effort on Claude 5 models and without it on older ones", () => {
    const haiku = JSON.parse(buildAnthropicRequest({ model: "claude-haiku-5-5", apiKey: "k" }, "s", "u").init.body);
    expect(haiku).toMatchObject({ stream: true, max_tokens: 4096, output_config: { effort: "low" } });
    expect(haiku).not.toHaveProperty("temperature");
    const older = JSON.parse(buildAnthropicRequest({ model: "claude-3-5-haiku-latest", apiKey: "k" }, "s", "u").init.body);
    expect(older).not.toHaveProperty("output_config");
  });

  it("sends Anthropic's browser CORS header", () => {
    const request = buildAnthropicRequest(settings, "system", "user");
    expect(request.init.headers["anthropic-version"]).toBe("2023-06-01");
    expect(request.init.headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(request.init.headers["x-api-key"]).toBe("test-key");
  });

  it("streams Gemini with the key in a header, never the URL, and a low thinking level on Gemini 3+", () => {
    const request = buildGeminiRequest(settings, "system", "user");
    expect(request.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:streamGenerateContent?alt=sse",
    );
    expect(request.url).not.toContain("test-key");
    expect(request.init.headers["x-goog-api-key"]).toBe("test-key");
    const flash = JSON.parse(buildGeminiRequest({ model: "gemini-3.6-flash", apiKey: "k" }, "s", "u").init.body);
    expect(flash.generationConfig).toMatchObject({ maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "LOW" } });
    const old = JSON.parse(buildGeminiRequest({ model: "gemini-2.5-flash", apiKey: "k" }, "s", "u").init.body);
    expect(old.generationConfig).not.toHaveProperty("thinkingConfig");
  });

  it("names the app on OpenRouter requests", () => {
    const request = buildOpenRouterRequest(settings, "system", "user");
    expect(request.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(request.init.headers["X-Title"]).toBe("Reddit Thread Summarizer");
    expect(request.init.headers.Authorization).toBe("Bearer test-key");
  });
});

describe("summarizeThread", () => {
  const base = { thread, apiKey: "test-key" };

  it("rejects a missing key before calling the provider", async () => {
    const fetchImpl = (() => {
      throw new Error("should not be called");
    }) as typeof fetch;
    await expect(
      summarizeThread({ thread, provider: "openai", model: "gpt-4o-mini", apiKey: "  ", fetchImpl }),
    ).rejects.toMatchObject({ kind: "bad_key" });
  });

  it("streams an OpenAI summary, reports partial updates, and fills author and score from the thread", async () => {
    const updates: string[] = [];
    const result = await summarizeThread({
      ...base,
      provider: "openai",
      model: "gpt-6-luna",
      onUpdate: (partial) => updates.push(partial.tldr),
      fetchImpl: async () => sse(openAiEvents(summaryMarkdown)),
    });
    expect(result.tldr).toBe("The thread says to fix it first.");
    expect(result.bestComments).toEqual([
      { author: "alice", excerpt: "Fix it first.", score: 8, permalink: "/r/example/comments/abc123/title/c1/" },
    ]);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.at(-1)).toBe("The thread says to fix it first.");
  });

  it("emits growing partial summaries when the stream is slow", async () => {
    const times = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400];
    const now = Date.now;
    let i = 0;
    Date.now = () => 1_000 + (times[Math.min(i++, times.length - 1)] ?? 0) * (UPDATE_INTERVAL_MS + 1);
    try {
      const seen: string[] = [];
      await summarizeThread({
        ...base,
        provider: "openai",
        model: "gpt-6-luna",
        onUpdate: (partial) => seen.push(partial.tldr),
        fetchImpl: async () => sse(openAiEvents(summaryMarkdown)),
      });
      expect(seen.length).toBeGreaterThan(2);
      expect(seen[1]?.length).toBeGreaterThan(seen[0]?.length ?? 0);
    } finally {
      Date.now = now;
    }
  });

  it("surfaces a bad key with a non-stream error body", async () => {
    await expect(
      summarizeThread({
        ...base,
        provider: "openai",
        model: "gpt-6-luna",
        apiKey: "bad",
        fetchImpl: async () => jsonResponse({ error: { message: "Incorrect API key" } }, 401),
      }),
    ).rejects.toMatchObject({ kind: "bad_key", status: 401 });
  });

  it("drops best comments the model invented, end to end", async () => {
    const withGhost = summaryMarkdown.replace(
      "## Best comments\n",
      "## Best comments\n### /r/example/comments/abc123/title/nope/\n> Made up.\n",
    );
    const result = await summarizeThread({
      ...base,
      provider: "openai",
      model: "gpt-6-luna",
      fetchImpl: async () => sse(openAiEvents(withGhost)),
    });
    expect(result.bestComments.map((comment) => comment.author)).toEqual(["alice"]);
  });

  it("sends the reasoning-model body for an OpenAI model typed in by the user", async () => {
    let body: Record<string, unknown> = {};
    await summarizeThread({
      ...base,
      provider: "openai",
      model: "o3",
      fetchImpl: async (_input, init) => {
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return sse(openAiEvents(summaryMarkdown));
      },
    });
    expect(body.model).toBe("o3");
    expect(body).toHaveProperty("max_completion_tokens");
    expect(body).not.toHaveProperty("temperature");
  });

  it("streams Anthropic text deltas, ignores thinking, and surfaces a rate limit", async () => {
    const ok = await summarizeThread({
      ...base,
      provider: "anthropic",
      model: "claude-haiku-5-5",
      fetchImpl: async () => sse(anthropicEvents(summaryMarkdown)),
    });
    expect(ok.bestComments[0]?.author).toBe("alice");
    expect(ok.tldr).not.toContain("hmm");

    await expect(
      summarizeThread({
        ...base,
        provider: "anthropic",
        model: "claude-haiku-5-5",
        fetchImpl: async () => jsonResponse({ error: { message: "rate limited" } }, 429),
      }),
    ).rejects.toMatchObject({ kind: "rate_limit" });
  });

  it("streams Gemini (CRLF events, thought parts skipped) and OpenRouter", async () => {
    const gemini = await summarizeThread({
      ...base,
      provider: "gemini",
      model: "gemini-3.6-flash",
      fetchImpl: async () => sse(geminiEvents(summaryMarkdown)),
    });
    expect(gemini.mainPoints).toEqual(["A bug shipped."]);
    expect(gemini.tldr).not.toContain("skip me");

    const routed = await summarizeThread({
      ...base,
      provider: "openrouter",
      model: "openai/gpt-6-luna",
      fetchImpl: async (input) => {
        expect(String(input)).toContain("openrouter.ai");
        return sse([": OPENROUTER PROCESSING\n\n", ...openAiEvents(summaryMarkdown)]);
      },
    });
    expect(routed.agreements).toEqual(["It is reproducible."]);
  });

  it("turns an error event in the middle of a stream into a provider error", async () => {
    await expect(
      summarizeThread({
        ...base,
        provider: "anthropic",
        model: "claude-haiku-5-5",
        fetchImpl: async () =>
          sse([
            ...anthropicEvents("## TL;DR\nPartial").slice(0, 3),
            `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } })}\n\n`,
          ]),
      }),
    ).rejects.toMatchObject({ kind: "provider", message: expect.stringContaining("Overloaded") });
  });

  it("turns a successful but unusable stream into invalid output", async () => {
    await expect(
      summarizeThread({
        ...base,
        provider: "openai",
        model: "gpt-6-luna",
        fetchImpl: async () => sse(openAiEvents("Sorry, I cannot help with that.")),
      }),
    ).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("reports an empty stream", async () => {
    await expect(
      summarizeThread({
        ...base,
        provider: "openai",
        model: "gpt-6-luna",
        fetchImpl: async () => sse(["data: [DONE]\n\n"]),
      }),
    ).rejects.toMatchObject({ kind: "provider" });
  });

  it("classifies a network failure and a stream that dies mid-read", async () => {
    await expect(
      summarizeThread({
        ...base,
        provider: "gemini",
        model: "gemini-3.6-flash",
        fetchImpl: async () => {
          throw new TypeError("Failed to fetch");
        },
      }),
    ).rejects.toMatchObject({ kind: "network" });

    const dying = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(openAiEvents("## TL;DR\nHalf")[0] ?? ""));
        controller.error(new TypeError("network error"));
      },
    });
    await expect(
      summarizeThread({ ...base, provider: "openai", model: "gpt-6-luna", fetchImpl: async () => new Response(dying) }),
    ).rejects.toMatchObject({ kind: "network" });
  });

  it("rethrows the caller's abort instead of calling it a network error", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      summarizeThread({
        ...base,
        provider: "openai",
        model: "gpt-6-luna",
        signal: controller.signal,
        fetchImpl: async (_input, init) => {
          if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
          return sse([]);
        },
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
