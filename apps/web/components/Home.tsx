"use client";

import {
  absolutePermalink,
  createTimer,
  describeError,
  summarizeThread,
  warmUpProvider,
  ThreadFetchError,
  type ParsedThread,
  type ProviderSettings,
  type ThreadSummary,
} from "@rts/core";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HistoryView } from "./HistoryView";
import { SettingsDialog } from "./SettingsDialog";
import { SummaryView } from "./SummaryView";
import { ThreadForm } from "./ThreadForm";
import { history, loadHistoryEnabled, saveHistoryEnabled } from "../lib/history";
import { loadSettings, saveSettings } from "../lib/settings";

type View = "summarize" | "history";
type Phase = "idle" | "fetching" | "summarizing" | "streaming" | "error" | "ready";

const STATUS = {
  fetching: "Fetching thread…",
  summarizing: "Summarizing…",
  streaming: "Writing summary…",
} as const;

export function Home() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>("summarize");
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [historyNotice, setHistoryNotice] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const runRef = useRef(0);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ParsedThread | null>(null);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    setHistoryEnabled(loadHistoryEnabled());
    if (!loaded.apiKey) setDialogOpen(true);
  }, []);

  async function onSubmit(url: string) {
    if (!settings?.apiKey.trim()) {
      setDialogOpen(true);
      setPhase("error");
      setError("Add an API key in settings first.");
      return;
    }

    const run = ++runRef.current;
    const live = () => runRef.current === run;
    const timer = createTimer(process.env.NODE_ENV !== "production", "web");
    setPhase("fetching");
    setError("");
    setHistoryNotice("");
    setThread(null);
    setSummary(null);
    // Open the connection to the model provider while the server fetches the thread.
    warmUpProvider(settings.provider);
    try {
      let response: Response;
      try {
        response = await fetch("/api/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } catch {
        throw new ThreadFetchError("Could not reach the server. Check the connection and try again.", "network");
      }
      let payload: { thread?: ParsedThread; error?: string };
      try {
        payload = (await response.json()) as { thread?: ParsedThread; error?: string };
      } catch {
        throw new ThreadFetchError(
          `The server sent an unexpected response (HTTP ${response.status}). It may have timed out. Try again.`,
          "network",
        );
      }
      if (!response.ok || !payload.thread) {
        throw new ThreadFetchError(payload.error || "Could not fetch that thread.", "network");
      }
      if (!live()) return;
      timer(`thread fetched (${payload.thread.comments.length} comments)`);
      setThread(payload.thread);
      setPhase("summarizing");
      let first = true;
      const next = await summarizeThread({
        thread: payload.thread,
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey,
        onUpdate: (partial) => {
          if (!live()) return;
          if (first) {
            first = false;
            timer("first text from model");
            setPhase("streaming");
          }
          setSummary(partial);
        },
      });
      if (!live()) return;
      timer("summary complete");
      setSummary(next);
      setPhase("ready");
      // Only a finished, still-current run is saved. Errors and replaced runs never reach here.
      if (historyEnabled) {
        try {
          await history.save({
            url: absolutePermalink(payload.thread.post.permalink),
            title: payload.thread.post.title,
            subreddit: payload.thread.post.subreddit,
            provider: settings.provider,
            model: settings.model,
            summary: next,
          });
        } catch {
          if (live()) {
            setHistoryNotice(
              "The summary could not be saved to history. Browser storage may be full or blocked. Delete some history and try again.",
            );
          }
        }
      }
    } catch (caught) {
      if (!live()) return;
      setSummary(null);
      setPhase("error");
      setError(describeError(caught));
    }
  }

  function onResummarize(url: string) {
    setView("summarize");
    void onSubmit(url);
  }

  const busy = phase === "fetching" || phase === "summarizing" || phase === "streaming";

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Thirty seconds, not the whole thread</p>
          <h1>Reddit Thread Summarizer</h1>
          <p className="lede">
            Paste a thread link. Get a TL;DR, the main points, where people agree, where they split, and a few
            comments worth opening.
          </p>
        </div>
        <button type="button" className="ghost" onClick={() => setDialogOpen(true)}>
          API key
        </button>
      </header>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === "summarize"} onClick={() => setView("summarize")}>
          Summarize
        </button>
        <button type="button" role="tab" aria-selected={view === "history"} onClick={() => setView("history")}>
          History
        </button>
      </div>

      {view === "history" ? (
        <>
          {busy ? <p className="muted">{STATUS[phase]} It will appear in the Summarize tab.</p> : null}
          <HistoryView onResummarize={onResummarize} resummarizeDisabled={busy} />
        </>
      ) : null}

      {/* Kept mounted (just hidden) so a half-typed URL survives a trip to History. */}
      <div hidden={view !== "summarize"}>
        <ThreadForm busy={busy} onSubmit={(url) => void onSubmit(url)} />

        {settings ? (
          <p className="using">
            Using {settings.provider} · {settings.model}
            {settings.apiKey ? "" : " · no key yet"}
          </p>
        ) : null}

        <div aria-live="polite">
          {busy ? <p className="muted">{thread ? `${STATUS[phase]} ${thread.post.title}` : STATUS[phase]}</p> : null}
          {phase === "error" ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {summary && thread && (phase === "streaming" || phase === "ready") ? (
          <SummaryView
            title={thread.post.title}
            subreddit={thread.post.subreddit}
            permalink={thread.post.permalink}
            summary={summary}
            streaming={phase === "streaming"}
          />
        ) : null}
        {historyNotice ? (
          <p className="error" role="status">
            {historyNotice}
          </p>
        ) : null}
      </div>

      <footer className="site-footer">
        <Link href="/privacy">Privacy</Link>
        <span>Keys and history stay in this browser.</span>
      </footer>

      {settings ? (
        <SettingsDialog
          open={dialogOpen}
          initial={settings}
          initialHistoryEnabled={historyEnabled}
          onClose={() => setDialogOpen(false)}
          onSave={(next, nextHistoryEnabled) => {
            saveSettings(next);
            saveHistoryEnabled(nextHistoryEnabled);
            setSettings(next);
            setHistoryEnabled(nextHistoryEnabled);
          }}
        />
      ) : null}
    </main>
  );
}
