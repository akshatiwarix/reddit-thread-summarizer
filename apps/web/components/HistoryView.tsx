import { filterHistory, formatRelativeTime, MAX_HISTORY_ENTRIES, type HistoryEntry } from "@rts/core";
import { useEffect, useState } from "react";
import { history } from "../lib/history";
import { SummaryView } from "./SummaryView";

type Props = {
  onResummarize: (url: string) => void;
  resummarizeDisabled: boolean;
};

export function HistoryView({ onResummarize, resummarizeDisabled }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    try {
      setEntries(await history.list());
    } catch {
      setEntries([]);
      setError("Could not read history from this browser.");
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function change(task: () => Promise<void>) {
    setError("");
    try {
      await task();
    } catch {
      setError("Could not update history. Browser storage may be unavailable.");
    }
    await reload();
  }

  if (entries === null) return <p className="muted">Loading history…</p>;

  const opened = openId ? entries.find((entry) => entry.id === openId) : undefined;
  if (opened) {
    return (
      <div>
        <div className="row history-actions">
          <button type="button" className="ghost" onClick={() => setOpenId(null)}>
            Back to history
          </button>
          <a className="ghost button-link" href={opened.url} target="_blank" rel="noreferrer">
            Open thread
          </a>
          <button type="button" className="primary" disabled={resummarizeDisabled} onClick={() => onResummarize(opened.url)}>
            Re-summarize
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setOpenId(null);
              void change(() => history.remove(opened.id));
            }}
          >
            Delete
          </button>
        </div>
        <p className="using">
          Saved {formatRelativeTime(opened.createdAt)} · {opened.provider} · {opened.model}
        </p>
        <SummaryView
          title={opened.title}
          subreddit={opened.subreddit}
          permalink={opened.url}
          summary={opened.summary}
        />
      </div>
    );
  }

  const shown = filterHistory(entries, query);

  return (
    <div className="history">
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="muted empty">
          No saved summaries yet. Finished summaries are saved here, in this browser only, and nothing is sent anywhere.
        </p>
      ) : (
        <>
          <input
            type="search"
            aria-label="Search history by title"
            placeholder="Search saved summaries…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {shown.length === 0 ? (
            <p className="muted empty">No saved summaries match “{query.trim()}”.</p>
          ) : (
            <ul className="history-list">
              {shown.map((entry) => (
                <li key={entry.id}>
                  <button type="button" className="history-item" onClick={() => setOpenId(entry.id)}>
                    <span className="history-title">{entry.title}</span>
                    <span className="byline">
                      {entry.subreddit ? `r/${entry.subreddit}` : "Reddit"} · {formatRelativeTime(entry.createdAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    aria-label={`Delete ${entry.title}`}
                    onClick={() => void change(() => history.remove(entry.id))}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="row history-foot">
            {confirmClear ? (
              <>
                <span>Delete all {entries.length} saved summaries?</span>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setConfirmClear(false);
                    setOpenId(null);
                    void change(() => history.clear());
                  }}
                >
                  Yes, clear all
                </button>
                <button type="button" className="ghost" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="ghost" onClick={() => setConfirmClear(true)}>
                Clear all
              </button>
            )}
          </div>
          <p className="hint">Kept in this browser only. The newest {MAX_HISTORY_ENTRIES} are kept.</p>
        </>
      )}
    </div>
  );
}
