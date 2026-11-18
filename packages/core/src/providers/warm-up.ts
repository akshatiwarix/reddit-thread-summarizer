import type { ProviderId } from "../types";

const ORIGINS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/",
  anthropic: "https://api.anthropic.com/",
  gemini: "https://generativelanguage.googleapis.com/",
  openrouter: "https://openrouter.ai/",
};

/**
 * Open the TCP and TLS connection to the chosen provider while the Reddit thread is still downloading,
 * so the summary request does not pay for the handshake. Sends no key and no body, and ignores every failure.
 */
export function warmUpProvider(provider: ProviderId, fetchImpl: typeof fetch = fetch): void {
  void Promise.resolve()
    .then(() => fetchImpl(ORIGINS[provider], { method: "HEAD", mode: "no-cors", cache: "no-store" }))
    .catch(() => undefined);
}
