import { fetchRedditThread, ThreadFetchError, threadFetchStatus } from "@rts/core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function credentialsFromEnv(): { clientId: string; clientSecret: string } | undefined {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }

  const url = body && typeof body === "object" && "url" in body ? (body as { url?: unknown }).url : undefined;
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "Paste a Reddit thread URL." }, { status: 400 });
  }

  try {
    const thread = await fetchRedditThread({ url, credentials: credentialsFromEnv() });
    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof ThreadFetchError) {
      return NextResponse.json({ error: error.message }, { status: threadFetchStatus(error) });
    }
    return NextResponse.json({ error: "Could not fetch that thread." }, { status: 502 });
  }
}
