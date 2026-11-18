import { describe, expect, it } from "vitest";
import { describeError } from "../src/describe-error";
import { errorFromResponse, ProviderError } from "../src/providers/errors";
import { ThreadFetchError, threadFetchStatus } from "../src/reddit/fetch-error";

describe("errorFromResponse", () => {
  it("maps unauthorized and invalid-key bodies to a bad key", () => {
    expect(errorFromResponse("openai", 401, '{"error":{"message":"Incorrect API key"}}').kind).toBe("bad_key");
    expect(errorFromResponse("anthropic", 403, "nope").kind).toBe("bad_key");
    const gemini = errorFromResponse("gemini", 400, '{"error":{"message":"API key not valid. Please pass a valid API key."}}');
    expect(gemini.kind).toBe("bad_key");
    expect(gemini.message).toContain("Google Gemini");
    expect(gemini.message).not.toContain("AIza");
  });

  it("maps 429 to a rate limit and hides secrets in other errors", () => {
    const limited = errorFromResponse("openrouter", 429, "slow down");
    expect(limited.kind).toBe("rate_limit");
    expect(limited.message).toContain("rate limit");

    const other = errorFromResponse("openai", 500, '{"error":{"message":"bad sk-secret-key"}}');
    expect(other.kind).toBe("provider");
    expect(other.message).not.toContain("sk-secret");
  });
});

describe("describeError", () => {
  it("returns the message for known errors and a fallback otherwise", () => {
    expect(describeError(new ProviderError("Rejected.", { kind: "bad_key", provider: "openai" }))).toBe("Rejected.");
    expect(describeError(new ThreadFetchError("Missing.", "not_found"))).toBe("Missing.");
    expect(describeError(new TypeError("Failed to fetch"))).toContain("Could not reach");
    expect(describeError("nope")).toBe("Something went wrong.");
  });
});

describe("threadFetchStatus", () => {
  it("uses 400, 404, and 502", () => {
    expect(threadFetchStatus(new ThreadFetchError("bad", "invalid_url"))).toBe(400);
    expect(threadFetchStatus(new ThreadFetchError("gone", "not_found"))).toBe(404);
    expect(threadFetchStatus(new ThreadFetchError("blocked", "blocked"))).toBe(502);
  });
});
