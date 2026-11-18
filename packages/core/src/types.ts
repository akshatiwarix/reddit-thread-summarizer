export type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter";

export type RedditPost = {
  id: string;
  title: string;
  author: string;
  selftext: string;
  score: number;
  subreddit: string;
  permalink: string;
  url: string;
  createdUtc: number;
  numComments: number;
  linkFlairText: string | null;
  over18: boolean;
};

export type RedditComment = {
  id: string;
  author: string;
  body: string;
  score: number;
  depth: number;
  permalink: string;
  createdUtc: number;
  parentId: string;
};

export type ParsedThread = {
  post: RedditPost;
  comments: RedditComment[];
};

export type TrimmedThread = {
  post: RedditPost;
  comments: RedditComment[];
  truncated: boolean;
  omittedComments: number;
};

export type SummarySide = {
  label: string;
  position: string;
};

export type Disagreement = {
  topic: string;
  sides: [SummarySide, SummarySide];
};

export type BestComment = {
  author: string;
  excerpt: string;
  score: number;
  permalink: string;
};

export type ThreadSummary = {
  tldr: string;
  mainPoints: string[];
  agreements: string[];
  disagreements: Disagreement[];
  bestComments: BestComment[];
};

export type ProviderSettings = {
  provider: ProviderId;
  model: string;
  apiKey: string;
};

export type ThreadRef = {
  subreddit: string;
  postId: string;
  slug?: string;
  commentId?: string;
  canonicalUrl: string;
  jsonUrl: string;
  oauthJsonUrl: string;
};
