import { buildUserPrompt, buildSystemPrompt } from "../summary/prompt";
import { parseModelOutput } from "../summary/parse-output";
import { trimThread } from "../reddit/trim";
import type { ParsedThread, ProviderId, ThreadSummary } from "../types";
import { completeAnthropic } from "./anthropic";
import { completeGemini } from "./gemini";
import { completeOpenAi, type ChatSettings } from "./openai";
import { completeOpenRouter } from "./openrouter";
import { ProviderError } from "./errors";

export type SummarizeOptions = {
  thread: ParsedThread;
  provider: ProviderId;
  model: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  maxChars?: number;
};

async function complete(provider: ProviderId, settings: ChatSettings, system: string, user: string, fetchImpl: typeof fetch) {
  switch (provider) {
    case "openai":
      return completeOpenAi(settings, system, user, fetchImpl);
    case "anthropic":
      return completeAnthropic(settings, system, user, fetchImpl);
    case "gemini":
      return completeGemini(settings, system, user, fetchImpl);
    case "openrouter":
      return completeOpenRouter(settings, system, user, fetchImpl);
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
  const system = buildSystemPrompt();
  const user = buildUserPrompt(trimmed);
  const fetchImpl = options.fetchImpl ?? fetch;

  let text: string;
  try {
    text = await complete(options.provider, { model, apiKey }, system, user, fetchImpl);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("Could not reach the provider. Check the connection and try again.", {
      kind: "network",
      provider: options.provider,
    });
  }

  try {
    return parseModelOutput(text, options.thread.comments);
  } catch (error) {
    throw new ProviderError(error instanceof Error ? error.message : "The model returned invalid JSON.", {
      kind: "invalid_output",
      provider: options.provider,
    });
  }
}
