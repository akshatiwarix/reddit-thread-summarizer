import { describe, expect, it } from "vitest";
import { readSseData } from "../src/providers/stream";

function body(pieces: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
}

async function collect(pieces: string[]): Promise<string[]> {
  const out: string[] = [];
  for await (const data of readSseData(body(pieces))) out.push(data);
  return out;
}

describe("readSseData", () => {
  it("joins an event split across chunks and ignores comments and event names", async () => {
    expect(await collect([": ping\n\nevent: x\ndat", "a: {\"a\":1}\n", "\ndata: two\n\n"])).toEqual(['{"a":1}', "two"]);
  });

  it("handles CRLF separators and a last event with no blank line after it", async () => {
    expect(await collect(["data: one\r\n\r\ndata: two"])).toEqual(["one", "two"]);
  });

  it("keeps a multi-byte character split across chunks intact", async () => {
    const bytes = new TextEncoder().encode("data: héllo\n\n");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 8));
        controller.enqueue(bytes.slice(8));
        controller.close();
      },
    });
    const out: string[] = [];
    for await (const data of readSseData(stream)) out.push(data);
    expect(out).toEqual(["héllo"]);
  });
});
