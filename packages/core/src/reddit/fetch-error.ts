export type ThreadFetchKind = "invalid_url" | "not_found" | "blocked" | "parse" | "network";

export class ThreadFetchError extends Error {
  readonly kind: ThreadFetchKind;

  constructor(message: string, kind: ThreadFetchKind) {
    super(message);
    this.name = "ThreadFetchError";
    this.kind = kind;
  }
}
