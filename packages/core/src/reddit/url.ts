import type { ThreadRef } from "../types";

const HOSTS = new Set([
  "www.reddit.com",
  "reddit.com",
  "old.reddit.com",
  "m.reddit.com",
  "np.reddit.com",
  "new.reddit.com",
]);

const WITH_SUBREDDIT =
  /^\/r\/([A-Za-z0-9_]{2,50})\/comments\/([A-Za-z0-9]{3,12})(?:\/([^/]+))?(?:\/([A-Za-z0-9]{3,12}))?\/?$/;

const WITHOUT_SUBREDDIT =
  /^\/comments\/([A-Za-z0-9]{3,12})(?:\/([^/]+))?(?:\/([A-Za-z0-9]{3,12}))?\/?$/;

const SHORT_HOST = "redd.it";
const SHORT_PATH = /^\/([A-Za-z0-9]{3,12})\/?$/;
const SHARE_PATH = /^\/r\/[A-Za-z0-9_]{2,50}\/s\/[A-Za-z0-9]{3,40}\/?$/;

const JSON_QUERY = "limit=500&raw_json=1&sort=top";

/** True for app share links like https://www.reddit.com/r/example/s/AbC123, which need a redirect to resolve. */
export function isShareLink(input: string): boolean {
  try {
    const url = new URL(input.trim());
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      HOSTS.has(url.hostname.toLowerCase()) &&
      SHARE_PATH.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function parseThreadUrl(input: string): ThreadRef | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2000) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();

  // redd.it/<postId> is the short link for a post.
  if (host === SHORT_HOST) {
    const short = SHORT_PATH.exec(url.pathname);
    return short?.[1] ? buildRef("", short[1], undefined, undefined) : null;
  }

  if (!HOSTS.has(host)) return null;

  let path = url.pathname;
  if (path.endsWith(".json")) path = path.slice(0, -".json".length);

  const full = WITH_SUBREDDIT.exec(path);
  if (full?.[1] && full[2]) {
    return buildRef(full[1], full[2], full[3], full[4]);
  }

  const short = WITHOUT_SUBREDDIT.exec(path);
  if (short?.[1]) {
    return buildRef("", short[1], short[2], short[3]);
  }

  return null;
}

function buildRef(subreddit: string, postIdRaw: string, slug: string | undefined, commentIdRaw: string | undefined): ThreadRef {
  const postId = postIdRaw.toLowerCase();
  const commentId = commentIdRaw?.toLowerCase();
  const slugPath = slug ? `/${encodeURIComponent(slug)}` : "";
  const subredditPath = subreddit ? `/r/${subreddit}` : "";
  const stem = `${subredditPath}/comments/${postId}`;

  return {
    subreddit,
    postId,
    ...(slug ? { slug } : {}),
    ...(commentId ? { commentId } : {}),
    canonicalUrl: `https://www.reddit.com${stem}${slugPath}/`,
    jsonUrl: `https://www.reddit.com${stem}.json?${JSON_QUERY}`,
    oauthJsonUrl: `https://oauth.reddit.com${stem}.json?${JSON_QUERY}`,
  };
}
