import { parseThreadUrl, type ThreadRef } from "@rts/core";

export type ActiveTab = {
  id?: number;
  url?: string;
  thread: ThreadRef | null;
};

export async function readActiveTab(): Promise<ActiveTab> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  const url = tab?.url;
  return {
    ...(tab?.id === undefined ? {} : { id: tab.id }),
    ...(url ? { url } : {}),
    thread: url ? parseThreadUrl(url) : null,
  };
}
