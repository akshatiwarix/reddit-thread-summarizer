import { asRecord } from "../record";
import type { ParsedThread, RedditComment, RedditPost } from "../types";
import { decodeRedditText } from "./decode";
import { RedditParseError } from "./errors";

export const MAX_COMMENTS = 120;

const SKIPPED_BODIES = new Set(["", "[deleted]", "[removed]"]);

type ListingChild = {
  kind?: string;
  data?: Record<string, unknown>;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function childrenOf(listing: unknown): ListingChild[] {
  const data = asRecord(asRecord(listing)?.data);
  const children = data?.children;
  if (!Array.isArray(children)) return [];
  return children.flatMap((child) => {
    const record = asRecord(child);
    if (!record) return [];
    const dataRecord = asRecord(record.data);
    return [{ kind: asString(record.kind), ...(dataRecord ? { data: dataRecord } : {}) }];
  });
}

export function readPost(listing: unknown): RedditPost {
  const child = childrenOf(listing).find((item) => item.kind === "t3");
  const data = child?.data;
  if (!data) throw new RedditParseError("The listing did not include a post.");

  const id = asString(data.id);
  const title = decodeRedditText(asString(data.title)).trim();
  if (!id || !title) throw new RedditParseError("The post was missing an id or title.");

  const subreddit = asString(data.subreddit);
  const flair = data.link_flair_text;

  return {
    id,
    title,
    author: asString(data.author, "[deleted]"),
    selftext: decodeRedditText(asString(data.selftext)),
    score: asNumber(data.score),
    subreddit,
    permalink: asString(data.permalink, `/r/${subreddit}/comments/${id}/`),
    url: asString(data.url),
    createdUtc: asNumber(data.created_utc),
    numComments: asNumber(data.num_comments),
    linkFlairText: typeof flair === "string" ? decodeRedditText(flair) : null,
    over18: data.over_18 === true,
  };
}

export function flattenComments(listing: unknown): RedditComment[] {
  const comments: RedditComment[] = [];

  const walk = (nodes: ListingChild[], fallbackDepth: number) => {
    for (const node of nodes) {
      if (node.kind === "more" || node.kind !== "t1" || !node.data) continue;
      const data = node.data;
      const depth = typeof data.depth === "number" && Number.isFinite(data.depth) ? data.depth : fallbackDepth;
      const body = decodeRedditText(asString(data.body)).trim();
      const id = asString(data.id);

      if (id && !SKIPPED_BODIES.has(body)) {
        comments.push({
          id,
          author: asString(data.author, "[deleted]"),
          body,
          score: asNumber(data.score),
          depth,
          permalink: asString(data.permalink),
          createdUtc: asNumber(data.created_utc),
          parentId: asString(data.parent_id),
        });
      }

      const replies = data.replies;
      if (typeof replies === "string" || replies == null) continue;
      walk(childrenOf(replies), depth + 1);
    }
  };

  walk(childrenOf(listing), 0);
  return comments;
}

export function selectTopComments(comments: readonly RedditComment[], limit = MAX_COMMENTS): RedditComment[] {
  return [...comments]
    .sort((a, b) => b.score - a.score || b.createdUtc - a.createdUtc || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function parseThreadListing(payload: unknown): ParsedThread {
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new RedditParseError("Reddit did not return a post and a comment listing.");
  }
  const post = readPost(payload[0]);
  const comments = selectTopComments(flattenComments(payload[1]));
  return { post, comments };
}
