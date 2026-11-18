import {
  absolutePermalink,
  createTimer,
  fetchRedditThread,
  isShareLink,
  parseThreadUrl,
  summarizeThread,
  ThreadFetchError,
  warmUpProvider,
  type ProviderSettings,
  type ThreadSummary,
} from "@rts/core";

export type Stage = "fetching" | "summarizing" | "streaming";

export type RunCallbacks = {
  onStage: (stage: Stage) => void;
  onTitle: (title: string) => void;
  onPartial: (summary: ThreadSummary) => void;
};

export type LinkCheck = { ok: true; url: string } | { ok: false; error: string };

/** Accept any Reddit post URL the core knows how to read, including redd.it and /s/ share links. */
export function checkRedditLink(input: string): LinkCheck {
  const url = input.trim();
  if (!url) return { ok: false, error: "Paste a Reddit post link first." };
  if (isShareLink(url) || parseThreadUrl(url)) return { ok: true, url };
  return {
    ok: false,
    error: "That is not a Reddit post link. Paste one like reddit.com/r/…/comments/…, a redd.it link, or a Share link.",
  };
}

/**
 * Fetch a thread and stream its summary. Used for both the current tab and a pasted link, so the
 * URL parsing, share-link redirect and thread fetch all come from `@rts/core`.
 */
export async function summarizeRedditUrl(
  url: string,
  settings: ProviderSettings,
  signal: AbortSignal,
  callbacks: RunCallbacks,
): Promise<{ title: string; subreddit: string; url: string; summary: ThreadSummary }> {
  const timer = createTimer(import.meta.env.DEV, "extension");
  callbacks.onStage("fetching");
  // Open the connection to the model provider while Reddit is still downloading.
  warmUpProvider(settings.provider);

  let thread;
  try {
    thread = await fetchRedditThread({
      url,
      requestCredentials: "include",
      userAgent: "",
      signal,
    });
  } catch (error) {
    if (error instanceof ThreadFetchError && error.kind === "blocked") {
      throw new ThreadFetchError(
        "Reddit refused the thread request. It may be rate limiting you or the thread may be private. Wait a moment and try again.",
        "blocked",
      );
    }
    throw error;
  }
  timer(`thread fetched (${thread.comments.length} comments)`);
  callbacks.onTitle(thread.post.title);
  callbacks.onStage("summarizing");

  let first = true;
  const summary = await summarizeThread({
    thread,
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKey,
    signal,
    onUpdate: (partial) => {
      if (first) {
        first = false;
        timer("first text from model");
        callbacks.onStage("streaming");
      }
      callbacks.onPartial(partial);
    },
  });
  timer("summary complete");
  return {
    title: thread.post.title,
    subreddit: thread.post.subreddit,
    // The post's own permalink, so a redd.it or share link is saved under its real thread URL.
    url: absolutePermalink(thread.post.permalink),
    summary,
  };
}

/** A comment from the current tab's thread replaces that tab. A pasted link's comment opens in a new tab. */
export async function openComment(permalink: string, tabId: number | undefined, inNewTab: boolean): Promise<void> {
  const url = absolutePermalink(permalink);
  if (!inNewTab && tabId !== undefined) {
    await browser.tabs.update(tabId, { url, active: true });
    return;
  }
  await browser.tabs.create({ url });
}
