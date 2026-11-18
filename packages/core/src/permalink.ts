/** Turn a Reddit permalink into an absolute https URL. */
export function absolutePermalink(permalink: string): string {
  const trimmed = permalink.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `https://www.reddit.com${trimmed}`;
  return `https://www.reddit.com/${trimmed}`;
}
