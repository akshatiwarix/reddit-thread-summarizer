# Reddit Thread Summarizer

A Chrome side panel that summarizes a Reddit thread into something you can read in about thirty seconds. You bring your own API key.

A summary has:

- a TL;DR of two or three sentences
- the main points
- where people agree
- where people split, with both sides
- up to five of the best comments, each with a link that jumps to that comment

## Features

- Chrome side panel (Manifest V3). The toolbar icon opens it.
- **Summarize this tab** on a Reddit thread, or paste any Reddit post link and click **Summarize link**. Supported: reddit.com (www, old, new, m, np), `redd.it` short links, and the `/r/<sub>/s/<id>` links from Reddit's Share button.
- Streaming progress: Fetching thread…, Summarizing…, Writing summary…, and the summary fills in as the model writes it.
- Local history: finished summaries are saved on your device, searchable, and reopen with no model call.
- Four bring-your-own-key providers: OpenAI, Anthropic, Google Gemini, and OpenRouter.

The model sees the post plus up to 120 comments, highest score first, trimmed to 40,000 characters. Nested replies are flattened and keep their depth. Output is capped at 4,096 tokens at low reasoning effort. "more comments" stubs from Reddit are not expanded.

## Install

Chrome Web Store: coming soon. The listing text and permission justifications are in [docs/store-listing.md](docs/store-listing.md).

From the GitHub release zip:

1. Download `reddit-thread-summarizer-v1.0.0.zip` from the [v1.0.0 release](https://github.com/akshatiwarix/reddit-thread-summarizer/releases/tag/v1.0.0) and unzip it. If the release is not published yet, build the zip with `pnpm package:extension` (it writes `release/reddit-thread-summarizer-v1.0.0.zip`).
2. Open `chrome://extensions` and turn on Developer mode.
3. Choose "Load unpacked" and select the unzipped folder (the one that contains `manifest.json`).
4. Open a Reddit thread, click the toolbar icon, and press Summarize.

## API keys

Open Settings in the side panel. Pick a provider and a model, and paste a key. You can type a model id that is not in the list. Defaults are suggestions and providers rename models; if a default is retired, type the current id.

| Provider | Where to create a key | Default model |
| --- | --- | --- |
| OpenAI | https://platform.openai.com/api-keys | `gpt-6-luna` |
| Anthropic | https://console.anthropic.com/settings/keys | `claude-haiku-5-5` |
| Google Gemini | https://aistudio.google.com/apikey | `gemini-3.6-flash` |
| OpenRouter | https://openrouter.ai/keys | `openai/gpt-6-luna` |

The key is stored in `chrome.storage.local` and sent only to the provider you chose. A rejected key or a rate limit is shown as its own error.

## Summary history

Finished summaries are saved in `chrome.storage.local`. History is not sent to a server, a model provider or Reddit. Partial, cancelled and failed runs are not saved.

- Open the **History** tab next to **Summarize** to read an entry again, open the thread, or re-summarize it.
- Summarizing the same thread again (any reddit.com, old.reddit.com, `redd.it` or share link for it) replaces its entry and moves it to the top.
- The newest 200 entries are kept.
- Delete one entry, or **Clear all** (with confirmation). Turn saving off with "Save finished summaries to history" in Settings; saved entries stay until you delete them.
- Clearing the extension's data or removing the extension deletes history.

## Development

Requirements: Node.js 22 or newer, and pnpm 10.

```bash
pnpm install
pnpm --filter @rts/core build
pnpm dev:extension   # starts WXT and opens Chrome with the extension loaded
pnpm test
pnpm typecheck
pnpm build           # builds core, then the extension
pnpm package:extension
```

To load the unpacked build by hand, run `pnpm build`, open `chrome://extensions`, turn on Developer mode, choose "Load unpacked", and select `apps/extension/.output/chrome-mv3`.

Layout:

```text
apps/extension   Chrome side panel (WXT, React)
packages/core    thread parsing, trimming, prompts, provider calls, history logic
```

## Privacy

No server, no account, no analytics. See [PRIVACY.md](PRIVACY.md).
