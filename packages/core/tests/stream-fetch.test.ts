import { describe, expect, it } from "vitest";
import { describeError } from "../src/describe-error";
import { ProviderError } from "../src/providers/errors";
import { streamCompletion, type StreamRequest } from "../src/providers/stream";

const sseBody = (text: string) =>
  new Response(`data: ${JSON.stringify({ t: text })}\n\ndata: [DONE]\n\n`, { status: 200 });

function request(fetchImpl: typeof fetch, extra: Partial<StreamRequest> = {}): StreamRequest {
  return {
    fetchImpl,
    provider: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    init: { method: "POST", body: "{}" },
    textOf: (p) => (p as { t: string }).t,
    onText: () => undefined,
    ...extra,
  };
}

describe("streamCompletion fetch call", () => {
  it("calls fetch unbound, like the browser requires (window.fetch throws Illegal invocation otherwise)", async () => {
    // Mimic the browser: fetch must be called with this === undefined or the global object.
    const browserFetch = function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(sseBody("ok"));
    } as unknown as typeof fetch;
    await expect(streamCompletion(request(browserFetch))).resolves.toBe("ok");
  });

  it("sends the request with a signal and the caller's init", async () => {
    let seen: RequestInit | undefined;
    await streamCompletion(
      request(async (_url, init) => {
        seen = init;
        return sseBody("ok");
      }),
    );
    expect(seen?.method).toBe("POST");
    expect(seen?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("streamCompletion errors", () => {
  it("surfaces status and provider text for an HTTP error", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: { message: "No endpoints found for this model" } }), { status: 404 });
    await expect(streamCompletion(request(fetchImpl))).rejects.toMatchObject({
      kind: "provider",
      status: 404,
      message: "OpenRouter returned HTTP 404. No endpoints found for this model",
    });
  });

  it("keeps the status for a non-JSON error body", async () => {
    const fetchImpl = async () => new Response("<html>Bad gateway</html>", { status: 502 });
    await expect(streamCompletion(request(fetchImpl))).rejects.toMatchObject({
      status: 502,
      message: "OpenRouter returned HTTP 502.",
    });
  });

  it("names the thrown error when fetch fails", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    const error = await streamCompletion(request(fetchImpl)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("network");
    expect((error as ProviderError).message).toContain("TypeError: Failed to fetch");
    expect(describeError(error)).toContain("TypeError: Failed to fetch");
  });

  it("does not leak a key that appears in an error message", async () => {
    const fetchImpl = async () => {
      throw new TypeError("bad Bearer sk-secret123 header");
    };
    const error = (await streamCompletion(request(fetchImpl)).catch((e: unknown) => e)) as ProviderError;
    expect(error.message).not.toContain("sk-secret123");
  });

  it("reports a timeout as a timeout, not as unreachable", async () => {
    const fetchImpl = async () => {
      throw new DOMException("timed out", "TimeoutError");
    };
    await expect(streamCompletion(request(fetchImpl))).rejects.toMatchObject({
      kind: "network",
      message: expect.stringContaining("took too long") as unknown as string,
    });
  });

  it("rethrows the caller's own abort untouched", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = async () => {
      throw new DOMException("aborted", "AbortError");
    };
    await expect(streamCompletion(request(fetchImpl, { signal: controller.signal }))).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("works when AbortSignal.any is missing", async () => {
    const original = AbortSignal.any;
    // @ts-expect-error simulate an older browser
    delete AbortSignal.any;
    try {
      await expect(
        streamCompletion(request(async () => sseBody("ok"), { signal: new AbortController().signal })),
      ).resolves.toBe("ok");
    } finally {
      AbortSignal.any = original;
    }
  });

  it("aborts the fetch when the caller aborts mid-flight", async () => {
    const controller = new AbortController();
    const fetchImpl = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    const pending = streamCompletion(request(fetchImpl, { signal: controller.signal }));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("describeError", () => {
  it("keeps the name of a thrown TypeError", () => {
    expect(describeError(new TypeError("Failed to fetch"))).toContain("TypeError: Failed to fetch");
    expect(describeError(new TypeError("Illegal invocation"))).toContain("Illegal invocation");
  });

  it("keeps HTTP details", () => {
    const error = new ProviderError("OpenRouter returned HTTP 404. nope", { kind: "provider", status: 404 });
    expect(describeError(error)).toBe("OpenRouter returned HTTP 404. nope");
  });
});
