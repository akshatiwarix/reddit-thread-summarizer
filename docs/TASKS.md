# Tasks

Ordered, commit-sized checklist for v1. Check an item when that chunk is committed on `main`. `[-]` marks a task dropped when the web app was removed; the record is kept on purpose.

## Monorepo setup

- [x] Add this checklist
- [x] Ignore dependencies, build output, env files, and release zips
- [x] Declare the pnpm workspace (`apps/*`, `packages/*`)
- [x] Add root scripts for typecheck, test, build, and packaging
- [x] Add the shared TypeScript config
- [x] Pin pnpm install behavior in `.npmrc`
- [x] Scaffold `packages/core` package metadata and TypeScript project
- [x] Add the core test runner config
- [x] Scaffold the WXT extension package
- [-] Scaffold the Next.js web package and config (dropped)
- [-] Add the web TypeScript project (dropped)
- [-] Add a web env example that names the Reddit credentials and stores none (dropped)

## packages/core

- [x] Add shared thread, summary, and provider types
- [x] Parse a Reddit thread URL into a canonical thread and JSON URL
- [x] Reject profiles, feeds, and non-Reddit hosts
- [x] Test standard, old, mobile, and `.json` thread URLs
- [x] Test rejected URLs
- [x] Turn an absolute or relative permalink into a reddit.com link
- [x] Test permalink absolutizing
- [x] Define parse errors for a malformed listing
- [x] Decode the handful of HTML entities Reddit still emits
- [x] Read the post from the first listing
- [x] Flatten nested replies and keep depth
- [x] Skip deleted bodies and `more` placeholders
- [x] Select the top 200 comments by score (now 120, see Speed and paste-a-link)
- [x] Parse a full Reddit thread listing
- [x] Test post extraction and nested depth
- [x] Test the 200 comment cap and sort order (now 120)
- [x] Trim comment and post bodies to per-field caps
- [x] Drop lowest-scored comments until the thread fits the character budget
- [x] Test truncation of a single long comment
- [x] Test dropping comments to meet the budget
- [x] Render a trimmed thread as prompt text with depth markers
- [x] Test that the prompt keeps permalinks and scores
- [x] Define the shared summary JSON schema (replaced by streaming markdown, see Speed and paste-a-link)
- [x] Write the system prompt that demands that schema (now the markdown layout)
- [x] Build the user prompt from a trimmed thread
- [x] Strip markdown fences from model text
- [x] Extract the first JSON object from surrounding prose
- [x] Validate and normalize model JSON into a summary
- [x] Clamp best comments to at most five and keep both sides of a disagreement
- [x] Test fenced and prose-wrapped model output
- [x] Test invalid JSON and missing TL;DR
- [x] Add provider errors for a bad key, rate limit, network, and bad output
- [x] Map HTTP statuses, including Gemini's invalid-key body, onto those errors
- [x] Test status mapping
- [x] List the four providers and their default models
- [x] POST JSON and classify transport failures
- [x] Build and parse OpenAI chat completions requests
- [x] Build and parse Anthropic messages requests, including the browser CORS header
- [x] Build and parse Google Gemini generateContent requests
- [x] Build and parse OpenRouter chat completions requests
- [x] Summarize a trimmed thread with the selected provider
- [x] Test the OpenAI client with a mock fetch, including a bad key
- [x] Test the Anthropic client with a mock fetch, including a rate limit
- [x] Test the Gemini and OpenRouter clients with a mock fetch
- [x] Test invalid model output from a successful HTTP response
- [x] Export the core public API
- [x] Fetch a public thread JSON document
- [-] Exchange Reddit app-only OAuth credentials (dropped)
- [-] Fall back to OAuth when the public endpoint is blocked (dropped)
- [-] Leave a missing thread as not-found instead of hiding it behind OAuth (dropped)
- [x] Test the public fetch success path
- [-] Test the OAuth fallback and the missing-credentials error (dropped)

## Extension

- [x] Configure the MV3 manifest, name, and host permissions
- [x] Document why each permission and host is requested
- [x] Open the side panel from the toolbar icon
- [x] Load and save provider settings in `chrome.storage.local`
- [x] Read the active tab URL when the host permission allows it
- [x] Detect whether that URL is a Reddit thread
- [x] Build the settings view for provider, model, and API key
- [x] Fetch the open thread's `.json` from reddit.com
- [x] Run the shared summarizer and surface provider errors
- [x] Render TL;DR, points, agreements, and disagreements
- [x] Render best comments with jump-to-comment links
- [x] Show loading and error states in the panel
- [x] Compose the side panel shell around settings and summary
- [x] Style the side panel
- [x] Add the side panel HTML entry and React mount
- [x] Draw an original icon at 128, 48, 32, and 16
- [x] Add the extension TypeScript project used for typecheck

## Speed and paste-a-link

- [x] Cap input at 120 comments and 40k characters
- [x] Default Anthropic to Haiku and verify all model IDs against official docs
- [x] Stream OpenAI, Anthropic, Gemini and OpenRouter responses over server-sent events
- [x] Replace the JSON reply with streaming markdown sections and a tolerant incremental parser
- [x] Match best comments to fetched permalinks (absolute, old.reddit, query strings) and take author and score from the thread
- [x] Cap output at 4096 tokens at low reasoning effort on every provider
- [x] Let callers pick cookie mode and abort thread fetches
- [x] Warm the provider connection while the thread downloads
- [x] Add a development-only stage timer
- [x] Test URL parsing for redd.it, share links and look-alike hosts
- [x] Test share-link redirect resolution
- [x] Test SSE parsing, partial summaries, mid-stream errors and the new caps
- [x] Extension: paste a Reddit link and summarize it, next to Summarize this tab
- [x] Extension: validate the pasted link and clear the previous summary on a new run
- [x] Extension: open a pasted link's best comments in a new tab
- [x] Extension (web half dropped): Fetching, Summarizing and Writing progress states with the summary filling in
- [x] Update PLAN, README, permissions notes and the store listing

## Web app (dropped)

The web app was removed; these tasks are kept as history and will not be done again.

- [-] Configure Next.js to compile the shared core package (dropped)
- [-] Add the document shell, metadata, and base styles (dropped)
- [-] Store provider settings in `localStorage` only (dropped)
- [-] Build the key settings dialog (dropped)
- [-] Build the thread URL form (dropped)
- [-] Render the summary sections (dropped)
- [-] Render best comments with permalinks (dropped)
- [-] Compose the home page (dropped)
- [-] Show loading and error states on the home page (dropped)
- [-] Add the server route that parses a pasted URL (dropped)
- [-] Call the public Reddit JSON endpoint from that route (dropped)
- [-] Use the OAuth fallback when Reddit blocks the public endpoint (dropped)
- [-] Map fetch failures to HTTP status codes without leaking secrets (dropped)
- [-] Add the privacy policy page (dropped)
- [-] Link the privacy page from the home page (dropped)
- [-] Call the thread route and then the provider from the browser (dropped)

## Tests and checks

- [x] Run the core unit tests and fix failures
- [x] Run the root typecheck and fix failures
- [x] Run the root production build and fix failures
- [x] Confirm the extension zip command produces an archive

## README and release

- [x] Document what the product does
- [x] Document how the extension, web app, and core package divide the work
- [x] Document load-unpacked install from the GitHub release zip
- [x] Note the Chrome Web Store listing as coming soon
- [x] Document key setup for OpenAI and Anthropic
- [x] Document key setup for Gemini and OpenRouter
- [x] Document local development commands
- [-] Document the Vercel deploy with root `apps/web` (dropped)
- [-] Document the optional Reddit env vars (dropped)
- [x] Add the privacy note
- [-] Add the live URL placeholder and the screenshot placeholder (dropped)
- [x] Add the packaging script that produces the extension zip

## Chrome Web Store listing

- [x] Write the category and the short description
- [x] Write the long description
- [x] Justify every permission
- [x] Add the privacy policy URL placeholder
- [x] Mark the finished tasks in this file

## Local summary history

- [x] Add history types, storage adapter interface and store (save, list, get, delete, clear) to `packages/core`
- [x] Dedupe by Reddit post id so every URL form of one thread is one entry
- [x] Cap at 200 entries, newest first, filter by title or subreddit
- [x] Unit-test insert, replace-and-promote, cap, delete, clear, ordering, search, www vs old, different threads
- [x] Extension: `chrome.storage.local` adapter, History tab, save on success only
- [x] Extension: open saved summary, Open thread, Re-summarize, delete one, clear all with confirm, empty states
- [-] Web: `localStorage` adapter, History tab, save on success only, quota error message (dropped)
- [-] Web: open saved summary, Open thread, Re-summarize, delete one, clear all with confirm, empty states (dropped)
- [x] History on/off toggle (default on) in both settings screens
- [x] Update README, privacy page, PERMISSIONS.md and store listing
- [x] Rebuild the unpacked extension

## Extension only

- [x] Remove the web app, its scripts and its lockfile entries
- [x] Remove the server-only Reddit OAuth fallback from `packages/core`
- [x] Rewrite CLAUDE.md, PLAN, README and the store listing for the extension only
- [x] Add a root `PRIVACY.md` and point the store listing at it
- [x] Rebuild the unpacked extension and confirm the manifest is unchanged
