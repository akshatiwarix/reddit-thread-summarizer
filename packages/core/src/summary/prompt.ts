import type { TrimmedThread } from "../types";
import { threadToPromptText } from "../reddit/prompt-text";
import { SUMMARY_JSON_SCHEMA } from "./schema";

export function buildSystemPrompt(): string {
  return [
    "You summarize Reddit threads for a reader who has about thirty seconds.",
    "Return only a JSON object. No markdown fence and no prose before or after it.",
    "The object must match this JSON schema:",
    JSON.stringify(SUMMARY_JSON_SCHEMA),
    "Rules:",
    "- tldr is two or three sentences.",
    "- mainPoints are the distinct points the thread is about.",
    "- agreements are points commenters largely share.",
    "- Each disagreement has a topic and exactly two sides. A side has a short label and a one or two sentence position. State both sides fairly.",
    "- bestComments has up to five items chosen from the comments in the user message, ideally three or more. Copy author, score, and permalink exactly from that comment. excerpt is a short quote from that comment.",
    "- Do not invent comments, authors, scores, or permalinks.",
    "- If fewer than three comments are worth quoting, return fewer. Never pad bestComments, and never include a comment that is not in the user message.",
    "- Use empty arrays when a section has nothing to say. tldr is never empty.",
    'Example shape: {"tldr":"...","mainPoints":["..."],"agreements":["..."],"disagreements":[{"topic":"...","sides":[{"label":"...","position":"..."},{"label":"...","position":"..."}]}],"bestComments":[{"author":"...","excerpt":"...","score":1,"permalink":"/r/example/comments/abc/title/def/"}]}',
  ].join("\n");
}

export function buildUserPrompt(thread: TrimmedThread): string {
  return threadToPromptText(thread);
}
