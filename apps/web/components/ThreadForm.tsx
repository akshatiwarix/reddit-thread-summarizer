import { useState, type FormEvent } from "react";

type Props = {
  busy: boolean;
  onSubmit: (url: string) => void;
};

export function ThreadForm({ busy, onSubmit }: Props) {
  const [url, setUrl] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(url.trim());
  }

  return (
    <form className="thread-form" onSubmit={submit}>
      <label className="url-label" htmlFor="thread-url">
        Reddit thread URL
      </label>
      <div className="url-row">
        <input
          id="thread-url"
          name="url"
          type="url"
          required
          placeholder="https://www.reddit.com/r/example/comments/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Working…" : "Summarize"}
        </button>
      </div>
    </form>
  );
}
