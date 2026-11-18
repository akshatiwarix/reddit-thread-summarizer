import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/summary/prompt";
import type { TrimmedThread } from "../src/types";

const thread: TrimmedThread = {
  post: {
    id: "abc123",
    title: "Title",
    author: "op",
    selftext: "Body",
    score: 7,
    subreddit: "example",
    permalink: "/r/example/comments/abc123/title/",
    url: "https://www.reddit.com/r/example/comments/abc123/title/",
    createdUtc: 1,
    numComments: 12,
    linkFlairText: "News",
    over18: false,
  },
  comments: [
    {
      id: "c1",
      author: "alice",
      body: "Worth reading",
      score: 9,
      depth: 1,
      permalink: "/r/example/comments/abc123/title/c1/",
      createdUtc: 2,
      parentId: "t3_abc123",
    },
  ],
  truncated: true,
  omittedComments: 4,
};

describe("prompt text", () => {
  it("keeps scores, depth, and permalinks", () => {
    const text = buildUserPrompt(thread);
    expect(text).toContain("Subreddit: r/example");
    expect(text).toContain("Flair: News");
    expect(text).toContain("[score=9 depth=1 author=u/alice permalink=/r/example/comments/abc123/title/c1/]");
    expect(text).toContain("Worth reading");
    expect(text).toContain("trimmed");
  });

  it("asks for the streaming markdown layout", () => {
    const system = buildSystemPrompt();
    for (const heading of ["## TL;DR", "## Main points", "## Where people agree", "## Where people split", "## Best comments"]) {
      expect(system).toContain(heading);
    }
    expect(system).toContain("up to five");
    expect(system).not.toContain("JSON");
  });
});
