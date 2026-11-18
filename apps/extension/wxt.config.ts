import { defineConfig } from "wxt";

/**
 * Production permissions are `storage` plus the hosts below.
 * WXT adds `sidePanel` because `src/entrypoints/sidepanel` exists.
 * Development builds also add `tabs` and `scripting` for reload; those are not in the zip.
 * See PERMISSIONS.md.
 */
const REDDIT_HOSTS = [
  "https://www.reddit.com/*",
  "https://reddit.com/*",
  "https://old.reddit.com/*",
  "https://m.reddit.com/*",
  "https://np.reddit.com/*",
  "https://new.reddit.com/*",
];

const PROVIDER_HOSTS = [
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://generativelanguage.googleapis.com/*",
  "https://openrouter.ai/*",
];

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Reddit Thread Summarizer",
    description: "Summarize the Reddit thread in the current tab, or any Reddit post link you paste.",
    version: "1.0.0",
    permissions: ["storage"],
    host_permissions: [...REDDIT_HOSTS, ...PROVIDER_HOSTS],
    action: {
      default_title: "Summarize this Reddit thread",
    },
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
  },
});
