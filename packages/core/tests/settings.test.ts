import { describe, expect, it } from "vitest";
import { PROVIDERS } from "../src/providers/catalog";
import { defaultSettings, modelForProvider, normalizeSettings } from "../src/providers/settings";

describe("provider settings", () => {
  it("lists four providers and defaults to OpenAI", () => {
    expect(PROVIDERS.map((provider) => provider.id)).toEqual(["openai", "anthropic", "gemini", "openrouter"]);
    expect(defaultSettings()).toEqual({ provider: "openai", model: "gpt-4o-mini", apiKey: "" });
  });

  it("normalizes stored settings and ignores junk", () => {
    expect(normalizeSettings({ provider: "gemini", model: " gemini-2.5-pro ", apiKey: "AIza-test" })).toEqual({
      provider: "gemini",
      model: "gemini-2.5-pro",
      apiKey: "AIza-test",
    });
    expect(normalizeSettings({ provider: "nope" }).provider).toBe("openai");
    expect(normalizeSettings(null).model).toBe("gpt-4o-mini");
  });

  it("resets a catalog model when the provider changes and keeps a custom one", () => {
    expect(modelForProvider("gpt-4o-mini", "openai", "anthropic")).toBe("claude-sonnet-4-5");
    expect(modelForProvider("my-fine-tune", "openai", "anthropic")).toBe("my-fine-tune");
  });
});
