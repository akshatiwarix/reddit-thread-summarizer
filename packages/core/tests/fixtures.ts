export function listing(children: unknown[]) {
  return { kind: "Listing", data: { children } };
}

export function postChild(overrides: Record<string, unknown> = {}) {
  return {
    kind: "t3",
    data: {
      id: "abc123",
      title: "Thread title",
      author: "op",
      selftext: "Post body",
      score: 42,
      subreddit: "example",
      permalink: "/r/example/comments/abc123/thread_title/",
      url: "https://www.reddit.com/r/example/comments/abc123/thread_title/",
      created_utc: 1_700_000_000,
      num_comments: 3,
      link_flair_text: "Discussion",
      over_18: false,
      ...overrides,
    },
  };
}

export function commentChild(data: Record<string, unknown>, replies: unknown = "") {
  const merged: Record<string, unknown> = {
    id: "c1",
    author: "alice",
    body: "A comment",
    score: 1,
    depth: 0,
    permalink: "/r/example/comments/abc123/thread_title/c1/",
    created_utc: 1_700_000_100,
    parent_id: "t3_abc123",
    replies,
    ...data,
  };
  if (Object.prototype.hasOwnProperty.call(data, "depth") && data.depth === undefined) {
    delete merged.depth;
  }
  return { kind: "t1", data: merged };
}

export function threadPayload(comments: unknown[], postOverrides: Record<string, unknown> = {}) {
  return [listing([postChild(postOverrides)]), listing(comments)];
}
