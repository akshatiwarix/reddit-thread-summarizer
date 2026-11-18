import { describe, expect, it } from "vitest";
import { flattenComments, parseThreadListing, selectTopComments } from "../src/reddit/parse";
import { RedditParseError } from "../src/reddit/errors";
import { commentChild, listing, threadPayload } from "./fixtures";

describe("parseThreadListing", () => {
  it("reads the post and decodes entities", () => {
    const thread = parseThreadListing(
      threadPayload([], {
        title: "Cats &amp; dogs",
        selftext: "a &lt; b",
        link_flair_text: "Q&amp;A",
        over_18: true,
      }),
    );
    expect(thread.post).toMatchObject({
      id: "abc123",
      title: "Cats & dogs",
      selftext: "a < b",
      author: "op",
      score: 42,
      subreddit: "example",
      linkFlairText: "Q&A",
      over18: true,
      numComments: 3,
    });
  });

  it("flattens nested replies and keeps depth", () => {
    const thread = parseThreadListing(
      threadPayload([
        commentChild(
          { id: "top", body: "Top", score: 5, depth: 0, permalink: "/r/example/comments/abc123/t/top/" },
          listing([
            commentChild(
              { id: "child", body: "Child", score: 4, depth: 1, permalink: "/r/example/comments/abc123/t/child/" },
              listing([
                commentChild({
                  id: "grand",
                  body: "Grand",
                  score: 3,
                  depth: undefined,
                  permalink: "/r/example/comments/abc123/t/grand/",
                }),
              ]),
            ),
          ]),
        ),
      ]),
    );

    expect(thread.comments.map((comment) => [comment.id, comment.depth])).toEqual([
      ["top", 0],
      ["child", 1],
      ["grand", 2],
    ]);
  });

  it("skips deleted bodies and more placeholders, but keeps replies under a deleted comment", () => {
    const comments = flattenComments(
      listing([
        { kind: "more", data: { id: "more" } },
        commentChild(
          { id: "gone", body: "[deleted]", score: 100 },
          listing([commentChild({ id: "kept", body: "Still here", score: 2, depth: 1 })]),
        ),
        commentChild({ id: "removed", body: "[removed]", score: 50 }),
        commentChild({ id: "blank", body: "   ", score: 50 }),
      ]),
    );
    expect(comments.map((comment) => comment.id)).toEqual(["kept"]);
  });

  it("keeps the top 200 comments by score", () => {
    const comments = Array.from({ length: 210 }, (_, index) =>
      commentChild({
        id: `c${index}`,
        body: `Comment ${index}`,
        score: index,
        created_utc: index,
        permalink: `/r/example/comments/abc123/t/c${index}/`,
      }),
    );
    const thread = parseThreadListing(threadPayload(comments));
    expect(thread.comments).toHaveLength(200);
    expect(thread.comments[0]?.score).toBe(209);
    expect(thread.comments[199]?.score).toBe(10);
    expect(thread.comments.some((comment) => comment.id === "c0")).toBe(false);
  });

  it("breaks score ties by newest, then id", () => {
    const selected = selectTopComments([
      { id: "b", author: "a", body: "b", score: 5, depth: 0, permalink: "/b", createdUtc: 1, parentId: "t3_x" },
      { id: "a", author: "a", body: "a", score: 5, depth: 0, permalink: "/a", createdUtc: 2, parentId: "t3_x" },
      { id: "c", author: "a", body: "c", score: 5, depth: 0, permalink: "/c", createdUtc: 2, parentId: "t3_x" },
    ]);
    expect(selected.map((comment) => comment.id)).toEqual(["a", "c", "b"]);
  });

  it("rejects a payload that is not a thread listing", () => {
    expect(() => parseThreadListing({ message: "Forbidden" })).toThrow(RedditParseError);
    expect(() => parseThreadListing([listing([]), listing([])])).toThrow(/post/);
  });
});
