import type { ParsedThread, TrimmedThread } from "../types";
import { threadToPromptText } from "./prompt-text";

/** About 10k tokens, measured on the serialized prompt. Smaller input means a faster first token. */
export const DEFAULT_MAX_CHARS = 40_000;
export const DEFAULT_MAX_COMMENT_CHARS = 1_500;
export const DEFAULT_MAX_POST_CHARS = 12_000;

export type TrimOptions = {
  maxChars?: number;
  maxCommentChars?: number;
  maxPostChars?: number;
};

function clip(value: string, max: number): { text: string; clipped: boolean } {
  if (value.length <= max) return { text: value, clipped: false };
  const end = Math.max(0, max - 1);
  return { text: `${value.slice(0, end).trimEnd()}…`, clipped: true };
}

function measure(thread: TrimmedThread): number {
  return threadToPromptText({ ...thread, truncated: true }).length;
}

export function trimThread(thread: ParsedThread, options: TrimOptions = {}): TrimmedThread {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const maxCommentChars = options.maxCommentChars ?? DEFAULT_MAX_COMMENT_CHARS;
  const maxPostChars = options.maxPostChars ?? DEFAULT_MAX_POST_CHARS;

  const clippedPost = clip(thread.post.selftext, maxPostChars);
  const post = clippedPost.clipped ? { ...thread.post, selftext: clippedPost.text } : thread.post;

  let bodyClipped = clippedPost.clipped;
  const clippedComments = thread.comments.map((comment) => {
    const clipped = clip(comment.body, maxCommentChars);
    if (!clipped.clipped) return comment;
    bodyClipped = true;
    return { ...comment, body: clipped.text };
  });

  const kept = [...clippedComments];
  let dropped = false;
  while (kept.length > 0 && measure({ post, comments: kept, truncated: true, omittedComments: 0 }) > maxChars) {
    dropped = true;
    kept.pop();
  }

  return {
    post,
    comments: kept,
    truncated: bodyClipped || dropped,
    omittedComments: clippedComments.length - kept.length,
  };
}
