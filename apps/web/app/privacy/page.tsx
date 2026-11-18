import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · Reddit Thread Summarizer",
  description: "What the Reddit Thread Summarizer extension and website do with a thread and an API key.",
};

export default function PrivacyPage() {
  return (
    <main className="page">
      <p className="eyebrow">
        <Link href="/">Reddit Thread Summarizer</Link>
      </p>
      <h1>Privacy</h1>
      <p className="lede">
        The extension and the website do not collect an account, a profile, or analytics. An API key and your summary
        history stay in your browser. This page is the privacy policy for the Chrome Web Store listing.
      </p>

      <h2>The extension</h2>
      <p>
        The side panel reads the URL of the active tab so it can tell whether a Reddit thread is open. When you click
        Summarize this tab, or Summarize link for a Reddit link you paste into the panel, it downloads that thread&apos;s JSON from reddit.com (a share link is first opened on reddit.com to find the thread it points to) and sends the text to the model provider
        you chose. That request to reddit.com includes your existing Reddit cookies, so Reddit sees it as coming from
        your logged-in browser, the same as when you open the page. The extension does not read, store, or forward
        those cookies. The provider, model name, and API key are stored with <code>chrome.storage.local</code> on your
        device. They are not sent to the author of this extension.
      </p>

      <h2>The website</h2>
      <p>
        The page at this site asks you to paste a thread URL. A server route fetches the public thread JSON so the
        browser can summarize it. If Reddit blocks that request, and the site operator has set <code>REDDIT_CLIENT_ID</code>{" "}
        and <code>REDDIT_CLIENT_SECRET</code>, the server uses Reddit&apos;s app-only API and returns the same thread.
        The server does not store the thread. Your API key is not part of that request.
      </p>
      <p>
        The key, provider, and model are stored in <code>localStorage</code> in your browser. The summary call goes
        from your browser straight to OpenAI, Anthropic, Google Gemini, or OpenRouter, depending on what you picked.
      </p>

      <h2>Summary history</h2>
      <p>
        When a summary finishes, the extension and the website can save it on your device so you can read it again:
        the thread link, title, subreddit, provider, model, time, and the summary text with its best-comment links.
        In the extension this is <code>chrome.storage.local</code>. On the website it is <code>localStorage</code> in
        your browser. History is never sent to a server, to a model provider, or to Reddit, and it is not part of any
        request. The newest 200 summaries are kept. You can delete one summary or clear everything from the History
        tab, turn saving off in settings, or remove it all by clearing site data or uninstalling the extension.
      </p>

      <h2>What is sent to a model provider</h2>
      <p>
        The post and a trimmed set of comments (title, author, score, body, permalink) are sent to the provider along
        with your key, because that provider is the one writing the summary. Their own privacy policy covers that
        request. This project does not log the key or the prompt.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>No accounts, cookies of our own, or advertising.</li>
        <li>No sale of data, because we do not collect a database of users or threads.</li>
        <li>No hosted API key. You bring your own.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Questions about this policy can go through the project issues list:{" "}
        <a href="https://github.com/akshatiwarix/reddit-thread-summarizer/issues">
          github.com/akshatiwarix/reddit-thread-summarizer/issues
        </a>
        .
      </p>
    </main>
  );
}
