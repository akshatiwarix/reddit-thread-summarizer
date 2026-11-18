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

export { isShareLink, parseThreadUrl } from "./reddit/url";
export { RedditParseError } from "./reddit/errors";
export { parseThreadListing, MAX_COMMENTS } from "./reddit/parse";
export { DEFAULT_MAX_CHARS, DEFAULT_MAX_COMMENT_CHARS, DEFAULT_MAX_POST_CHARS, trimThread } from "./reddit/trim";
export type { TrimOptions } from "./reddit/trim";
export { fetchRedditThread, fetchAppOnlyToken, REDDIT_USER_AGENT } from "./reddit/fetch-thread";
export type { FetchThreadOptions, RedditCredentials } from "./reddit/fetch-thread";
export { ThreadFetchError, threadFetchStatus } from "./reddit/fetch-error";
export type { ThreadFetchKind } from "./reddit/fetch-error";

export { SUMMARY_JSON_SCHEMA } from "./summary/schema";
export { buildSystemPrompt, buildUserPrompt } from "./summary/prompt";
export { parseModelOutput, SummaryParseError } from "./summary/parse-output";

export { ProviderError, errorFromResponse } from "./providers/errors";
export type { ProviderErrorKind } from "./providers/errors";
export { PROVIDERS, isProviderId, providerInfo } from "./providers/catalog";
export type { ProviderInfo } from "./providers/catalog";
export { defaultSettings, modelForProvider, normalizeSettings } from "./providers/settings";
export { summarizeThread } from "./providers/summarize";
export type { SummarizeOptions } from "./providers/summarize";
