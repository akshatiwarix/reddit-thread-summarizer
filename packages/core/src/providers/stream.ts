import type { ProviderId } from "../types";
import { ProviderError, errorFromResponse, networkError } from "./errors";
import { STREAM_TIMEOUT_MS } from "./limits";

/** Yield the `data:` payload of each server-sent event in a response body. */
export async function* readSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r\n\r\n|\n\n|\r\r/);
      buffer = done ? "" : (events.pop() ?? "");
      if (done && events.length === 1 && events[0] === "") events.pop();
      for (const event of events) {
        const data = event
          .split(/\r\n|\n|\r/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data) yield data;
      }
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}

export type StreamRequest = {
  fetchImpl: typeof fetch;
  provider: ProviderId;
  url: string;
  init: RequestInit;
  /** Return the text carried by one event's JSON payload ("" when it has none). Throw on an error event. */
  textOf: (payload: unknown) => string;
  onText: (accumulated: string) => void;
  signal?: AbortSignal | undefined;
};

/** Abort when the caller aborts or the timeout passes. Avoids AbortSignal.any / .timeout, which older Chrome lacks. */
function linkedSignal(caller: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const onCaller = () => controller.abort(caller?.reason);
  if (caller?.aborted) onCaller();
  else caller?.addEventListener("abort", onCaller, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("The request timed out.", "TimeoutError")), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      caller?.removeEventListener("abort", onCaller);
    },
  };
}

async function readStream(request: StreamRequest, signal: AbortSignal): Promise<string> {
  const { provider, fetchImpl } = request;
  // Bare call on purpose: `request.fetchImpl(...)` makes this the request object, and the browser's fetch then throws "Illegal invocation".
  const response = await fetchImpl(request.url, { ...request.init, signal });
  if (!response.ok) throw errorFromResponse(provider, response.status, await response.text().catch(() => ""));
  if (!response.body) throw new ProviderError("The provider returned an empty response.", { kind: "provider", provider });

  let text = "";
  for await (const data of readSseData(response.body)) {
    if (data === "[DONE]") break;
    let payload: unknown;
    try {
      payload = JSON.parse(data) as unknown;
    } catch {
      continue; // keep-alive or comment-like data that is not JSON
    }
    const delta = request.textOf(payload);
    if (!delta) continue;
    text += delta;
    request.onText(text);
  }

  if (!text.trim()) throw new ProviderError("The provider returned an empty response.", { kind: "provider", provider });
  return text;
}

/** POST a streaming request and return the full text once the stream ends. */
export async function streamCompletion(request: StreamRequest): Promise<string> {
  const { signal, dispose } = linkedSignal(request.signal, STREAM_TIMEOUT_MS);
  try {
    return await readStream(request, signal);
  } catch (error) {
    if (error instanceof ProviderError || request.signal?.aborted) throw error;
    throw networkError(request.provider, error);
  } finally {
    dispose();
  }
}

/** Throw a provider error for an in-stream error object, such as OpenRouter's or Anthropic's. */
export function streamError(provider: ProviderId, error: unknown, kindHint?: string): ProviderError {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const message = typeof record.message === "string" ? record.message.replace(/\s+/g, " ").trim().slice(0, 180) : "";
  const type = typeof record.type === "string" ? record.type : (kindHint ?? "");
  const kind = /rate_limit/i.test(type) || record.code === 429 ? "rate_limit" : "provider";
  return new ProviderError(`The provider stopped the response${message ? `: ${message}` : "."}`, { kind, provider });
}
