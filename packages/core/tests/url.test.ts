import { describe, expect, it } from "vitest";
import { isShareLink, parseThreadUrl } from "../src/reddit/url";

const QUERY = "limit=500&raw_json=1&sort=top";

describe("parseThreadUrl", () => {
  it("accepts a standard thread and builds the JSON urls", () => {
    const ref = parseThreadUrl("https://www.reddit.com/r/Example/comments/AbC123/some_title/?utm_source=share");
    expect(ref).toMatchObject({
      subreddit: "Example",
      postId: "abc123",
      slug: "some_title",
      canonicalUrl: "https://www.reddit.com/r/Example/comments/abc123/some_title/",
      jsonUrl: `https://www.reddit.com/r/Example/comments/abc123.json?${QUERY}`,
    });
    expect(ref?.commentId).toBeUndefined();
  });

  it("accepts old, mobile, and np hosts, including a .json suffix", () => {
    expect(parseThreadUrl("https://old.reddit.com/r/foo/comments/abc123")?.jsonUrl).toContain("/r/foo/comments/abc123.json");
    expect(parseThreadUrl("http://m.reddit.com/r/foo/comments/abc123/title.json")?.postId).toBe("abc123");
    expect(parseThreadUrl("https://np.reddit.com/r/foo/comments/abc123/title/")?.subreddit).toBe("foo");
    expect(parseThreadUrl("https://new.reddit.com/r/foo/comments/abc123/title")?.postId).toBe("abc123");
  });

  it("keeps a comment permalink pointed at the whole thread", () => {
    const ref = parseThreadUrl("https://www.reddit.com/r/foo/comments/abc123/title/def456/");
    expect(ref?.commentId).toBe("def456");
    expect(ref?.jsonUrl).toBe(`https://www.reddit.com/r/foo/comments/abc123.json?${QUERY}`);
  });

  it("accepts a thread URL that omits the subreddit", () => {
    const ref = parseThreadUrl("https://www.reddit.com/comments/abc123/title/");
    expect(ref?.subreddit).toBe("");
    expect(ref?.jsonUrl).toBe(`https://www.reddit.com/comments/abc123.json?${QUERY}`);
  });

  it("rejects feeds, profiles, other sites, and empty input", () => {
    expect(parseThreadUrl("https://www.reddit.com/r/foo")).toBeNull();
    expect(parseThreadUrl("https://www.reddit.com/user/foo")).toBeNull();
    expect(parseThreadUrl("https://www.reddit.com/r/foo/comments")).toBeNull();
    expect(parseThreadUrl("https://example.com/r/foo/comments/abc123/title")).toBeNull();
    expect(parseThreadUrl("https://redd.it/")).toBeNull();
    expect(parseThreadUrl("https://i.redd.it/abc123")).toBeNull();
    expect(parseThreadUrl("not a url")).toBeNull();
    expect(parseThreadUrl("   ")).toBeNull();
    expect(parseThreadUrl(`https://www.reddit.com/${"a".repeat(2000)}`)).toBeNull();
  });

  it("accepts a redd.it short link as a post", () => {
    const ref = parseThreadUrl("https://redd.it/AbC123");
    expect(ref?.postId).toBe("abc123");
    expect(ref?.jsonUrl).toBe(`https://www.reddit.com/comments/abc123.json?${QUERY}`);
  });
});

describe("pasted-link hosts", () => {
  it("accepts every supported Reddit host and redd.it, with query strings, fragments and trailing slashes", () => {
    for (const link of [
      "https://reddit.com/r/foo/comments/abc123/title/",
      "https://www.reddit.com/r/foo/comments/abc123/title/?utm_source=share&utm_medium=web3x",
      "https://old.reddit.com/r/foo/comments/abc123/title/#top",
      "https://new.reddit.com/r/foo/comments/abc123/",
      "  https://redd.it/abc123/  ",
      "http://redd.it/abc123?ref=x",
      "https://www.reddit.com/comments/abc123",
    ]) {
      expect(parseThreadUrl(link)?.postId, link).toBe("abc123");
    }
  });

  it("rejects look-alike hosts, other schemes and non-post redd.it paths", () => {
    for (const link of [
      "https://reddit.com.evil.example/r/foo/comments/abc123/title/",
      "https://evilreddit.com/r/foo/comments/abc123/title/",
      "https://redd.it.evil.example/abc123",
      "https://redd.it/abc123/extra/path",
      "ftp://www.reddit.com/r/foo/comments/abc123/title/",
      "javascript:alert(1)",
      "https://www.reddit.com/r/foo/s/AbCdEf1234",
    ]) {
      expect(parseThreadUrl(link), link).toBeNull();
    }
  });

  it("keeps the comment id of a comment permalink", () => {
    expect(parseThreadUrl("https://redd.it/abc123")?.commentId).toBeUndefined();
    expect(parseThreadUrl("https://old.reddit.com/r/foo/comments/abc123/title/def456/?context=3")?.commentId).toBe("def456");
  });
});

describe("isShareLink", () => {
  it("detects /r/<sub>/s/<id> share links only", () => {
    expect(isShareLink("https://www.reddit.com/r/example/s/AbCdEf1234")).toBe(true);
    expect(isShareLink("https://reddit.com/r/example/s/AbCdEf1234/?utm_source=share")).toBe(true);
    expect(isShareLink("https://www.reddit.com/r/example/comments/abc123/title/")).toBe(false);
    expect(isShareLink("https://example.com/r/example/s/AbCdEf1234")).toBe(false);
    expect(isShareLink("https://old.reddit.com/r/example/s/AbCdEf1234")).toBe(true);
    expect(isShareLink("https://new.reddit.com/r/example/s/AbCdEf1234")).toBe(true);
    expect(isShareLink("https://redd.it/abc123")).toBe(false);
    expect(isShareLink("https://reddit.com.evil.example/r/example/s/AbCdEf1234")).toBe(false);
    expect(isShareLink("nope")).toBe(false);
  });
});
