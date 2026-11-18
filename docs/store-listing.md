# Chrome Web Store listing

Ready to paste. Akshat submits this from the Chrome Web Store developer account. The privacy policy URL below is a placeholder until the web app has a public Vercel URL.

## Category

Productivity

## Short description

Summarize the open Reddit thread: a TL;DR, main points, agreements, disagreements, and the best comments.

## Long description

Reddit Thread Summarizer turns the thread you are reading into a short brief.

Open a Reddit thread, click the toolbar icon, and press Summarize in the side panel. You get:

- A TL;DR of two or three sentences
- The main points
- Where commenters agree
- Where they split, with both sides
- Up to five of the strongest comments, each with a link that jumps to that comment

You bring your own API key. Choose OpenAI, Anthropic, Google Gemini, or OpenRouter, pick a model, and paste a key. The key is stored in chrome.storage.local on your device. The summary request goes from the extension straight to that provider. The extension author never receives the key.

The extension reads the thread's JSON from reddit.com. That request includes your existing Reddit cookies, the same as opening the page, so it works for threads your logged-in session can see. The extension does not read, store, or forward those cookies, and it does not post, vote, or message.

There is also a website in this project where you can paste a thread URL and see the same summary. The privacy policy is on that site.

## Permission justifications

These match the production manifest in the release zip.

| Permission or host | Why it is needed |
| --- | --- |
| storage | Save the chosen provider, model, and API key in chrome.storage.local on this device. |
| sidePanel | Show the summary UI in the Chrome side panel. The toolbar icon opens it. |
| https://www.reddit.com/*, https://reddit.com/*, https://old.reddit.com/*, https://m.reddit.com/*, https://np.reddit.com/*, https://new.reddit.com/* | Read the active tab URL when it is a Reddit page, and download that thread's `.json` when you click Summarize. The request includes your Reddit cookies, as opening the page would. |
| https://api.openai.com/* | Send the thread text and your OpenAI key directly to OpenAI, only if you choose OpenAI. |
| https://api.anthropic.com/* | Send the thread text and your Anthropic key directly to Anthropic, only if you choose Anthropic. |
| https://generativelanguage.googleapis.com/* | Send the thread text and your Gemini key directly to Google, only if you choose Gemini. |
| https://openrouter.ai/* | Send the thread text and your OpenRouter key directly to OpenRouter, only if you choose OpenRouter. |

The extension does not request `tabs`, `history`, `scripting`, `bookmarks`, or access to every website. A development build may add `tabs` and `scripting` so the extension can reload while you work on it. Those permissions are not in the packaged zip.

## Icons

The package includes an original mark at 16, 32, 48, and 128 pixels. The store icon is the 128 pixel file. Screenshots are still required at submission time and are not in this repo yet.

## Privacy policy URL

`https://YOUR-DEPLOYMENT.vercel.app/privacy`

Replace `YOUR-DEPLOYMENT` with the Vercel hostname after the web app is deployed. The page states that no account or analytics data is collected and that API keys stay in the browser.

## Single purpose

Summarize the Reddit thread in the current tab.
