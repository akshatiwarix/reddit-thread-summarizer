export type ThreadFetchKind = "invalid_url" | "not_found" | "blocked" | "parse" | "network";

export class ThreadFetchError extends Error {
  readonly kind: ThreadFetchKind;

  constructor(message: string, kind: ThreadFetchKind) {
    super(message);
    this.name = "ThreadFetchError";
    this.kind = kind;
  }
}

export function threadFetchStatus(error: ThreadFetchError): number {
  if (error.kind === "invalid_url") return 400;
  if (error.kind === "not_found") return 404;
  return 502;
}
