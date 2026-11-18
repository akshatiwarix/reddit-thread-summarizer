export class RedditParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedditParseError";
  }
}
