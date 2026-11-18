import type { ProviderId } from "../types";
import { ProviderError, errorFromResponse } from "./errors";
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

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/** POST a streaming request and return the full text once the stream ends. */
export async function streamCompletion(request: StreamRequest): Promise<string> {
  const { provider } = request;
  const timeout = AbortSignal.timeout(STREAM_TIMEOUT_MS);
  const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
  const network = (error: unknown) => {
    if (request.signal?.aborted) return error;
    return new ProviderError(
      isAbort(error)
        ? "The provider took too long to respond. Try again."
        : "Could not reach the provider. Check the connection and try again.",
      { kind: "network", provider },
    );
  };

  let response: Response;
  try {
    response = await request.fetchImpl(request.url, { ...request.init, signal });
  } catch (error) {
    throw network(error);
  }

  if (!response.ok) throw errorFromResponse(provider, response.status, await response.text().catch(() => ""));
  if (!response.body) throw new ProviderError("The provider returned an empty response.", { kind: "provider", provider });

  let text = "";
  try {
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
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw network(error);
  }

  if (!text.trim()) throw new ProviderError("The provider returned an empty response.", { kind: "provider", provider });
  return text;
}

/** Throw a provider error for an in-stream error object, such as OpenRouter's or Anthropic's. */
export function streamError(provider: ProviderId, error: unknown, kindHint?: string): ProviderError {
  const record = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const message = typeof record.message === "string" ? record.message.replace(/\s+/g, " ").trim().slice(0, 180) : "";
  const type = typeof record.type === "string" ? record.type : (kindHint ?? "");
  const kind = /rate_limit/i.test(type) || record.code === 429 ? "rate_limit" : "provider";
  return new ProviderError(`The provider stopped the response${message ? `: ${message}` : "."}`, { kind, provider });
}
