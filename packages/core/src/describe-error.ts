import { ProviderError, describeCause } from "./providers/errors";
import { RedditParseError } from "./reddit/errors";
import { ThreadFetchError } from "./reddit/fetch-error";
import { SummaryParseError } from "./summary/parse-markdown";

export function describeError(error: unknown): string {
  if (
    error instanceof ProviderError ||
    error instanceof ThreadFetchError ||
    error instanceof RedditParseError ||
    error instanceof SummaryParseError
  ) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    if (error.name === "TypeError" || error.message === "Failed to fetch") {
      return `Could not reach the provider (${describeCause(error)}). Check the connection and try again.`;
    }
    return error.message;
  }
  return "Something went wrong.";
}
