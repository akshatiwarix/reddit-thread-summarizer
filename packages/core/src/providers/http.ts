import type { ProviderId } from "../types";
import { ProviderError, errorFromResponse } from "./errors";

export async function postJson(fetchImpl: typeof fetch, provider: ProviderId, url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, signal: init.signal ?? AbortSignal.timeout(60_000) });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ProviderError(
      timedOut
        ? "The provider took too long to respond. Try again."
        : "Could not reach the provider. Check the connection and try again.",
      { kind: "network", provider },
    );
  }

  const bodyText = await response.text();
  if (!response.ok) throw errorFromResponse(provider, response.status, bodyText);

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new ProviderError("The provider returned a response that was not JSON.", {
      kind: "provider",
      provider,
      status: response.status,
    });
  }
}
