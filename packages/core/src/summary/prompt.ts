import type { TrimmedThread } from "../types";
import { threadToPromptText } from "../reddit/prompt-text";

export function buildSystemPrompt(): string {
  return [
    "You summarize Reddit threads for a reader who has about thirty seconds.",
    "Reply with plain markdown in exactly this layout, in this order, and nothing before or after it:",
    "",
    "## TL;DR",
    "Two or three sentences.",
    "",
    "## Main points",
    "- One distinct point the thread is about.",
    "",
    "## Where people agree",
    "- A point commenters largely share.",
    "",
    "## Where people split",
    "### Topic of the disagreement",
    "- Short label of side one: one or two sentence position.",
    "- Short label of side two: one or two sentence position.",
    "",
    "## Best comments",
    "### /r/example/comments/abc123/title/def456/",
    "> A short quote from that comment.",
    "",
    "Rules:",
    "- Use those five `##` headings exactly. Do not add a title, a preamble, a code fence, or any other heading.",
    "- Use plain text. No bold, italics, or links inside the sections.",
    "- Give both sides of each disagreement fairly. Use one `###` topic with exactly two bullets per disagreement.",
    "- Best comments: up to five, ideally three or more, chosen from the comments in the user message. Each `###` line is that comment's permalink copied exactly as given, followed by a `>` quote line.",
    "- Do not invent comments or permalinks. If fewer than three comments are worth quoting, list fewer. Never pad the list.",
    "- If a section has nothing to say, write `None.` under its heading. The TL;DR is never empty.",
  ].join("\n");
}

export function buildUserPrompt(thread: TrimmedThread): string {
  return threadToPromptText(thread);
}
