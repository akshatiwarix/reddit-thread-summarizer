import { parseThreadListing } from "./parse";
import { RedditParseError } from "./errors";
import { ThreadFetchError } from "./fetch-error";
import { isShareLink, parseThreadUrl } from "./url";
import type { ParsedThread } from "../types";

export const REDDIT_USER_AGENT = "web:reddit-thread-summarizer:1.0.0 (by /u/reddit-thread-summarizer)";

export type FetchThreadOptions = {
  url: string;
  fetchImpl?: typeof fetch;
  /** Pass "" to send no User-Agent header, for example from a browser extension. */
  userAgent?: string;
  /** Cookie mode for requests to www.reddit.com. A browser extension passes "include" to match the tab's session. */
  requestCredentials?: RequestCredentials;
  signal?: AbortSignal;
};

type RequestExtras = { requestCredentials?: RequestCredentials | undefined; signal?: AbortSignal | undefined };

function withUserAgent(headers: Record<string, string>, userAgent: string): Record<string, string> {
  return userAgent ? { ...headers, "User-Agent": userAgent } : headers;
}

function timeoutSignal(signal: AbortSignal | undefined): AbortSignal {
  const timeout = AbortSignal.timeout(30_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

type PublicResult = { ok: true; thread: ParsedThread } | { ok: false };

async function readJson(response: Response): Promise<unknown | null> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchPublic(
  fetchImpl: typeof fetch,
  url: string,
  userAgent: string,
  extras: RequestExtras,
): Promise<PublicResult> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: withUserAgent({ Accept: "application/json" }, userAgent),
      cache: "no-store",
      ...(extras.requestCredentials ? { credentials: extras.requestCredentials } : {}),
      signal: timeoutSignal(extras.signal),
    });
  } catch {
    if (extras.signal?.aborted) throw extras.signal.reason;
    return { ok: false };
  }

  if (response.status === 404) throw new ThreadFetchError("Reddit could not find that thread.", "not_found");

  const payload = await readJson(response);
  if (!response.ok || payload === null) return { ok: false };

  if (!Array.isArray(payload)) return { ok: false };

  try {
    return { ok: true, thread: parseThreadListing(payload) };
  } catch (error) {
    if (error instanceof RedditParseError) {
      throw new ThreadFetchError(error.message, "parse");
    }
    throw error;
  }
}

/** Follow a share link's redirect and return the canonical thread URL it lands on. */
export async function resolveShareLink(
  fetchImpl: typeof fetch,
  url: string,
  userAgent: string,
  extras: RequestExtras = {},
): Promise<string> {
  const failure = new ThreadFetchError(
    "Could not resolve that Reddit share link. Open it in your browser and paste the thread URL instead.",
    "invalid_url",
  );
  let response: Response;
  try {
    response = await fetchImpl(url.trim(), {
      redirect: "follow",
      headers: withUserAgent({}, userAgent),
      cache: "no-store",
      ...(extras.requestCredentials ? { credentials: extras.requestCredentials } : {}),
      signal: timeoutSignal(extras.signal),
    });
  } catch {
    if (extras.signal?.aborted) throw extras.signal.reason;
    throw new ThreadFetchError("Could not reach Reddit to resolve that share link.", "network");
  }
  await response.body?.cancel().catch(() => undefined);
  if (response.status === 404) throw new ThreadFetchError("Reddit could not find that thread.", "not_found");
  if (!response.url || !parseThreadUrl(response.url)) throw failure;
  return response.url;
}

export async function fetchRedditThread(options: FetchThreadOptions): Promise<ParsedThread> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const userAgent = options.userAgent ?? REDDIT_USER_AGENT;
  const extras: RequestExtras = { requestCredentials: options.requestCredentials, signal: options.signal };
  const pageUrl = isShareLink(options.url) ? await resolveShareLink(fetchImpl, options.url, userAgent, extras) : options.url;
  const ref = parseThreadUrl(pageUrl);
  if (!ref) {
    throw new ThreadFetchError(
      "Paste a full reddit.com thread URL, like https://www.reddit.com/r/example/comments/abc123/title/.",
      "invalid_url",
    );
  }

  const publicResult = await fetchPublic(fetchImpl, ref.jsonUrl, userAgent, extras);
  if (publicResult.ok) return publicResult.thread;

  throw new ThreadFetchError("Reddit blocked the public thread endpoint.", "blocked");
}
