# Reddit Thread Summarizer

Summarize a Reddit thread into something you can read in about thirty seconds. The same summary shows up in a Chrome side panel and on a small website. Both use one shared package for parsing, trimming, and the model call.

A summary has:

- a TL;DR of two or three sentences
- the main points
- where people agree
- where people split, with both sides
- three to five of the best comments, each with a link that jumps to that comment

You bring your own API key. OpenAI, Anthropic, Google Gemini, and OpenRouter are supported. The key stays in the browser.

## How it works

```text
apps/extension   Chrome side panel (Manifest V3, WXT, React)
apps/web         Next.js site, deployed on Vercel with this directory as the project root
packages/core    thread parsing, trimming, prompts, provider calls
```

On a Reddit thread, the extension fetches that thread's `.json` from reddit.com and asks the provider you picked for a JSON summary. The website asks you to paste a URL. A server route fetches the thread (and, if Reddit blocks the public endpoint, falls back to Reddit's app-only OAuth API). The browser then calls the provider directly. The key is never sent to the server.

The model sees the post plus up to 200 comments, highest score first. Nested replies are flattened and keep their depth. The text is trimmed so it fits a small model's context. "more comments" stubs from Reddit are not expanded.

## Install the extension from a GitHub release

The v1.0.0 release zip is produced in this repo and attached to the GitHub release. Until that release exists, build it locally with `pnpm package:extension`. The file is `release/reddit-thread-summarizer-v1.0.0.zip`.

1. Download `reddit-thread-summarizer-v1.0.0.zip` from the [v1.0.0 release](https://github.com/akshatiwarix/reddit-thread-summarizer/releases/tag/v1.0.0) and unzip it.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Choose "Load unpacked" and select the unzipped folder (the one that contains `manifest.json`).
5. Open a Reddit thread, click the toolbar icon, and press Summarize.

## Chrome Web Store

Coming soon. The listing text, category, and permission justifications are in [docs/store-listing.md](docs/store-listing.md). Submitting it needs the Chrome Web Store developer account.

## API keys

Open Settings in the extension, or "API key" on the website. Pick a provider, a model, and paste a key. You can type a model id that is not in the list. Defaults are suggestions and providers rename models; if a default is retired, type the current id.

| Provider | Where to create a key | Default model |
| --- | --- | --- |
| OpenAI | https://platform.openai.com/api-keys | `gpt-6-luna` |
| Anthropic | https://console.anthropic.com/settings/keys | `claude-sonnet-5-5` |
| Google Gemini | https://aistudio.google.com/apikey | `gemini-3.6-flash` |
| OpenRouter | https://openrouter.ai/keys | `openai/gpt-6-luna` |

The extension stores the key in `chrome.storage.local`. The website stores it in `localStorage` under `rts.settings.v1`. A rejected key or a rate limit is shown as its own error.

## Local development

Requirements: Node.js 22 or newer, and pnpm 10.

```bash
pnpm install
pnpm --filter @rts/core build
pnpm dev:extension   # Chrome, side panel
pnpm dev:web         # http://localhost:3000
pnpm test
pnpm typecheck
pnpm build
pnpm package:extension
```

`pnpm package:extension` writes `release/reddit-thread-summarizer-v1.0.0.zip`.

Copy `apps/web/.env.example` to `apps/web/.env.local` only if you want the Reddit OAuth fallback while developing the website. Do not commit that file.

## Deploy the website on Vercel

1. Import this GitHub repository.
2. Set the project root directory to `apps/web`.
3. Include source files outside the root directory, so `packages/core` is part of the install. pnpm workspaces need the lockfile at the repository root.
4. Framework preset: Next.js. Build command: `next build` (the default).
5. Optional environment variables, both server-side:

| Name | Required | Purpose |
| --- | --- | --- |
| `REDDIT_CLIENT_ID` | No | App-only OAuth when reddit.com blocks the public `.json` URL. |
| `REDDIT_CLIENT_SECRET` | No | Paired with the client id. Create the app at https://www.reddit.com/prefs/apps as a web app. |

Leave both unset to use the public endpoint only. If Reddit blocks Vercel and the variables are empty, the page shows that the public endpoint was blocked.

Do not put a model API key in Vercel. Users type their own key in the browser.

## Privacy

Nothing in this project collects an account, analytics, or a copy of your key. Thread text is sent only to the provider you choose, from your browser. The website's server fetches a public thread and does not store it. The policy that the Chrome Web Store asks for is `/privacy` on the deployed site.

## Placeholders

Live app: `https://YOUR-DEPLOYMENT.vercel.app` (replace this after the Vercel project is deployed).

Screenshot: not included yet. Add a capture of the side panel on a real thread before the store submission.
