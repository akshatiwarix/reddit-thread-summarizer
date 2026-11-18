import {
  absolutePermalink,
  parseThreadListing,
  parseThreadUrl,
  summarizeThread,
  ThreadFetchError,
  type ParsedThread,
  type ProviderSettings,
  type ThreadSummary,
} from "@rts/core";

export async function fetchThreadListing(pageUrl: string): Promise<ParsedThread> {
  const jsonUrl = parseThreadUrl(pageUrl)?.jsonUrl;
  if (!jsonUrl) throw new Error("Open a Reddit thread first.");

  let response: Response;
  try {
    response = await fetch(jsonUrl, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ThreadFetchError("Could not reach Reddit. Check the connection and try again.", "network");
  }

  if (response.status === 404) throw new Error("Reddit could not find that thread.");
  if (response.status === 429) throw new Error("Reddit rate limited the thread request. Wait a moment and try again.");
  if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status} for this thread.`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Reddit did not return thread JSON. The thread may be private or blocked.");
  }

  return parseThreadListing(payload);
}

export async function summarizeListing(settings: ProviderSettings, thread: ParsedThread): Promise<ThreadSummary> {
  return summarizeThread({
    thread,
    provider: settings.provider,
    model: settings.model,
    apiKey: settings.apiKey,
  });
}

export async function jumpToComment(permalink: string, tabId: number | undefined): Promise<void> {
  const url = absolutePermalink(permalink);
  if (tabId !== undefined) {
    await browser.tabs.update(tabId, { url, active: true });
    return;
  }
  await browser.tabs.create({ url });
}
