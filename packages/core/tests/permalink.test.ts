import { describe, expect, it } from "vitest";
import { absolutePermalink } from "../src/permalink";

describe("absolutePermalink", () => {
  it("prefixes a relative permalink", () => {
    expect(absolutePermalink("/r/foo/comments/abc/title/def/")).toBe(
      "https://www.reddit.com/r/foo/comments/abc/title/def/",
    );
  });

  it("leaves an absolute permalink alone and adds a leading slash when missing", () => {
    expect(absolutePermalink("https://old.reddit.com/r/foo/comments/abc/")).toBe("https://old.reddit.com/r/foo/comments/abc/");
    expect(absolutePermalink("r/foo/comments/abc/")).toBe("https://www.reddit.com/r/foo/comments/abc/");
  });
});
