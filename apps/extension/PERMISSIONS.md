# Extension permissions

The production manifest asks for as little as possible. Each entry is required for a step the side panel actually performs.

## storage

Saves the provider, model, and API key in `chrome.storage.local` on this device. The key is not sent to the extension author and is not included in the thread request to our web app. There is no web app call from the extension.

## sidePanel

Shows the summary UI in Chrome's side panel. WXT adds this permission because `src/entrypoints/sidepanel` is the UI. The toolbar icon opens that panel (`sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`). There is no popup and no content script.

## Hosts on Reddit

`https://www.reddit.com/*`, `https://reddit.com/*`, `https://old.reddit.com/*`, `https://m.reddit.com/*`, `https://np.reddit.com/*`, and `https://new.reddit.com/*`.

Pasted links use the same hosts and no new permission. A `redd.it/<id>` short link is turned into `www.reddit.com/comments/<id>` by the shared parser, so `redd.it` itself is never requested and has no host permission. A `/r/<sub>/s/<id>` share link is fetched on `www.reddit.com` (or whichever Reddit host was pasted), and Reddit's redirect lands on `www.reddit.com`, which is already covered.

Chrome only reveals a tab URL to an extension that has a host permission for that URL. Opening a best-comment link calls `tabs.create` or `tabs.update`, which need no permission. The panel reads the active tab URL to decide whether a thread is open. When you click Summarize this tab or Summarize link, the extension fetches that thread's public `.json` from `www.reddit.com`, with cookies included so the request matches the Reddit session in the tab. It does not inject a script into the page.

## Hosts on the model providers

`https://api.openai.com/*`, `https://api.anthropic.com/*`, `https://generativelanguage.googleapis.com/*`, and `https://openrouter.ai/*`.

The summary request goes from the browser straight to the provider you picked, with the key you saved. A host permission lets the extension read the response, including a 401 or 429, instead of having the browser hide it as a network error.

## Not requested

`tabs`, `history`, `scripting`, `bookmarks`, and `<all_urls>` are not in the production manifest. A development build may add `tabs` and `scripting` so WXT can reload the extension. The packaged zip is a production build and does not include them.
