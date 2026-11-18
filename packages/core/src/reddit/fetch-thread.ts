import { parseThreadListing } from "./parse";
import { RedditParseError } from "./errors";
import { ThreadFetchError } from "./fetch-error";
import { isShareLink, parseThreadUrl } from "./url";
import type { ParsedThread } from "../types";

export const REDDIT_USER_AGENT = "web:reddit-thread-summarizer:1.0.0 (by /u/reddit-thread-summarizer)";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

export type RedditCredentials = {
  clientId: string;
  clientSecret: string;
};

export type FetchThreadOptions = {
  url: string;
  fetchImpl?: typeof fetch;
  credentials?: RedditCredentials;
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

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function hasCredentials(credentials: RedditCredentials | undefined): credentials is RedditCredentials {
  return Boolean(credentials?.clientId.trim() && credentials.clientSecret.trim());
}

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

export async function fetchAppOnlyToken(
  fetchImpl: typeof fetch,
  credentials: RedditCredentials,
  userAgent = REDDIT_USER_AGENT,
): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodeBase64(`${credentials.clientId}:${credentials.clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ThreadFetchError("Could not reach Reddit to sign in the app.", "network");
  }

  const payload = await readJson(response);
  const token =
    payload && typeof payload === "object" && "access_token" in payload
      ? (payload as { access_token?: unknown }).access_token
      : undefined;

  if (!response.ok || typeof token !== "string" || !token) {
    throw new ThreadFetchError("Reddit rejected the app credentials.", "blocked");
  }
  return token;
}

async function fetchOauthThread(fetchImpl: typeof fetch, url: string, token: string, userAgent: string): Promise<ParsedThread> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new ThreadFetchError("Could not reach Reddit's OAuth API.", "network");
  }

  if (response.status === 404) throw new ThreadFetchError("Reddit could not find that thread.", "not_found");

  const payload = await readJson(response);
  if (!response.ok || payload === null) {
    throw new ThreadFetchError("Reddit's OAuth API refused the thread.", "blocked");
  }

  try {
    return parseThreadListing(payload);
  } catch (error) {
    throw new ThreadFetchError(error instanceof Error ? error.message : "Could not parse the thread.", "parse");
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

  if (!hasCredentials(options.credentials)) {
    throw new ThreadFetchError(
      "Reddit blocked the public thread endpoint, and no Reddit app credentials are configured.",
      "blocked",
    );
  }

  const token = await fetchAppOnlyToken(fetchImpl, options.credentials, userAgent);
  return fetchOauthThread(fetchImpl, ref.oauthJsonUrl, token, userAgent);
}
