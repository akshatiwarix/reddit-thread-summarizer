import { describe, expect, it } from "vitest";
import { parseModelOutput, SummaryParseError } from "../src/summary/parse-output";

const valid = {
  tldr: "People like the idea and argue about the cost.",
  mainPoints: ["The launch slipped."],
  agreements: ["The bug is real."],
  disagreements: [
    {
      topic: "Ship date",
      sides: [
        { label: "Wait", position: "Fix it first." },
        { label: "Ship", position: "The bug is minor." },
        { label: "Ignored", position: "This third side is dropped." },
      ],
    },
    { topic: "One sided", sides: [{ label: "Only", position: "Not enough." }] },
  ],
  bestComments: [
    { author: "alice", excerpt: "Fix it first.", score: "12", permalink: "/r/example/comments/abc/title/c1/" },
    { author: "bob", excerpt: "Ship it.", score: 4, permalink: "/r/example/comments/abc/title/c2/" },
    { author: "cara", excerpt: "I agree.", score: 3, permalink: "/r/example/comments/abc/title/c3/" },
    { author: "dan", excerpt: "Fourth.", score: 2, permalink: "/r/example/comments/abc/title/c4/" },
    { author: "eve", excerpt: "Fifth.", score: 1, permalink: "/r/example/comments/abc/title/c5/" },
    { author: "frank", excerpt: "Sixth is dropped.", score: 0, permalink: "/r/example/comments/abc/title/c6/" },
  ],
};

describe("parseModelOutput", () => {
  it("parses a fenced object and clamps comments and sides", () => {
    const summary = parseModelOutput("```json\n" + JSON.stringify(valid) + "\n```");
    expect(summary.tldr).toContain("cost");
    expect(summary.disagreements).toHaveLength(1);
    expect(summary.disagreements[0]?.sides.map((side) => side.label)).toEqual(["Wait", "Ship"]);
    expect(summary.bestComments).toHaveLength(5);
    expect(summary.bestComments[0]?.score).toBe(12);
    expect(summary.bestComments.some((comment) => comment.author === "frank")).toBe(false);
  });

  it("extracts JSON wrapped in prose", () => {
    const summary = parseModelOutput(`Here you go:\n${JSON.stringify({ ...valid, disagreements: [] })}\nDone.`);
    expect(summary.mainPoints).toEqual(["The launch slipped."]);
    expect(summary.disagreements).toEqual([]);
  });

  it("rejects invalid JSON and a missing TL;DR", () => {
    expect(() => parseModelOutput("no json here")).toThrow(SummaryParseError);
    expect(() => parseModelOutput("{")).toThrow(SummaryParseError);
    expect(() => parseModelOutput(JSON.stringify({ ...valid, tldr: "  " }))).toThrow(/TL;DR/);
  });

  it("drops best comments that are missing a permalink", () => {
    const summary = parseModelOutput(
      JSON.stringify({
        ...valid,
        bestComments: [{ author: "alice", excerpt: "Hi", score: 1 }],
      }),
    );
    expect(summary.bestComments).toEqual([]);
  });
});
