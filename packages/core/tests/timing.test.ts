import { describe, expect, it } from "vitest";
import { createTimer } from "../src/timing";

describe("createTimer", () => {
  it("logs stages when enabled and nothing when disabled", () => {
    const lines: string[] = [];
    createTimer(true, "run", (line) => lines.push(line))("fetch");
    createTimer(false, "run", (line) => lines.push(line))("fetch");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[rts\] run fetch \+\d+ms$/);
  });
});
