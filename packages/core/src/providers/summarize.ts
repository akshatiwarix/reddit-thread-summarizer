import { buildUserPrompt, buildSystemPrompt } from "../summary/prompt";
import { parseSummaryMarkdown, SummaryParseError } from "../summary/parse-markdown";
import { trimThread } from "../reddit/trim";
import type { ParsedThread, ProviderId, ThreadSummary } from "../types";
import { anthropicDelta, buildAnthropicRequest } from "./anthropic";
import { buildGeminiRequest, geminiDelta } from "./gemini";
import { buildOpenAiRequest, openAiDelta, type ChatSettings } from "./openai";
import { buildOpenRouterRequest } from "./openrouter";
import { ProviderError, networkError } from "./errors";
import { streamCompletion } from "./stream";

export type SummarizeOptions = {
  thread: ParsedThread;
  provider: ProviderId;
  model: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  maxChars?: number;
  /** Called with the summary so far each time new text arrives (at most every UPDATE_INTERVAL_MS). */
  onUpdate?: (partial: ThreadSummary) => void;
  signal?: AbortSignal;
};

/** Cap UI updates so a fast stream does not re-render on every token. */
export const UPDATE_INTERVAL_MS = 60;

function request(provider: ProviderId, settings: ChatSettings, system: string, user: string) {
  switch (provider) {
    case "openai":
      return { ...buildOpenAiRequest(settings, system, user), textOf: (p: unknown) => openAiDelta(p) };
    case "anthropic":
      return { ...buildAnthropicRequest(settings, system, user), textOf: anthropicDelta };
    case "gemini":
      return { ...buildGeminiRequest(settings, system, user), textOf: geminiDelta };
    case "openrouter":
      return { ...buildOpenRouterRequest(settings, system, user), textOf: (p: unknown) => openAiDelta(p, "openrouter") };
    default: {
      const neverProvider: never = provider;
      throw new ProviderError(`Unknown provider ${neverProvider}.`, { kind: "provider" });
    }
  }
}

export async function summarizeThread(options: SummarizeOptions): Promise<ThreadSummary> {
  const model = options.model.trim();
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new ProviderError("Add an API key in settings.", { kind: "bad_key", provider: options.provider });
  }
  if (!model) {
    throw new ProviderError("Add a model name in settings.", { kind: "provider", provider: options.provider });
  }

  const trimmed = trimThread(options.thread, options.maxChars === undefined ? {} : { maxChars: options.maxChars });
  const built = request(options.provider, { model, apiKey }, buildSystemPrompt(), buildUserPrompt(trimmed));
  const fetchImpl = options.fetchImpl ?? fetch;

  let lastEmit = 0;
  let pending: string | null = null;
  const emit = (text: string) => {
    options.onUpdate?.(parseSummaryMarkdown(text, options.thread.comments));
    lastEmit = Date.now();
    pending = null;
  };

  let text: string;
  try {
    text = await streamCompletion({
      fetchImpl,
      provider: options.provider,
      url: built.url,
      init: built.init,
      textOf: built.textOf,
      signal: options.signal,
      onText: (accumulated) => {
        if (!options.onUpdate) return;
        pending = accumulated;
        if (lastEmit === 0 || Date.now() - lastEmit >= UPDATE_INTERVAL_MS) emit(accumulated);
      },
    });
  } catch (error) {
    if (error instanceof ProviderError || options.signal?.aborted) throw error;
    throw networkError(options.provider, error);
  }
  if (pending !== null) emit(text);

  try {
    return parseSummaryMarkdown(text, options.thread.comments, true);
  } catch (error) {
    throw new ProviderError(error instanceof SummaryParseError ? error.message : "The model reply could not be read.", {
      kind: "invalid_output",
      provider: options.provider,
    });
  }
}
