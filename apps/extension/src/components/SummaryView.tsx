import { absolutePermalink, type ThreadSummary } from "@rts/core";

type Props = {
  title: string;
  summary: ThreadSummary;
  /** True while text is still arriving: show sections as they fill instead of "nothing found" notes. */
  streaming?: boolean;
  onOpenComment: (permalink: string) => void;
};

export function SummaryView({ title, summary, streaming = false, onOpenComment }: Props) {
  return (
    <article className="summary">
      <h2>{title}</h2>
      {summary.tldr || !streaming ? (
        <section>
          <h3>TL;DR</h3>
          <p>{summary.tldr}</p>
        </section>
      ) : null}
      <BulletSection title="Main points" items={summary.mainPoints} empty="No separate points stood out." streaming={streaming} />
      <BulletSection title="Where people agree" items={summary.agreements} empty="No broad agreement stood out." streaming={streaming} />
      {summary.disagreements.length > 0 || !streaming ? (
      <section>
        <h3>Where people split</h3>
        {summary.disagreements.length === 0 ? <p className="muted">No clear split in the comments.</p> : null}
        {summary.disagreements.map((item) => (
          <div key={item.topic} className="split">
            <h4>{item.topic}</h4>
            <ul>
              {item.sides.map((side) => (
                <li key={side.label}>
                  <strong>{side.label}.</strong> {side.position}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      ) : null}
      {summary.bestComments.length > 0 || !streaming ? (
      <section>
        <h3>Best comments</h3>
        {summary.bestComments.length === 0 ? <p className="muted">No comments were selected.</p> : null}
        <ol className="comments">
          {summary.bestComments.map((comment) => (
            <li key={`${comment.permalink}-${comment.author}`}>
              <p className="byline">
                u/{comment.author} · {comment.score.toLocaleString("en-US")}
              </p>
              <blockquote>{comment.excerpt}</blockquote>
              <a
                href={absolutePermalink(comment.permalink)}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenComment(comment.permalink);
                }}
              >
                Jump to comment
              </a>
            </li>
          ))}
        </ol>
      </section>
      ) : null}
    </article>
  );
}

function BulletSection({
  title,
  items,
  empty,
  streaming,
}: {
  title: string;
  items: string[];
  empty: string;
  streaming: boolean;
}) {
  if (streaming && items.length === 0) return null;
  return (
    <section>
      <h3>{title}</h3>
      {items.length === 0 ? <p className="muted">{empty}</p> : null}
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
