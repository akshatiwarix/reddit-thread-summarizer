import { absolutePermalink } from "../permalink";
import type { BestComment, Disagreement, RedditComment, SummarySide, ThreadSummary } from "../types";

export class SummaryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryParseError";
  }
}

export type KnownComment = Pick<RedditComment, "permalink" | "author" | "score">;

type Section = "tldr" | "points" | "agree" | "split" | "best" | null;

const MAX_BEST_COMMENTS = 5;
const PERMALINK = /https?:\/\/[^\s)>\]]+|\/r\/[^\s)>\]]+|\/comments\/[^\s)>\]]+/i;

function sectionOf(title: string): Section {
  const t = title.toLowerCase().replace(/[^a-z0-9; ]/g, "").trim();
  if (t.startsWith("tldr") || t.startsWith("tl;dr")) return "tldr";
  if (t.startsWith("main point")) return "points";
  if (t.includes("agree")) return "agree";
  if (t.includes("split") || t.includes("disagree")) return "split";
  if (t.includes("best comment") || t.startsWith("top comment")) return "best";
  return null;
}

function plain(text: string): string {
  return text.replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim();
}

const NONE = /^none\.?$/i;

/** Key that lets `/r/a/comments/x/t/c/`, `https://old.reddit.com/r/a/comments/x/t/c?context=3` and friends match. */
export function permalinkKey(permalink: string): string {
  try {
    const url = new URL(absolutePermalink(permalink));
    return url.pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return "";
  }
}

type BestDraft = { link: string; quote: string[] };

/**
 * Parse the markdown the model streams. Safe to call on every chunk: it never throws,
 * and a half-written trailing line shows up as soon as it has text, except lines whose
 * meaning depends on being complete (permalinks), which wait for their newline.
 * Best comments are kept only when their permalink matches a fetched comment, and the
 * author and score come from that comment, never from the model.
 */
export function parseSummaryMarkdown(text: string, fetched: readonly KnownComment[], final = false): ThreadSummary {
  const known = new Map(fetched.map((comment) => [permalinkKey(comment.permalink), comment]));
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const lastIsPartial = !final && !text.endsWith("\n");

  const tldr: string[] = [];
  const mainPoints: string[] = [];
  const agreements: string[] = [];
  const topics: { topic: string; sides: SummarySide[] }[] = [];
  const drafts: BestDraft[] = [];
  let section: Section = null;

  lines.forEach((raw, index) => {
    const partial = lastIsPartial && index === lines.length - 1;
    const line = raw.trim();
    if (!line || line.startsWith("```") || /^#+$/.test(line)) return;

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      const level = heading[1].length;
      const title = heading[2];
      if (level <= 2) {
        section = sectionOf(title);
        return;
      }
      if (section === "split") topics.push({ topic: plain(title), sides: [] });
      else if (section === "best") drafts.push({ link: partial ? "" : (PERMALINK.exec(title)?.[0] ?? ""), quote: [] });
      return;
    }

    const bullet = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    const body = plain(bullet ? (bullet[1] ?? "") : line);
    if (!body || NONE.test(body)) return;

    switch (section) {
      case "tldr":
        tldr.push(body);
        break;
      case "points":
        if (bullet) mainPoints.push(body);
        break;
      case "agree":
        if (bullet) agreements.push(body);
        break;
      case "split": {
        const topic = topics[topics.length - 1];
        const colon = body.indexOf(":");
        if (!bullet || !topic || colon <= 0) break;
        const label = body.slice(0, colon).trim();
        const position = body.slice(colon + 1).trim();
        if (label && position) topic.sides.push({ label, position });
        break;
      }
      case "best": {
        const draft = drafts[drafts.length - 1];
        if (!draft) break;
        if (line.startsWith(">")) {
          draft.quote.push(plain(line.replace(/^>+\s?/, "")));
        } else if (!draft.link && !partial) {
          draft.link = PERMALINK.exec(line)?.[0] ?? "";
        }
        break;
      }
      default:
        break;
    }
  });

  const disagreements: Disagreement[] = topics.flatMap(({ topic, sides }) => {
    const [first, second] = sides;
    return topic && first && second ? [{ topic, sides: [first, second] as [SummarySide, SummarySide] }] : [];
  });

  const bestComments: BestComment[] = [];
  for (const draft of drafts) {
    const match = draft.link ? known.get(permalinkKey(draft.link)) : undefined;
    const excerpt = draft.quote.filter(Boolean).join(" ");
    if (!match || !excerpt) continue;
    if (bestComments.some((comment) => comment.permalink === match.permalink)) continue;
    bestComments.push({ author: match.author, excerpt, score: match.score, permalink: match.permalink });
    if (bestComments.length === MAX_BEST_COMMENTS) break;
  }

  const summary: ThreadSummary = {
    tldr: tldr.join(" "),
    mainPoints,
    agreements,
    disagreements,
    bestComments,
  };
  if (final && !summary.tldr) throw new SummaryParseError("The model reply was missing a TL;DR.");
  return summary;
}
