import { asRecord } from "../record";
import { absolutePermalink } from "../permalink";
import type { BestComment, Disagreement, RedditComment, SummarySide, ThreadSummary } from "../types";

export class SummaryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryParseError";
  }
}

export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced?.[1]?.trim() || trimmed;
}

export function extractJsonObject(text: string): string {
  const stripped = stripMarkdownFence(text);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new SummaryParseError("The model did not return a JSON object.");
  }
  return stripped.slice(start, end + 1);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
}

function asScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function readSides(value: unknown): SummarySide[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((side) => {
    const record = asRecord(side);
    const label = typeof record?.label === "string" ? record.label.trim() : "";
    const position = typeof record?.position === "string" ? record.position.trim() : "";
    return label && position ? [{ label, position }] : [];
  });
}

export function normalizeDisagreements(value: unknown): Disagreement[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = asRecord(item);
    const topic = typeof record?.topic === "string" ? record.topic.trim() : "";
    const sides = readSides(record?.sides);
    if (!topic || sides.length < 2) return [];
    const [first, second] = sides;
    if (!first || !second) return [];
    return [{ topic, sides: [first, second] as [SummarySide, SummarySide] }];
  });
}

function permalinkKey(permalink: string): string {
  try {
    const url = new URL(absolutePermalink(permalink));
    return url.pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Keep at most five comments. Fewer than three is accepted so a short thread still renders.
 * When `fetched` is given, keep only comments whose permalink matches a fetched comment,
 * and use that comment's own permalink so "Jump to comment" never breaks.
 */
export function normalizeBestComments(value: unknown, fetched?: readonly Pick<RedditComment, "permalink">[]): BestComment[] {
  if (!Array.isArray(value)) return [];
  const known = fetched ? new Map(fetched.map((comment) => [permalinkKey(comment.permalink), comment.permalink])) : null;
  const comments: BestComment[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const author = typeof record?.author === "string" ? record.author.trim() : "";
    const excerpt = typeof record?.excerpt === "string" ? record.excerpt.trim() : "";
    const permalink = typeof record?.permalink === "string" ? record.permalink.trim() : "";
    const score = asScore(record?.score);
    if (!author || !excerpt || !permalink || score === null) continue;
    let resolved = permalink;
    if (known) {
      const match = known.get(permalinkKey(permalink));
      if (!match) continue;
      resolved = match;
    }
    if (comments.some((comment) => comment.permalink === resolved)) continue;
    comments.push({ author, excerpt, score, permalink: resolved });
    if (comments.length === 5) break;
  }
  return comments;
}

export function normalizeSummary(value: unknown, fetched?: readonly Pick<RedditComment, "permalink">[]): ThreadSummary {
  const record = asRecord(value);
  if (!record) throw new SummaryParseError("The model JSON was not an object.");
  const tldr = typeof record.tldr === "string" ? record.tldr.trim() : "";
  if (!tldr) throw new SummaryParseError("The model JSON was missing a TL;DR.");

  return {
    tldr,
    mainPoints: stringList(record.mainPoints),
    agreements: stringList(record.agreements),
    disagreements: normalizeDisagreements(record.disagreements),
    bestComments: normalizeBestComments(record.bestComments, fetched),
  };
}

export function parseModelOutput(text: string, fetched?: readonly Pick<RedditComment, "permalink">[]): ThreadSummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch (error) {
    if (error instanceof SummaryParseError) throw error;
    throw new SummaryParseError("The model returned JSON that could not be parsed.");
  }
  return normalizeSummary(parsed, fetched);
}
