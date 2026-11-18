import { describe, expect, it } from "vitest";
import { threadToPromptText } from "../src/reddit/prompt-text";
import { trimThread } from "../src/reddit/trim";
import type { ParsedThread, RedditComment } from "../src/types";

function comment(id: string, score: number, body: string): RedditComment {
  return {
    id,
    author: "alice",
    body,
    score,
    depth: 0,
    permalink: `/r/example/comments/abc123/t/${id}/`,
    createdUtc: score,
    parentId: "t3_abc123",
  };
}

function thread(comments: RedditComment[], selftext = "Post body"): ParsedThread {
  return {
    post: {
      id: "abc123",
      title: "Title",
      author: "op",
      selftext,
      score: 1,
      subreddit: "example",
      permalink: "/r/example/comments/abc123/title/",
      url: "https://www.reddit.com/r/example/comments/abc123/title/",
      createdUtc: 1,
      numComments: comments.length,
      linkFlairText: null,
      over18: false,
    },
    comments,
  };
}

describe("trimThread", () => {
  it("shortens a long comment and marks the thread truncated", () => {
    const trimmed = trimThread(thread([comment("c1", 10, "x".repeat(50))]), { maxCommentChars: 10 });
    expect(trimmed.comments[0]?.body.endsWith("…")).toBe(true);
    expect(trimmed.comments[0]?.body.length).toBeLessThanOrEqual(10);
    expect(trimmed.truncated).toBe(true);
    expect(trimmed.omittedComments).toBe(0);
  });

  it("drops the lowest-scored comments until the prompt fits", () => {
    const source = thread([comment("high", 50, "keep me"), comment("mid", 20, "maybe"), comment("low", 1, "drop me")]);
    const intact = trimThread(source, { maxChars: 1_000_000 });
    const two = threadToPromptText({
      post: intact.post,
      comments: intact.comments.slice(0, 2),
      truncated: true,
      omittedComments: 0,
    }).length;
    const trimmed = trimThread(source, { maxChars: two - 1 });
    expect(trimmed.comments.map((item) => item.id)).toEqual(["high"]);
    expect(trimmed.omittedComments).toBe(2);
    expect(trimmed.truncated).toBe(true);
    expect(trimmed.post.title).toBe("Title");
  });

  it("keeps a short thread intact", () => {
    const trimmed = trimThread(thread([comment("c1", 3, "short")]));
    expect(trimmed.truncated).toBe(false);
    expect(trimmed.comments).toHaveLength(1);
    expect(trimmed.post.selftext).toBe("Post body");
  });

  it("still returns the post when the post alone exceeds the budget", () => {
    const trimmed = trimThread(thread([comment("c1", 3, "comment")], "p".repeat(500)), {
      maxChars: 80,
      maxPostChars: 400,
    });
    expect(trimmed.comments).toHaveLength(0);
    expect(trimmed.post.selftext.length).toBeGreaterThan(0);
    expect(trimmed.truncated).toBe(true);
    expect(trimmed.omittedComments).toBe(1);
  });
});
