# Tasks

Ordered, commit-sized checklist for v1. Check an item when that chunk is committed on `main`.

## Monorepo setup

- [ ] Add this checklist
- [ ] Ignore dependencies, build output, env files, and release zips
- [ ] Declare the pnpm workspace (`apps/*`, `packages/*`)
- [ ] Add root scripts for typecheck, test, build, and packaging
- [ ] Add the shared TypeScript config
- [ ] Pin pnpm install behavior in `.npmrc`
- [ ] Scaffold `packages/core` package metadata and TypeScript project
- [ ] Add the core test runner config
- [ ] Scaffold the WXT extension package
- [ ] Scaffold the Next.js web package and config
- [ ] Add the web TypeScript project
- [ ] Add a web env example that names the Reddit credentials and stores none

## packages/core

- [ ] Add shared thread, summary, and provider types
- [ ] Parse a Reddit thread URL into a canonical thread and JSON URL
- [ ] Reject profiles, feeds, and non-Reddit hosts
- [ ] Test standard, old, mobile, and `.json` thread URLs
- [ ] Test rejected URLs
- [ ] Turn an absolute or relative permalink into a reddit.com link
- [ ] Test permalink absolutizing
- [ ] Define parse errors for a malformed listing
- [ ] Decode the handful of HTML entities Reddit still emits
- [ ] Read the post from the first listing
- [ ] Flatten nested replies and keep depth
- [ ] Skip deleted bodies and `more` placeholders
- [ ] Select the top 200 comments by score
- [ ] Parse a full Reddit thread listing
- [ ] Test post extraction and nested depth
- [ ] Test the 200 comment cap and sort order
- [ ] Trim comment and post bodies to per-field caps
- [ ] Drop lowest-scored comments until the thread fits the character budget
- [ ] Test truncation of a single long comment
- [ ] Test dropping comments to meet the budget
- [ ] Render a trimmed thread as prompt text with depth markers
- [ ] Test that the prompt keeps permalinks and scores
- [ ] Define the shared summary JSON schema
- [ ] Write the system prompt that demands that schema
- [ ] Build the user prompt from a trimmed thread
- [ ] Strip markdown fences from model text
- [ ] Extract the first JSON object from surrounding prose
- [ ] Validate and normalize model JSON into a summary
- [ ] Clamp best comments to at most five and keep both sides of a disagreement
- [ ] Test fenced and prose-wrapped model output
- [ ] Test invalid JSON and missing TL;DR
- [ ] Add provider errors for a bad key, rate limit, network, and bad output
- [ ] Map HTTP statuses, including Gemini's invalid-key body, onto those errors
- [ ] Test status mapping
- [ ] List the four providers and their default models
- [ ] POST JSON and classify transport failures
- [ ] Build and parse OpenAI chat completions requests
- [ ] Build and parse Anthropic messages requests, including the browser CORS header
- [ ] Build and parse Google Gemini generateContent requests
- [ ] Build and parse OpenRouter chat completions requests
- [ ] Summarize a trimmed thread with the selected provider
- [ ] Test the OpenAI client with a mock fetch, including a bad key
- [ ] Test the Anthropic client with a mock fetch, including a rate limit
- [ ] Test the Gemini and OpenRouter clients with a mock fetch
- [ ] Test invalid model output from a successful HTTP response
- [ ] Export the core public API
- [ ] Fetch a public thread JSON document
- [ ] Exchange Reddit app-only OAuth credentials
- [ ] Fall back to OAuth when the public endpoint is blocked
- [ ] Leave a missing thread as not-found instead of hiding it behind OAuth
- [ ] Test the public fetch success path
- [ ] Test the OAuth fallback and the missing-credentials error

## Extension

- [ ] Configure the MV3 manifest, name, and host permissions
- [ ] Document why each permission and host is requested
- [ ] Open the side panel from the toolbar icon
- [ ] Load and save provider settings in `chrome.storage.local`
- [ ] Read the active tab URL when the host permission allows it
- [ ] Detect whether that URL is a Reddit thread
- [ ] Build the settings view for provider, model, and API key
- [ ] Fetch the open thread's `.json` from reddit.com
- [ ] Run the shared summarizer and surface provider errors
- [ ] Render TL;DR, points, agreements, and disagreements
- [ ] Render best comments with jump-to-comment links
- [ ] Show loading and error states in the panel
- [ ] Compose the side panel shell around settings and summary
- [ ] Style the side panel
- [ ] Add the side panel HTML entry and React mount
- [ ] Draw an original icon at 128, 48, 32, and 16
- [ ] Add the extension TypeScript project used for typecheck

## Web app

- [ ] Configure Next.js to compile the shared core package
- [ ] Add the document shell, metadata, and base styles
- [ ] Store provider settings in `localStorage` only
- [ ] Build the key settings dialog
- [ ] Build the thread URL form
- [ ] Render the summary sections
- [ ] Render best comments with permalinks
- [ ] Compose the home page
- [ ] Show loading and error states on the home page
- [ ] Add the server route that parses a pasted URL
- [ ] Call the public Reddit JSON endpoint from that route
- [ ] Use the OAuth fallback when Reddit blocks the public endpoint
- [ ] Map fetch failures to HTTP status codes without leaking secrets
- [ ] Add the privacy policy page
- [ ] Link the privacy page from the home page
- [ ] Call the thread route and then the provider from the browser

## Tests and checks

- [ ] Run the core unit tests and fix failures
- [ ] Run the root typecheck and fix failures
- [ ] Run the root production build and fix failures
- [ ] Confirm the extension zip command produces an archive

## README and release

- [ ] Document what the product does
- [ ] Document how the extension, web app, and core package divide the work
- [ ] Document load-unpacked install from the GitHub release zip
- [ ] Note the Chrome Web Store listing as coming soon
- [ ] Document key setup for OpenAI and Anthropic
- [ ] Document key setup for Gemini and OpenRouter
- [ ] Document local development commands
- [ ] Document the Vercel deploy with root `apps/web`
- [ ] Document the optional Reddit env vars
- [ ] Add the privacy note
- [ ] Add the live URL placeholder and the screenshot placeholder
- [ ] Add the packaging script that produces the extension zip

## Chrome Web Store listing

- [ ] Write the category and the short description
- [ ] Write the long description
- [ ] Justify every permission
- [ ] Add the privacy policy URL placeholder
- [ ] Mark the finished tasks in this file
