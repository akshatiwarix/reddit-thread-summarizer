import { describeError, type ProviderSettings, type ThreadSummary } from "@rts/core";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SettingsForm } from "../../components/SettingsForm";
import { SummaryView } from "../../components/SummaryView";
import { readActiveTab, type ActiveTab } from "../../lib/active-tab";
import { checkRedditLink, openComment, summarizeRedditUrl, type Stage } from "../../lib/summarize-link";
import { loadSettings, saveSettings } from "../../lib/storage";

type Phase = "idle" | Stage | "error" | "ready";
type Source = "tab" | "link";

const STATUS: Record<Stage, string> = {
  fetching: "Fetching thread…",
  summarizing: "Summarizing…",
  streaming: "Writing summary…",
};

export function App() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState<ActiveTab>({ thread: null });
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ThreadSummary | null>(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  // Where the summary on screen came from. A tab summary follows the tab; a link summary does not.
  const [source, setSource] = useState<Source | null>(null);

  const sourceRef = useRef<Source | null>(null);
  sourceRef.current = source;
  const runRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const runCounter = useRef(0);

  const postId = tab.thread?.postId ?? "";

  function cancelRun() {
    runRef.current?.controller.abort();
    runRef.current = null;
  }

  function clearResult() {
    setSummary(null);
    setTitle("");
    setError("");
    setPhase("idle");
    setSource(null);
  }

  // A tab summary belongs to one thread. Drop it, and stop any run for it, when the active thread changes.
  useEffect(() => {
    if (sourceRef.current === "link") return;
    cancelRun();
    clearResult();
  }, [postId]);

  useEffect(() => () => cancelRun(), []);

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

  async function run(kind: Source, url: string) {
    if (!settings?.apiKey.trim()) {
      setShowSettings(true);
      setPhase("error");
      setError("Add an API key in settings first.");
      return;
    }

    // Starting a run replaces whatever was on screen, whichever source it came from.
    cancelRun();
    const controller = new AbortController();
    const id = ++runCounter.current;
    runRef.current = { id, controller };
    const live = () => runRef.current?.id === id;

    setSource(kind);
    setError("");
    setSummary(null);
    setTitle("");
    setPhase("fetching");
    try {
      const result = await summarizeRedditUrl(url, settings, controller.signal, {
        onStage: (stage) => live() && setPhase(stage),
        onTitle: (next) => live() && setTitle(next),
        onPartial: (partial) => live() && setSummary(partial),
      });
      if (!live()) return;
      runRef.current = null;
      setSummary(result.summary);
      setTitle(result.title);
      setPhase("ready");
      setShowSettings(false);
    } catch (caught) {
      if (!live()) return; // replaced, cancelled, or the tab moved on
      runRef.current = null;
      setSummary(null);
      setPhase("error");
      setError(describeError(caught));
    }
  }

  function onSummarizeTab() {
    if (!tab.thread || !tab.url) {
      setSource("tab");
      setSummary(null);
      setPhase("error");
      setError("Open a Reddit thread, then try again. The address should look like reddit.com/r/…/comments/…");
      return;
    }
    void run("tab", tab.url);
  }

  function onSubmitLink(event: FormEvent) {
    event.preventDefault();
    const checked = checkRedditLink(link);
    if (!checked.ok) {
      cancelRun();
      setSource("link");
      setSummary(null);
      setTitle("");
      setPhase("error");
      setError(checked.error);
      return;
    }
    void run("link", checked.url);
  }

  const busy = phase === "fetching" || phase === "summarizing" || phase === "streaming";

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
        <button type="button" className="primary" disabled={busy} onClick={onSummarizeTab}>
          Summarize this tab
        </button>
        {busy ? (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              cancelRun();
              clearResult();
            }}
          >
            Cancel
          </button>
        ) : null}
        {settings ? (
          <p className="using">
            {settings.provider} · {settings.model}
            {settings.apiKey ? "" : " · no key yet"}
          </p>
        ) : null}
      </div>

      <form className="link-form" onSubmit={onSubmitLink}>
        <input
          type="text"
          aria-label="Reddit post link"
          placeholder="Or paste a Reddit post link…"
          value={link}
          disabled={busy}
          onChange={(event) => {
            setLink(event.target.value);
            if (phase === "error" && source === "link") setError("");
          }}
        />
        <button type="submit" disabled={busy || !link.trim()}>
          Summarize link
        </button>
      </form>

      <div aria-live="polite">
        {phase === "error" && error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? <p className="muted">{title ? `${STATUS[phase]} ${title}` : STATUS[phase]}</p> : null}
      </div>

      {summary && (phase === "streaming" || phase === "ready") ? (
        <SummaryView
          title={title}
          summary={summary}
          streaming={phase === "streaming"}
          onOpenComment={(permalink) => {
            void openComment(permalink, tab.id, source === "link");
          }}
        />
      ) : null}
    </div>
  );
}
