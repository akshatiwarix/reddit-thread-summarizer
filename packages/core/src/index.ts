export type {
  BestComment,
  Disagreement,
  ParsedThread,
  ProviderId,
  ProviderSettings,
  RedditComment,
  RedditPost,
  SummarySide,
  ThreadRef,
  ThreadSummary,
  TrimmedThread,
} from "./types";

export { absolutePermalink } from "./permalink";
export { describeError } from "./describe-error";
export { createTimer } from "./timing";

export { isShareLink, parseThreadUrl } from "./reddit/url";
export { RedditParseError } from "./reddit/errors";
export { parseThreadListing, MAX_COMMENTS } from "./reddit/parse";
export { DEFAULT_MAX_CHARS, DEFAULT_MAX_COMMENT_CHARS, DEFAULT_MAX_POST_CHARS, trimThread } from "./reddit/trim";
export type { TrimOptions } from "./reddit/trim";
export { fetchRedditThread, REDDIT_USER_AGENT } from "./reddit/fetch-thread";
export type { FetchThreadOptions } from "./reddit/fetch-thread";
export { ThreadFetchError } from "./reddit/fetch-error";
export type { ThreadFetchKind } from "./reddit/fetch-error";

export { buildSystemPrompt, buildUserPrompt } from "./summary/prompt";
export { parseSummaryMarkdown, permalinkKey, SummaryParseError } from "./summary/parse-markdown";

export { ProviderError, errorFromResponse } from "./providers/errors";
export type { ProviderErrorKind } from "./providers/errors";
export { MAX_OUTPUT_TOKENS } from "./providers/limits";
export { PROVIDERS, isProviderId, providerInfo } from "./providers/catalog";
export type { ProviderInfo } from "./providers/catalog";
export { defaultSettings, modelForProvider, normalizeSettings } from "./providers/settings";
export { warmUpProvider } from "./providers/warm-up";
export { summarizeThread } from "./providers/summarize";
export type { SummarizeOptions } from "./providers/summarize";

export {
  MAX_HISTORY_ENTRIES,
  createHistoryStore,
  filterHistory,
  formatRelativeTime,
  historyIdForUrl,
  normalizeHistory,
  normalizeHistoryEnabled,
} from "./history/history";
export type { HistoryEntry, HistoryStorage, HistoryStore, NewHistoryEntry } from "./history/history";
