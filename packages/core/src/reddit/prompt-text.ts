import type { TrimmedThread } from "../types";

export function threadToPromptText(thread: TrimmedThread): string {
  const { post } = thread;
  const lines = [
    `Subreddit: r/${post.subreddit}`,
    `Title: ${post.title}`,
    `Author: u/${post.author}`,
    `Score: ${post.score}`,
    `Permalink: ${post.permalink}`,
    `Comments reported: ${post.numComments}`,
  ];

  if (post.linkFlairText) lines.push(`Flair: ${post.linkFlairText}`);

  lines.push("", "Post:", post.selftext.trim() || "(no body)", "", "Comments, highest score first. depth is the reply nesting level:");

  if (thread.comments.length === 0) {
    lines.push("(no comments)");
  }

  for (const comment of thread.comments) {
    lines.push(
      "",
      `[score=${comment.score} depth=${comment.depth} author=u/${comment.author} permalink=${comment.permalink}]`,
      comment.body,
    );
  }

  if (thread.truncated) {
    lines.push(
      "",
      "Note: the thread was trimmed to fit the model context. Some lower-scored comments were omitted and long bodies were shortened.",
    );
  }

  return lines.join("\n");
}
