# Reddit Thread Summarizer: Plan

Summarize any Reddit thread into something you can read in 30 seconds. Ships as a Chrome extension and a web app from this one repo.

## Decisions

- **Two surfaces, one repo.**
  - `apps/extension`: Chrome extension built with WXT + React + TypeScript (Manifest V3).
  - `apps/web`: Next.js web app deployed on Vercel.
  - `packages/core`: shared thread parsing, provider calls, prompt and summary types.
- **Extension UX.** On a Reddit thread page, open the Chrome side panel and click Summarize. The extension reads the thread's JSON from reddit.com directly (same origin as the open tab), so no server is involved.
- **Web app UX.** Paste a Reddit thread URL, get the same summary view. A Vercel server route fetches the thread JSON. If Reddit blocks Vercel's IPs, fall back to Reddit's official OAuth API (app-only), using `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` env vars.
- **AI: bring your own key.** Providers: OpenAI, Anthropic, Google Gemini, OpenRouter. The user picks a provider and model and pastes a key. The key is stored only in the user's browser (`chrome.storage.local` in the extension, `localStorage` in the web app) and requests go straight from the browser to the provider. Keys never touch our server and are never logged.
- **Summary contents.**
  1. TL;DR (2 to 3 lines)
  2. Main points
  3. Where people agree
  4. Where people split (the main disagreements, with both sides)
  5. 3 to 5 best comments, each with a link that jumps to that comment
- **Input cap.** The post plus up to the top 200 comments by score (nested replies included, flattened with depth), trimmed to fit the model's context.
- **Output format.** The model returns structured JSON that matches a shared schema in `packages/core`, which both UIs render.
- **Distribution.**
  - GitHub release `v1.0.0` with the extension zip and "load unpacked" steps in the README.
  - Chrome Web Store submission today (needs the $5 developer account, and Akshat submits).
  - Web app live on Vercel. It also hosts `/privacy`, which the Web Store requires.
- **README.** What it does, a screenshot, the live link, install steps (zip and Web Store), key setup, and local development. No challenge or day badges.
- **Models for building.** Claude Code plans with Opus 5.5 and builds with Sonnet 5.5 (`opusplan`, set in `.claude/settings.json`).
- **Git workflow.** Work directly on `main`. Commit and push after every small chunk. Aim for about 100 meaningful commits in total, never empty or fake ones.

## Out of scope for v1

Accounts, a hosted AI key, saved history, sentiment charts, follow-up chat, and browsers other than Chrome.

## Done means

- [ ] `pnpm test`, `pnpm typecheck` and `pnpm build` pass for every package
- [ ] The extension summarizes a real thread from the side panel in Chrome
- [ ] The web app summarizes a pasted thread URL on the live Vercel URL
- [ ] All four providers work with a valid key and show a clear error with a bad key
- [ ] The README is complete, the GitHub release `v1.0.0` has the zip, and the Web Store listing is ready to submit
