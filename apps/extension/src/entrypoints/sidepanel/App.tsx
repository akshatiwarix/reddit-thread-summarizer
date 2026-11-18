import { describeError, type ProviderSettings, type ThreadSummary } from "@rts/core";
import { useEffect, useState } from "react";
import { SettingsForm } from "../../components/SettingsForm";
import { SummaryView } from "../../components/SummaryView";
import { readActiveTab, type ActiveTab } from "../../lib/active-tab";
import { fetchThreadListing, jumpToComment, summarizeListing } from "../../lib/summarize-tab";
import { loadSettings, saveSettings } from "../../lib/storage";

type Phase = "idle" | "loading" | "error" | "ready";

export function App() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<ActiveTab>({ thread: null });
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    void loadSettings().then((loaded) => {
      setSettings(loaded);
      if (!loaded.apiKey) setShowSettings(true);
    });
  }, []);

  useEffect(() => {
    let current = true;
    const refresh = () => {
      void readActiveTab().then((next) => {
        if (current) setTab(next);
      });
    };
    refresh();
    const onUpdated = (_tabId: number, changeInfo: { url?: string; status?: string }) => {
      if (changeInfo.url || changeInfo.status === "complete") refresh();
    };
    browser.tabs.onActivated.addListener(refresh);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      current = false;
      browser.tabs.onActivated.removeListener(refresh);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  async function onSummarize() {
    if (!settings?.apiKey.trim()) {
      setShowSettings(true);
      setPhase("error");
      setError("Add an API key in settings first.");
      return;
    }
    if (!tab.thread || !tab.url) {
      setPhase("error");
      setError("Open a Reddit thread, then try again. The address should look like reddit.com/r/…/comments/…");
      return;
    }

    setPhase("loading");
    setError("");
    setStatusText("Fetching the thread…");
    try {
      const listing = await fetchThreadListing(tab.url);
      setStatusText("Summarizing…");
      const result = await summarizeListing(settings, listing);
      setSummary(result);
      setTitle(listing.post.title);
      setPhase("ready");
      setShowSettings(false);
    } catch (caught) {
      setPhase("error");
      setError(describeError(caught));
    }
  }

  const threadLabel = tab.thread
    ? tab.thread.subreddit
      ? `r/${tab.thread.subreddit}`
      : "Reddit thread"
    : "No Reddit thread in the active tab";

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="mark">Reddit Thread Summarizer</p>
          <p className="sub">{threadLabel}</p>
        </div>
        <button type="button" className="ghost" onClick={() => setShowSettings((open) => !open)}>
          {showSettings ? "Close" : "Settings"}
        </button>
      </header>

      {showSettings && settings ? (
        <SettingsForm
          initial={settings}
          onSave={async (next) => {
            await saveSettings(next);
            setSettings({ ...next, apiKey: next.apiKey.trim(), model: next.model.trim() });
          }}
        />
      ) : null}

      <div className="actions">
        <button type="button" className="primary" disabled={phase === "loading"} onClick={() => void onSummarize()}>
          {phase === "loading" ? statusText : "Summarize"}
        </button>
        {settings ? (
          <p className="using">
            {settings.provider} · {settings.model}
            {settings.apiKey ? "" : " · no key yet"}
          </p>
        ) : null}
      </div>

      <div aria-live="polite">
        {phase === "error" ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {phase === "loading" ? <p className="muted">{statusText}</p> : null}
      </div>

      {summary && phase !== "loading" ? (
        <SummaryView
          title={title}
          summary={summary}
          onOpenComment={(permalink) => {
            void jumpToComment(permalink, tab.id);
          }}
        />
      ) : null}
    </div>
  );
}
