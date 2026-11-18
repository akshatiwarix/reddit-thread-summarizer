import { describe, expect, it } from "vitest";
import { parseSummaryMarkdown, permalinkKey, SummaryParseError } from "../src/summary/parse-markdown";

const fetched = [
  { permalink: "/r/example/comments/abc123/title/c1/", author: "alice", score: 8 },
  { permalink: "/r/example/comments/abc123/title/c12/", author: "bob", score: 5 },
  { permalink: "/r/example/comments/abc123/title/c3/", author: "carol", score: 3 },
];

const full = `## TL;DR
Fix it first. Then ship.

## Main points
- A bug shipped.
* It is **reproducible**.

## Where people agree
- Roll back.

## Where people split
### Rollback or patch
- **Rollback:** Safer right now.
- Patch: Faster to deliver.

## Best comments
### /r/example/comments/abc123/title/c1/
> Fix it first.
> Then ship.
### https://old.reddit.com/r/example/comments/abc123/title/c12?context=3
> Roll back now.
`;

describe("parseSummaryMarkdown", () => {
  it("reads every section of a full reply", () => {
    const summary = parseSummaryMarkdown(full, fetched, true);
    expect(summary.tldr).toBe("Fix it first. Then ship.");
    expect(summary.mainPoints).toEqual(["A bug shipped.", "It is reproducible."]);
    expect(summary.agreements).toEqual(["Roll back."]);
    expect(summary.disagreements).toEqual([
      {
        topic: "Rollback or patch",
        sides: [
          { label: "Rollback", position: "Safer right now." },
          { label: "Patch", position: "Faster to deliver." },
        ],
      },
    ]);
    expect(summary.bestComments).toEqual([
      { author: "alice", excerpt: "Fix it first. Then ship.", score: 8, permalink: fetched[0]?.permalink },
      { author: "bob", excerpt: "Roll back now.", score: 5, permalink: fetched[1]?.permalink },
    ]);
  });

  it("grows as text arrives and never throws mid-stream", () => {
    let previousTldr = 0;
    for (let end = 1; end <= full.length; end += 3) {
      const summary = parseSummaryMarkdown(full.slice(0, end), fetched);
      expect(summary.tldr.length).toBeGreaterThanOrEqual(previousTldr);
      previousTldr = summary.tldr.length;
    }
    expect(previousTldr).toBeGreaterThan(0);
  });

  it("shows a half-written TL;DR line, and a best comment only once its quote has started", () => {
    expect(parseSummaryMarkdown("## TL;DR\nFix it fi", fetched).tldr).toBe("Fix it fi");
    const heading = "## Best comments\n### /r/example/comments/abc123/title/c1/\n";
    expect(parseSummaryMarkdown(heading, fetched).bestComments).toEqual([]);
    expect(parseSummaryMarkdown(`${heading}> Hi th`, fetched).bestComments[0]?.excerpt).toBe("Hi th");
  });

  it("does not match a half-streamed permalink to a shorter comment id", () => {
    const partialHeading = "## Best comments\n### /r/example/comments/abc123/title/c1";
    expect(parseSummaryMarkdown(partialHeading, fetched).bestComments).toEqual([]);
    const next = `${partialHeading}2/\n> Roll back.`;
    expect(parseSummaryMarkdown(next, fetched).bestComments[0]?.author).toBe("bob");
  });

  it("shows a disagreement only once both sides exist", () => {
    const partial = "## Where people split\n### Topic\n- One: first side\n";
    expect(parseSummaryMarkdown(partial, fetched).disagreements).toEqual([]);
    expect(parseSummaryMarkdown(`${partial}- Two: second side\n`, fetched).disagreements).toHaveLength(1);
  });

  it("tolerates a code fence, heading-level and case differences, and None.", () => {
    const text = "```markdown\n# tl;dr\nShort.\n\n## MAIN POINTS\nNone.\n\n## Where People Agree\n- Yes.\n```\n";
    const summary = parseSummaryMarkdown(text, fetched, true);
    expect(summary.tldr).toBe("Short.");
    expect(summary.mainPoints).toEqual([]);
    expect(summary.agreements).toEqual(["Yes."]);
  });

  it("throws only on the final parse, when the TL;DR is missing", () => {
    expect(parseSummaryMarkdown("I cannot do that.", fetched).tldr).toBe("");
    expect(() => parseSummaryMarkdown("I cannot do that.", fetched, true)).toThrow(SummaryParseError);
    expect(() => parseSummaryMarkdown("## TL;DR\n\n## Main points\n- x", fetched, true)).toThrow(/TL;DR/);
  });

  describe("best-comment filtering against thread permalinks", () => {
    const comments = (body: string) => parseSummaryMarkdown(`## TL;DR\nx\n\n## Best comments\n${body}\n`, fetched, true).bestComments;

    it("matches absolute, old.reddit, redd.it-resolved and query-string permalinks to the fetched one", () => {
      for (const link of [
        "/r/example/comments/abc123/title/c3/",
        "https://www.reddit.com/r/example/comments/abc123/title/c3/",
        "https://old.reddit.com/r/example/comments/abc123/title/c3",
        "https://new.reddit.com/r/example/comments/abc123/title/c3/?utm_source=share&context=3",
        "/R/Example/comments/ABC123/title/C3/",
        "<https://www.reddit.com/r/example/comments/abc123/title/c3/>",
        "[link](/r/example/comments/abc123/title/c3/)",
      ]) {
        const [first] = comments(`### ${link}\n> Quote`);
        expect(first?.permalink, link).toBe("/r/example/comments/abc123/title/c3/");
        expect(first?.author).toBe("carol");
      }
    });

    it("takes the permalink from a following line when the heading has none", () => {
      expect(comments("### u/carol\nPermalink: /r/example/comments/abc123/title/c3/\n> Quote")[0]?.author).toBe("carol");
    });

    it("drops permalinks that are not in the fetched thread, including a different thread's comment", () => {
      expect(comments("### /r/example/comments/abc123/title/zzz/\n> Quote")).toEqual([]);
      expect(comments("### /r/other/comments/xyz999/title/c1/\n> Quote")).toEqual([]);
    });

    it("never takes author or score from the model and drops duplicates and empty quotes", () => {
      const result = comments(
        "### /r/example/comments/abc123/title/c1/\nauthor: ghost score: 999\n> One\n### /r/example/comments/abc123/title/c1/\n> Again\n### /r/example/comments/abc123/title/c3/\n",
      );
      expect(result).toEqual([{ author: "alice", excerpt: "One", score: 8, permalink: fetched[0]?.permalink }]);
    });

    it("keeps at most five", () => {
      const many = Array.from({ length: 8 }, (_, i) => ({ permalink: `/r/e/comments/a/t/k${i}/`, author: `u${i}`, score: i }));
      const text = `## TL;DR\nx\n## Best comments\n${many.map((c) => `### ${c.permalink}\n> q`).join("\n")}\n`;
      expect(parseSummaryMarkdown(text, many, true).bestComments).toHaveLength(5);
    });
  });
});

describe("permalinkKey", () => {
  it("normalizes host, case, query and trailing slash", () => {
    expect(permalinkKey("https://old.reddit.com/r/A/comments/B/t/C/?x=1")).toBe("/r/a/comments/b/t/c");
    expect(permalinkKey("/r/a/comments/b/t/c")).toBe("/r/a/comments/b/t/c");
  });
});
