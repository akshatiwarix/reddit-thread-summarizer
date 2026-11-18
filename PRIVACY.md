# Privacy policy

Reddit Thread Summarizer is a Chrome extension. This policy covers the extension only.

## What is stored, and where

- Your API key, provider and model choice, and your summary history are stored in `chrome.storage.local` on your own computer.
- History holds up to 200 finished summaries (thread link, title, subreddit, provider, model and the summary text). Saving can be turned off in Settings.
- None of this is uploaded anywhere.

## Where requests go

Requests go straight from the extension to two places:

- reddit.com, to download the thread you asked to summarize. The request carries your existing Reddit cookies, as opening the page would. The extension does not read or store them.
- The provider you picked: OpenAI, Anthropic, Google Gemini or OpenRouter. It receives the thread text and your API key for that request, and handles them under its own privacy policy.

## What does not exist

- No server run by the extension author.
- No account or sign-in.
- No analytics, tracking or telemetry.
- No copy of your key, your history or the threads you read.

## Deleting your data

Clear all history from the History tab, or delete single entries. Clearing the extension's data in Chrome, or uninstalling the extension, deletes the key, settings and history.

## Contact

Open an issue at https://github.com/akshatiwarix/reddit-thread-summarizer/issues.
