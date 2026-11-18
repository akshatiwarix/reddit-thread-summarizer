"use client";

import {
  describeError,
  summarizeThread,
  type ParsedThread,
  type ProviderSettings,
  type ThreadSummary,
} from "@rts/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SettingsDialog } from "./SettingsDialog";
import { SummaryView } from "./SummaryView";
import { ThreadForm } from "./ThreadForm";
import { loadSettings, saveSettings } from "../lib/settings";

type Phase = "idle" | "loading" | "error" | "ready";

export function Home() {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [thread, setThread] = useState<ParsedThread | null>(null);
  const [summary, setSummary] = useState<ThreadSummary | null>(null);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    if (!loaded.apiKey) setDialogOpen(true);
  }, []);

  async function onSubmit(url: string) {
    if (!settings?.apiKey.trim()) {
      setDialogOpen(true);
      setPhase("error");
      setError("Add an API key in settings first.");
      return;
    }

    setPhase("loading");
    setError("");
    setStatusText("Fetching the thread…");
    try {
      const response = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as { thread?: ParsedThread; error?: string };
      if (!response.ok || !payload.thread) {
        throw new Error(payload.error || "Could not fetch that thread.");
      }
      setThread(payload.thread);
      setStatusText("Summarizing…");
      const next = await summarizeThread({
        thread: payload.thread,
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.apiKey,
      });
      setSummary(next);
      setPhase("ready");
    } catch (caught) {
      setPhase("error");
      setError(describeError(caught));
    }
  }

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

      <ThreadForm busy={phase === "loading"} onSubmit={(url) => void onSubmit(url)} />

      {settings ? (
        <p className="using">
          Using {settings.provider} · {settings.model}
          {settings.apiKey ? "" : " · no key yet"}
        </p>
      ) : null}

      <div aria-live="polite">
        {phase === "loading" ? <p className="muted">{statusText}</p> : null}
        {phase === "error" ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {summary && thread && phase !== "loading" ? (
        <SummaryView
          title={thread.post.title}
          subreddit={thread.post.subreddit}
          permalink={thread.post.permalink}
          summary={summary}
        />
      ) : null}

      <footer className="site-footer">
        <Link href="/privacy">Privacy</Link>
        <span>Keys stay in this browser.</span>
      </footer>

      {settings ? (
        <SettingsDialog
          open={dialogOpen}
          initial={settings}
          onClose={() => setDialogOpen(false)}
          onSave={(next) => {
            saveSettings(next);
            setSettings(next);
          }}
        />
      ) : null}
    </main>
  );
}
