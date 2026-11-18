# Reddit Thread Summarizer: Plan

Summarize any Reddit thread into something you can read in 30 seconds. Ships as a Chrome extension and a web app from this one repo.

## Decisions

- **Two surfaces, one repo.**
  - `apps/extension`: Chrome extension built with WXT + React + TypeScript (Manifest V3).
  - `apps/web`: Next.js web app deployed on Vercel.
  - `packages/core`: shared thread parsing, provider calls, prompt and summary types.
- **Extension UX.** Two ways in, both in the side panel and both server-free. (1) On a Reddit thread page, click Summarize this tab. (2) Paste any Reddit post link into the field and click Summarize link, from any page. Supported links: reddit.com, www, old, new, m and np hosts, `redd.it/<id>` short links, and `/r/<sub>/s/<id>` share links. The extension fetches the thread's JSON from reddit.com directly and reuses the `packages/core` URL parsing, share-link redirect resolution and thread fetch. No new host permission is needed: a `redd.it` link is rewritten to `www.reddit.com/comments/<id>`, and share links redirect within `www.reddit.com`. A pasted link's best-comment links open in a new tab, not in the panel. Starting a new run (other source or other link) clears the previous summary.
- **Web app UX.** Paste a Reddit thread URL, get the same summary view. A Vercel server route fetches the thread JSON. If Reddit blocks Vercel's IPs, fall back to Reddit's official OAuth API (app-only), using `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` env vars.
- **AI: bring your own key.** Providers: OpenAI, Anthropic, Google Gemini, OpenRouter. The user picks a provider and model and pastes a key. The key is stored only in the user's browser (`chrome.storage.local` in the extension, `localStorage` in the web app) and requests go straight from the browser to the provider. Keys never touch our server and are never logged.
- **Summary contents.**
  1. TL;DR (2 to 3 lines)
  2. Main points
  3. Where people agree
  4. Where people split (the main disagreements, with both sides)
  5. 3 to 5 best comments, each with a link that jumps to that comment
- **Input cap.** The post plus up to the top 120 comments by score (nested replies included, flattened with depth), trimmed to 40,000 characters of prompt text, dropping the lowest-scored comments first. (Was 200 comments and 60,000 characters; smaller input reaches the first token sooner.)
- **Output format.** The model streams markdown with five fixed `##` sections (TL;DR, Main points, Where people agree, Where people split, Best comments). `packages/core` parses the text as it arrives and both UIs render the growing summary. Best comments are `###` permalink lines with a `>` quote; they are kept only when the permalink matches a fetched comment, and author and score come from the thread, not the model. (Was a single JSON object parsed at the end.)
- **Streaming and progress.** All four providers are called with streaming on (server-sent events), directly from the browser. Both UIs show Fetching thread…, Summarizing… (waiting for the first text) and Writing summary… (text arriving). Errors before the stream starts (bad key, rate limit) keep their own messages; an error or cutoff mid-stream discards the partial summary and shows the error.
- **Output cap and reasoning.** 4,096 output tokens on every provider (`max_completion_tokens` for OpenAI reasoning models, `max_tokens` for OpenAI chat models, OpenRouter and Anthropic, `maxOutputTokens` for Gemini), with reasoning effort set to low (`reasoning_effort` OpenAI, `output_config.effort` Anthropic Claude 4.5+, `thinkingConfig.thinkingLevel` Gemini 3+, `reasoning.effort` OpenRouter). Was 16,000 for some reasoning models.
- **Default models** (fast and cheap; verified against the official docs and OpenRouter's model list on 2026-11-18): OpenAI `gpt-6-luna`, Anthropic `claude-haiku-5-5`, Google `gemini-3.6-flash`, OpenRouter `openai/gpt-6-luna`. Other catalog models stay selectable and any model ID can be typed.
- **Dev timing.** Development builds log fetch time, time to first model text and total time to the console. Production builds log nothing.
- **Local summary history.** Both surfaces save a finished summary on the user's device. Never sent to any server, a provider or Reddit. Nothing is saved for partial, cancelled or errored runs.
  - Storage: `chrome.storage.local` in the extension (existing `storage` permission, no new permission), `localStorage` key `rts.history.v1` in the web app (~200 entries is about 1 MB of the ~5 MB quota; a failed write shows a message and keeps the existing entries).
  - Entry: id, canonical thread URL, title, subreddit, provider, model, createdAt, full parsed summary (best comments with links).
  - One entry per thread. The key is the Reddit post id, so reddit.com, www, old, m, np, new, `redd.it` and comment-permalink links with tracking params are the same thread. Re-summarizing replaces the entry and moves it to the top. Newest 200 kept, oldest dropped.
  - Shared logic (types, adapter interface, save/list/get/delete/clear, dedupe, cap, title/subreddit filter, relative time) lives in `packages/core/src/history`; each app supplies its own storage adapter. Core imports no browser API.
  - UI: a History tab next to Summarize in the side panel and on the web page. Newest first, title, subreddit, relative date, title search, open a saved summary with no model call, Open thread (new tab), Re-summarize, delete one, clear all (inline confirm), empty and no-match states.
  - Settings toggle "Save finished summaries to history", default on, stored beside the other settings (`historyEnabled` in the extension, `rts.historyEnabled.v1` on the web). Off means no new entries; existing ones stay until deleted.
- **Distribution.**
  - GitHub release `v1.0.0` with the extension zip and "load unpacked" steps in the README.
  - Chrome Web Store submission today (needs the $5 developer account, and Akshat submits).
  - Web app live on Vercel. It also hosts `/privacy`, which the Web Store requires.
- **README.** What it does, a screenshot, the live link, install steps (zip and Web Store), key setup, and local development. No challenge or day badges.
- **Models for building.** Claude Code plans with Opus 5.5 and builds with Sonnet 5.5 (`opusplan`, set in `.claude/settings.json`).
- **Git workflow.** Work directly on `main`. Commit and push after every small chunk. Aim for about 100 meaningful commits in total, never empty or fake ones.

## Open questions

- Does low reasoning effort keep summary quality acceptable on long threads? Not measured; raise `REASONING_EFFORT` in `packages/core/src/providers/limits.ts` if summaries feel shallow.
- Gemini default: `gemini-3.6-flash` (kept) or `gemini-3.8-flash`? The docs list both as stable Flash; `gemini-3.5-flash-lite` is cheaper but is Flash-Lite.
- Request shapes for streaming, `reasoning_effort`, `output_config.effort`, `thinkingLevel` and OpenRouter's `reasoning` are taken from the docs but have not been run against live keys.

- History export/import and cross-device sync are not built. Wanted?
- History stores full summaries only, not the thread text. Is a stale summary after a thread changes fine? Re-summarize is the refresh.
- Clearing browser data or uninstalling the extension deletes history; incognito/private windows may not persist web history.

## Out of scope for v1

Accounts, a hosted AI key, synced or server-side history (history is local only), sentiment charts, follow-up chat, and browsers other than Chrome.

## Done means

- [ ] `pnpm test`, `pnpm typecheck` and `pnpm build` pass for every package
- [ ] The extension summarizes a real thread from the side panel in Chrome
- [ ] The web app summarizes a pasted thread URL on the live Vercel URL
- [ ] All four providers work with a valid key and show a clear error with a bad key
- [ ] The README is complete, the GitHub release `v1.0.0` has the zip, and the Web Store listing is ready to submit
